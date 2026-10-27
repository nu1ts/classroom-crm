/**
 * Сборка одной учебной задачи: чистый reference, testcases/1 и мутированные
 * сборки для каждого дефекта.
 *
 * Запуск:
 *   node tools/build-task.mjs --task task-01-auth-login
 *   node tools/build-task.mjs --task task-01-auth-login --verify
 *   node tools/build-task.mjs --all --verify --skip-build
 *
 * --skip-build проверяет уже собранные taskcases и не пересобирает reference.
 *
 * Конфигурации мутаций лежат в tools/task-mutations/<task>.json и не попадают
 * в папку задачи, которую получают студенты.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLEAN_REFERENCE = path.join(ROOT, 'reference');
const SRC = path.join(ROOT, 'src');
const TASKS_DIR = path.join(ROOT, 'tasks');
const CONFIG_DIR = path.join(ROOT, 'tools', 'task-mutations');
const TEMP_DIR = path.join(ROOT, '.build');
const DOCKER_IMAGE = 'auto-tests-runner:latest';
const VERIFY_MANIFEST = path.join(TEMP_DIR, 'task-verification-manifest.json');

const args = process.argv.slice(2);

function optionValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null;
}

const verify = args.includes('--verify');
const buildAll = args.includes('--all');
const skipBuild = args.includes('--skip-build');
const requestedTask = optionValue('--task');

const summary = {
  tasks: 0,
  baselineChecks: 0,
  expectedMutationFailures: 0,
  extraFailures: 0,
  failedTasks: [],
};

function fail(message) {
  console.error(`\n[build-task] ${message}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Повторяет файловую операцию, если Windows держит файл занятым:
 * антивирус и индексатор поиска открывают свеже собранный app.js
 * с memory-mapped section, и удаление/перезапись падает с EBUSY.
 */
async function withRetry(action, attempts = 8) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const message = (error && error.message) || '';
      const busy =
        error &&
        (error.code === 'EBUSY' ||
          error.code === 'EPERM' ||
          error.code === 'EACCES' ||
          /user-mapped section|being used by another process|resource busy or locked/i.test(
            message,
          ));
      if (!busy || attempt === attempts) {
        throw error;
      }
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

function buildCleanSite() {
  console.log('[build-task] Сборка чистого reference/ ...');
  execFileSync(process.execPath, ['scripts/build-site.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (!existsSync(path.join(CLEAN_REFERENCE, 'index.html'))) {
    fail('Не удалось собрать reference/index.html');
  }
}

function applyPatches(sourceDir, patches, mutationLabel) {
  for (const patch of patches) {
    const file = path.join(sourceDir, patch.file.replace(/^src\//, ''));
    if (!existsSync(file)) {
      fail(`${mutationLabel}: не найден файл ${patch.file}`);
    }
    const source = readFileSync(file, 'utf8');
    const usesCrlf = source.includes('\r\n');
    const normalizedSource = source.replace(/\r\n/g, '\n');
    const find = patch.find.replace(/\r\n/g, '\n');
    const replacement = patch.replace.replace(/\r\n/g, '\n');
    const occurrences = normalizedSource.split(find).length - 1;
    if (occurrences !== 1) {
      fail(
        `${mutationLabel}: шаблон для ${patch.file} найден ${occurrences} раз ` +
          '(ожидалось ровно 1)',
      );
    }
    const patched = normalizedSource.replace(find, replacement);
    writeFileSync(file, usesCrlf ? patched.replace(/\n/g, '\r\n') : patched);
  }
}

async function buildMutation(taskName, mutation) {
  const destination = path.join(TASKS_DIR, taskName, 'testcases', String(mutation.folder));
  await withRetry(() => {
    mkdirSync(destination, { recursive: true });
    cpSync(CLEAN_REFERENCE, destination, { recursive: true });
  });

  const tempSource = path.join(TEMP_DIR, taskName, String(mutation.folder), 'src');
  await withRetry(() => {
    rmSync(tempSource, { recursive: true, force: true });
    mkdirSync(path.dirname(tempSource), { recursive: true });
    cpSync(SRC, tempSource, { recursive: true });
  });

  applyPatches(tempSource, mutation.patches, `${taskName}/${mutation.folder} ${mutation.bug}`);

  await withRetry(() =>
    build({
      entryPoints: [path.join(tempSource, 'app.js')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      charset: 'utf8',
      minify: false,
      legalComments: 'none',
      outfile: path.join(destination, 'app.js'),
      logLevel: 'silent',
    }),
  );

  await withRetry(() =>
    rmSync(path.join(TEMP_DIR, taskName, String(mutation.folder)), {
      recursive: true,
      force: true,
    }),
  );
}

function listFiles(directory, base = directory, output = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = lstatSync(fullPath);
    if (stat.isDirectory()) {
      listFiles(fullPath, base, output);
    } else if (stat.isFile()) {
      output.push(path.relative(base, fullPath));
    }
  }
  return output.sort();
}

function hasCurrentBaseline(taskName) {
  const baseline = path.join(TASKS_DIR, taskName, 'testcases', '1');
  if (!existsSync(CLEAN_REFERENCE) || !existsSync(baseline)) return false;

  const referenceFiles = listFiles(CLEAN_REFERENCE);
  const baselineFiles = listFiles(baseline);
  if (referenceFiles.length !== baselineFiles.length) return false;

  return referenceFiles.every(
    (relativePath, index) =>
      relativePath === baselineFiles[index] &&
      readFileSync(path.join(CLEAN_REFERENCE, relativePath)).equals(
        readFileSync(path.join(baseline, relativePath)),
      ),
  );
}

function taskVerificationFingerprint() {
  const hash = createHash('sha256');
  const allTaskNames = readdirSync(CONFIG_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .sort();
  const sources = [
    SRC,
    CONFIG_DIR,
    ...allTaskNames.flatMap((taskName) => [
      path.join(TASKS_DIR, taskName, 'task.md'),
      path.join(TASKS_DIR, taskName, 'template.py'),
      path.join(TASKS_DIR, taskName, 'solution.py'),
    ]),
  ];

  for (const source of sources) {
    if (!existsSync(source)) {
      hash.update(`missing:${source}\n`);
      continue;
    }
    if (lstatSync(source).isDirectory()) {
      for (const relativePath of listFiles(source)) {
        hash.update(`${source}:${relativePath}\n`);
        hash.update(readFileSync(path.join(source, relativePath)));
      }
    } else {
      hash.update(`${source}\n`);
      hash.update(readFileSync(source));
    }
  }
  return hash.digest('hex');
}

function assertFastModeReady(taskNames) {
  const stale = taskNames.filter((taskName) => !hasCurrentBaseline(taskName));
  if (stale.length) {
    fail(
      'Быстрый режим недоступен: baseline устарел для задач:\n' +
        stale.map((taskName) => `  - ${taskName}`).join('\n') +
        '\nЗапустите npm run test:tasks без --skip-build.',
    );
  }
  if (!existsSync(VERIFY_MANIFEST)) {
    fail('Быстрый режим недоступен: нет результата полного прогона. Запустите npm run test:tasks без --skip-build.');
  }
  const manifest = JSON.parse(readFileSync(VERIFY_MANIFEST, 'utf8'));
  if (manifest.fingerprint !== taskVerificationFingerprint()) {
    fail('Быстрый режим недоступен: исходники, решения или конфигурации изменились после полного прогона. Запустите npm run test:tasks без --skip-build.');
  }
}

function saveVerificationManifest(taskNames) {
  mkdirSync(TEMP_DIR, { recursive: true });
  writeFileSync(
    VERIFY_MANIFEST,
    JSON.stringify({ fingerprint: taskVerificationFingerprint() }, null, 2),
  );
}

function loadTaskConfig(taskName) {
  const configPath = path.join(CONFIG_DIR, `${taskName}.json`);
  if (!existsSync(configPath)) {
    fail(`Нет конфигурации мутаций: ${path.relative(ROOT, configPath)}`);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config.task !== taskName) {
    fail(`В конфигурации указана задача ${config.task}, а запрошена ${taskName}`);
  }
  return config;
}

async function buildTask(taskName, config = loadTaskConfig(taskName)) {
  const taskDir = path.join(TASKS_DIR, taskName);
  const referenceDir = path.join(taskDir, 'reference');
  const testcasesDir = path.join(taskDir, 'testcases');

  console.log(`\n[build-task] ${taskName}: чистый reference`);
  await withRetry(() => {
    rmSync(referenceDir, { recursive: true, force: true });
    mkdirSync(referenceDir, { recursive: true });
    cpSync(CLEAN_REFERENCE, referenceDir, { recursive: true });
  });

  console.log(`[build-task] ${taskName}: testcases/1 (без дефектов)`);
  await withRetry(() => {
    rmSync(testcasesDir, { recursive: true, force: true });
    mkdirSync(testcasesDir, { recursive: true });
    cpSync(CLEAN_REFERENCE, path.join(testcasesDir, '1'), { recursive: true });
  });

  for (const mutation of config.mutations) {
    console.log(
      `[build-task] ${taskName}: testcases/${mutation.folder} — ${mutation.bug}`,
    );
    await buildMutation(taskName, mutation);
  }

  console.log(
    `[build-task] ${taskName}: готово, сборок ${config.mutations.length + 1}`,
  );
  return config;
}

function runDocker(taskName) {
  const taskDir = path.join(TASKS_DIR, taskName);
  const volume = `${taskDir.replace(/\\/g, '/')}:/app`;
  console.log(`\n[verify] docker run ${DOCKER_IMAGE} (${taskName}) ...`);
  execFileSync(
    'docker',
    ['run', '--rm', '-v', volume, '--shm-size=2G', DOCKER_IMAGE],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
      timeout: 15 * 60 * 1000,
    },
  );
}

function verifyTask(taskName, config) {
  const taskDir = path.join(TASKS_DIR, taskName);
  const resultsDir = path.join(taskDir, 'results');
  if (!existsSync(resultsDir)) {
    return {
      taskName,
      problems: [`отсутствует каталог results/. Запустите без --skip-build.`],
      baselineChecks: 0,
      expectedMutationFailures: 0,
      extraFailures: 0,
    };
  }
  const expectedByFolder = new Map(
    config.mutations.map((mutation) => [String(mutation.folder), mutation.expectFail]),
  );

  const problems = [];
  let checked = 0;
  let baselineChecks = 0;
  let expectedMutationFailures = 0;
  let extraFailures = 0;

  for (const entry of readdirSync(resultsDir).sort()) {
    const match = entry.match(/^results_(\d+)\.json$/);
    if (!match) continue;
    const folder = match[1];
    const result = JSON.parse(readFileSync(path.join(resultsDir, entry), 'utf8'));
    const expected = expectedByFolder.get(folder) || [];

    if (folder === '1') {
      const failed = Object.entries(result)
        .filter(([, status]) => status !== 'check')
        .map(([name]) => name);
      console.log(
        `[verify] testcases/1: ${Object.keys(result).length - failed.length}/` +
          `${Object.keys(result).length} проверок пройдено`,
      );
      baselineChecks += Object.keys(result).length - failed.length;
      if (failed.length) {
        problems.push(`testcases/1: не прошли ${failed.join(', ')}`);
      }
      checked += 1;
      continue;
    }

    const failed = Object.entries(result)
      .filter(([, status]) => status !== 'check')
      .map(([name]) => name);
    const missing = expected.filter((name) => !failed.includes(name));
    const extra = failed.filter((name) => !expected.includes(name));

    console.log(
      `[verify] testcases/${folder}: ожидаемо упали ` +
        `${expected.filter((name) => failed.includes(name)).length}/${expected.length}` +
        (extra.length ? `, дополнительно упали: ${extra.join(', ')}` : ''),
    );

    expectedMutationFailures += expected.filter((name) => failed.includes(name)).length;
    extraFailures += extra.length;
    if (missing.length) {
      problems.push(`testcases/${folder}: не упали ${missing.join(', ')}`);
    }
    checked += 1;
  }

  if (checked !== config.mutations.length + 1) {
    problems.push(
      `найдено результатов для ${checked} сборок из ${config.mutations.length + 1}`,
    );
  }

  for (const cache of ['.pytest_cache', '__pycache__']) {
    rmSync(path.join(taskDir, cache), { recursive: true, force: true });
  }

  return {
    taskName,
    problems,
    baselineChecks,
    expectedMutationFailures,
    extraFailures,
  };
}

function printSummary(taskNames, shouldSaveManifest) {
  console.log('\n[verify] ИТОГОВАЯ СВОДКА');
  console.log(`  Задач проверено: ${summary.tasks}`);
  console.log(`  Baseline-проверок пройдено: ${summary.baselineChecks}`);
  console.log(`  Ожидаемых падений мутаций: ${summary.expectedMutationFailures}`);
  console.log(`  Дополнительных падений: ${summary.extraFailures}`);
  if (summary.failedTasks.length) {
    console.error(`  Задач с ошибками: ${summary.failedTasks.length}`);
    for (const item of summary.failedTasks) {
      console.error(`    - ${item.taskName}: ${item.problems.join('; ')}`);
    }
    process.exit(1);
  }
  console.log('  Задач с ошибками: 0');
  if (shouldSaveManifest) {
    saveVerificationManifest(taskNames);
    console.log('[verify] Сохранён manifest полного прогона для быстрого режима.');
  }
  console.log('[verify] Все проверки соответствуют матрице мутаций.');
}

async function main() {
  const taskNames = buildAll
    ? readdirSync(CONFIG_DIR)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''))
        .sort()
    : [requestedTask];

  if (!taskNames[0]) {
    fail('Укажите --task <имя задачи> или --all');
  }
  if (skipBuild && !verify) {
    fail('--skip-build доступен только вместе с --verify.');
  }

  const configs = new Map();
  if (skipBuild) {
    assertFastModeReady(taskNames);
    console.log('[build-task] Быстрый режим: baseline актуален, пересборка taskcases пропущена.');
    for (const taskName of taskNames) {
      configs.set(taskName, loadTaskConfig(taskName));
    }
  } else {
    buildCleanSite();
    for (const taskName of taskNames) {
      const config = await buildTask(taskName);
      configs.set(taskName, config);
    }
  }

  if (verify) {
    for (const taskName of taskNames) {
      try {
        runDocker(taskName);
        const result = verifyTask(taskName, configs.get(taskName));
        summary.tasks += 1;
        summary.baselineChecks += result.baselineChecks;
        summary.expectedMutationFailures += result.expectedMutationFailures;
        summary.extraFailures += result.extraFailures;
        if (result.problems.length) summary.failedTasks.push(result);
      } catch (error) {
        summary.tasks += 1;
        summary.failedTasks.push({
          taskName,
          problems: [error.message || String(error)],
        });
      }
    }
    printSummary(taskNames, !skipBuild && buildAll);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
