/**
 * Полная проверка учебных задач через локальный Docker-раннер.
 *
 * Запуск:
 *   npm run test:tasks
 *   npm run test:tasks -- --skip-build
 *   npm run test:tasks -- --task task-14-journal-attendance
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER_DIR = path.join(ROOT, 'tools', 'tests-runner');
const IMAGE = 'auto-tests-runner:latest';
const args = process.argv.slice(2);

function fail(message) {
  console.error(`\n[test:tasks] ${message}`);
  process.exit(1);
}

if (!existsSync(path.join(RUNNER_DIR, 'Dockerfile'))) {
  fail('Не найден tools/tests-runner/Dockerfile.');
}

const hasAll = args.includes('--all');
const skipBuild = args.includes('--skip-build');
const taskIndex = args.indexOf('--task');
const hasTask = taskIndex !== -1 && Boolean(args[taskIndex + 1]);

if (hasAll && hasTask) {
  fail('Используйте только один режим: --all или --task <имя>.');
}

if (taskIndex !== -1 && !hasTask) {
  fail('После --task укажите имя пакета, например task-14-journal-attendance.');
}

const taskArgs = hasTask ? ['--task', args[taskIndex + 1], '--verify'] : ['--all', '--verify'];
if (skipBuild) taskArgs.push('--skip-build');

if (!skipBuild) {
  console.log(`[test:tasks] Сборка Docker-образа ${IMAGE} ...`);
  execFileSync('docker', ['build', '-t', IMAGE, '.'], {
    cwd: RUNNER_DIR,
    stdio: 'inherit',
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
} else {
  console.log(`[test:tasks] Быстрый режим: используется образ ${IMAGE} и существующие taskcases.`);
}

console.log('[test:tasks] Проверка baseline/мутаций ...');
try {
  execFileSync(process.execPath, ['tools/build-task.mjs', ...taskArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
} catch (error) {
  process.exit(error.status || 1);
}
