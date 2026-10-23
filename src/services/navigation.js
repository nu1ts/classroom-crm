/**
 * Навигация на path-роутинге.
 *
 * Адрес страницы: /students/?search=Иванов — путь задаёт маршрут, search — параметры.
 * Приложение может быть развёрнуто в любом подкаталоге (/, /reference/, testcases/…),
 * поэтому база вычисляется по текущему пути: последний сегмент пути отбрасывается,
 * если это имя известного маршрута.
 */
import { ROLE_NAVIGATION, isRouteAllowedForRole } from '../config/navigation.js';

const PUBLIC_ROUTES = ['login', 'forbidden', 'change-password'];

const routeNames = new Set(PUBLIC_ROUTES);
Object.values(ROLE_NAVIGATION).forEach((role) => {
  (role.items || []).forEach((item) => routeNames.add(item.path.replace(/^\//, '')));
  (role.allowedRoutes || []).forEach((route) => routeNames.add(route.replace(/^\//, '')));
});

export let APP_BASE = '/';

/** Вычислить базу приложения по текущему адресу. Вызывается один раз при старте. */
export function detectBase() {
  let path = window.location.pathname;
  if (path.endsWith('/index.html')) {
    path = path.slice(0, -'index.html'.length);
  } else if (!path.endsWith('/')) {
    path += '/';
  }
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && routeNames.has(last)) {
    path = path.slice(0, path.length - last.length - 1);
  }
  APP_BASE = path || '/';
  return APP_BASE;
}

/**
 * Текущий маршрут: '/students' для /<base>/students/, '/' для корня.
 * Параметры — отдельно через getRouteParams().
 */
export function currentPath() {
  let path = window.location.pathname;
  if (path.endsWith('/index.html')) {
    path = path.slice(0, -'index.html'.length);
  } else if (!path.endsWith('/')) {
    path += '/';
  }
  if (path.startsWith(APP_BASE)) {
    path = path.slice(APP_BASE.length);
  }
  if (path === '/' || path === '') return '/';
  return '/' + path.replace(/\/+$/, '');
}

/** Параметры текущего адреса (?search=…&page=2). */
export function getRouteParams() {
  return new URLSearchParams(window.location.search);
}

/** Полный URL маршрута с базой: buildUrl('/students?search=x') → '/reference/students/?search=x' */
export function buildUrl(pathWithQuery) {
  let [path, search = ''] = String(pathWithQuery || '/').split('?');
  if (!path.startsWith('/')) path = '/' + path;
  if (path !== '/' && !path.endsWith('/')) path += '/';
  return APP_BASE + (path === '/' ? '' : path.replace(/^\//, '')) + (search ? '?' + search : '');
}

/** Переход по маршруту: pushState + перерисовка (без запроса к серверу). */
export function navigate(pathWithQuery) {
  const url = buildUrl(pathWithQuery);
  if (window.location.pathname + window.location.search !== url) {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new Event('app:navigate'));
}

/** Замена адреса без записи в историю (редиректы роутера). */
export function replacePath(pathWithQuery) {
  window.history.replaceState({}, '', buildUrl(pathWithQuery));
  window.dispatchEvent(new Event('app:navigate'));
}

/** Тихая замена адреса без перерисовки (синхронизация URL после локальных фильтров). */
export function replaceUrl(pathWithQuery) {
  window.history.replaceState({}, '', buildUrl(pathWithQuery));
}

/** Ссылка на маршрут для <a href>: url строки маршрута. */
export function hrefFor(pathWithQuery) {
  return buildUrl(pathWithQuery);
}

export { isRouteAllowedForRole };
