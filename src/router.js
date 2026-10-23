/**
 * Роутер приложения
 *
 * Отвечает за навигацию и контроль доступа:
 * - Определяет активный маршрут по location.pathname (path-роутинг)
 * - Проверяет авторизацию и ролевые права (isRouteAllowedForRole)
 * - Редиректит: неавторизованных на /login, авторизованных со /login
 *   на стартовый раздел роли, при отсутствии прав — на /forbidden
 * - Перерисовывает контент (полностью или только #app-content)
 *   с учётом текущего пользователя
 *
 * Реестр маршрутов (ROUTE_HANDLERS) — в src/config/routes.js.
 */

import { getCurrentUser } from "./services/storage.js";
import {
  isRouteAllowedForRole,
  getDefaultRouteForRole,
} from "./config/navigation.js";
import {
  detectBase,
  currentPath,
  replacePath,
  navigate,
} from "./services/navigation.js";
import {
  renderLayout,
  setupLayoutListeners,
  updateSidebarActiveItem,
} from "./components/layout.js";
import { renderForbiddenView } from "./views/forbidden.js";
import { ROUTE_HANDLERS } from "./config/routes.js";

class Router {
  constructor(rootElementId = "app") {
    this.rootElementId = rootElementId;
    this.lastUserId = null;
    this.lastUserRole = null;
  }

  init() {
    detectBase();
    window.addEventListener("app:navigate", () => this.handleRoute());
    window.addEventListener("popstate", () => this.handleRoute());
    window.addEventListener("load", () => this.handleRoute());
    this.handleRoute();
  }

  navigate(pathWithQuery) {
    navigate(pathWithQuery);
  }

  handleRoute() {
    if (this._isRouting) return;
    this._isRouting = true;
    try {
      this._processRoute();
    } finally {
      this._isRouting = false;
    }
  }

  _processRoute() {
    const path = currentPath();
    const user = getCurrentUser();

    let activePath = path;

    if (!user) {
      if (path !== "/login") {
        replacePath("/login");
        activePath = "/login";
      }
    } else if (path === "/login" || path === "/") {
      const defRoute = getDefaultRouteForRole(user.role);
      replacePath(defRoute);
      activePath = defRoute;
    } else if (!isRouteAllowedForRole(user.role, path)) {
      activePath = "/forbidden";
    }

    const handler = ROUTE_HANDLERS[activePath] || {
      title: "Страница не найдена",
      render: () => renderForbiddenView(),
      setup: () => {},
    };

    document.title = `${handler.title} — Кабинет классного руководителя`;

    const contentHtml = handler.render();

    const rootEl = document.getElementById(this.rootElementId);
    if (!rootEl) return;

    const existingMainLayout = rootEl.querySelector("#main-layout");
    const isAuthRoute = activePath === "/login" || !user;
    const isSameUserAndRole =
      user && this.lastUserId === user.id && this.lastUserRole === user.role;

    if (existingMainLayout && !isAuthRoute && isSameUserAndRole) {
      const appContentContainer = rootEl.querySelector("#app-content > div");
      if (appContentContainer) {
        appContentContainer.innerHTML = contentHtml;
      }
      const appContent = rootEl.querySelector("#app-content");
      if (appContent) {
        appContent.scrollTop = 0;
      }
      updateSidebarActiveItem(activePath);

      if (handler.setup) {
        handler.setup((h) => this.navigate(h));
      }
    } else {
      this.lastUserId = user ? user.id : null;
      this.lastUserRole = user ? user.role : null;

      const fullHtml = renderLayout(user, activePath, contentHtml);
      rootEl.innerHTML = fullHtml;
      setupLayoutListeners((h) => this.navigate(h));
      if (handler.setup) {
        handler.setup((h) => this.navigate(h));
      }
    }
  }
}

export const router = new Router("app");
