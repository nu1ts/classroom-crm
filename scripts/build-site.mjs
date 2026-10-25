/**
 * Сборка самодостаточного статического сайта из src/.
 *
 * Выход: reference/
 *   app.js            — бандл всего приложения (esbuild, без внешних ссылок на ../src)
 *   styles.css        — Tailwind CSS
 *   index.html        — корневая страница (старт: вход)
 *   <route>/index.html — страница каждого маршрута (роутинг подкаталогами)
 *
 * Запуск: npm run build:site
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'reference');
const SRC = path.join(ROOT, 'src');

// --- 1. Список маршрутов из конфига навигации + служебные ---
const navSource = await readFile(path.join(SRC, 'config', 'navigation.js'), 'utf8');
const routePaths = [...new Set(
  [...navSource.matchAll(/['"]\/([a-z0-9-]+)['"]/g)].map((m) => m[1])
)].sort();

for (const extra of ['login', 'forbidden', 'change-password']) {
  if (!routePaths.includes(extra)) routePaths.push(extra);
}

// --- 2. Бандл JS ---
await build({
  entryPoints: [path.join(SRC, 'app.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  minify: false,
  legalComments: 'none',
  outfile: path.join(OUT, 'app.js'),
  logLevel: 'info',
});

// --- 3. Tailwind CSS ---
execFileSync('npx', ['tailwindcss', '-i', './src/input.css', '-o', './reference/styles.css', '--minify'], {
  cwd: ROOT, stdio: 'inherit', shell: true,
});

// --- 4. Страницы-роуты ---
const headExtras = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    .fade-in {
      animation: fadeIn 0.25s ease-in;
    }

    #modal-journal-confirm-absence,
    #modal-forgot-password,
    #modal-add-student,
    #modal-class-archive {
      margin: 0 !important;
    }

    .w-10 {
      width: 2.5rem !important;
    }
  </style>`;

function renderPage(assetPrefix) {
  return `<!DOCTYPE html>
<html lang="ru" class="h-full bg-slate-50">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Кабинет классного руководителя — Classroom CRM</title>
  <link rel="stylesheet" href="${assetPrefix}styles.css" />${headExtras}
</head>

<body class="h-full text-slate-800 antialiased">
  <div id="app" class="h-full"></div>
  <script src="${assetPrefix}app.js"></script>
</body>

</html>
`;
}

if (existsSync(OUT)) {
  const entries = await readdir(OUT);
  for (const e of entries) {
    if (e !== 'app.js' && e !== 'styles.css') {
      try { await rm(path.join(OUT, e), { recursive: true, force: true }); } catch (err) {}
    }
  }
}
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'index.html'), renderPage('./'));

let written = 0;
for (const route of routePaths) {
  const dir = path.join(OUT, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), renderPage('../'));
  written += 1;
}
