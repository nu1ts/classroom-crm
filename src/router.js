import { getCurrentUser } from './services/storage.js';
import { isRouteAllowedForRole, getDefaultRouteForRole } from './config/navigation.js';
import { renderLayout, setupLayoutListeners, updateSidebarActiveItem } from './components/layout.js?v=5';
import { renderLoginView, setupLoginListeners } from './views/login.js';
import { renderOverviewView, setupOverviewListeners } from './views/overview.js?v=2';
import { renderProfileView, setupProfileListeners } from './views/profile.js';
import { renderForbiddenView } from './views/forbidden.js';
import { renderPlaceholderView } from './views/placeholder.js';
import { renderAttendanceView, setupAttendanceListeners } from './views/attendance.js?v=2';
import { renderJournalView, setupJournalListeners } from './views/journal.js?v=10';

const ROUTE_HANDLERS = {
  '#/login': {
    title: 'Вход в систему',
    render: () => renderLoginView(),
    setup: (navigate) => setupLoginListeners((user, targetRoute) => navigate(targetRoute))
  },
  '#/overview': {
    title: 'Обзор класса',
    render: () => renderOverviewView(),
    setup: (navigate) => setupOverviewListeners(navigate)
  },
  '#/students': {
    title: 'Ученики',
    render: () => renderPlaceholderView('Ученики', 'Список учеников класса 7Б, личные карточки и успеваемость', '#/students'),
    setup: () => { }
  },
  '#/journal': {
    title: 'Журнал класса',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      const unconfirmed = params.get('unconfirmed') === 'true';
      const absences = params.get('absences') === 'true';
      const statusParam = params.get('status') || (unconfirmed ? 'unconfirmed' : (absences ? 'absences' : 'all'));
      return renderJournalView({
        subjectId: params.get('subject') || 'all',
        weekId: params.get('week') || 'all',
        filterStatus: statusParam,
        filterOnlyAbsences: statusParam === 'absences' || unconfirmed,
        filterUnconfirmedOnly: unconfirmed,
        filterOnlyEntries: params.get('onlyEntries') === 'true',
        searchQuery: params.get('search') || ''
      });
    },
    setup: (navigate) => setupJournalListeners(navigate)
  },
  '#/attendance': {
    title: 'Посещаемость',
    render: () => renderAttendanceView(),
    setup: (navigate) => setupAttendanceListeners(navigate)
  },
  '#/schedule': {
    title: 'Расписание',
    render: () => renderPlaceholderView('Расписание', 'Расписание уроков и звонков на учебную неделю', '#/schedule'),
    setup: () => { }
  },
  '#/parents': {
    title: 'Родители',
    render: () => renderPlaceholderView('Родители', 'База контактных данных родителей и законных представителей', '#/parents'),
    setup: () => { }
  },
  '#/meetings': {
    title: 'Собрания',
    render: () => renderPlaceholderView('Собрания', 'Родительские собрания, повестка, протоколы и опросы', '#/meetings'),
    setup: () => { }
  },
  '#/announcements': {
    title: 'Объявления',
    render: () => renderPlaceholderView('Объявления', 'Информационные сообщения и объявления для родителей', '#/announcements'),
    setup: () => { }
  },
  '#/analytics': {
    title: 'Аналитика',
    render: () => renderPlaceholderView('Аналитика', 'Аналитические сводки, отчёты успеваемости и зона риска', '#/analytics'),
    setup: () => { }
  },
  '#/profile': {
    title: 'Мой профиль',
    render: () => renderProfileView(),
    setup: (navigate) => setupProfileListeners(navigate)
  },
  '#/forbidden': {
    title: 'Доступ ограничен',
    render: () => renderForbiddenView(),
    setup: () => { }
  },

  '#/classes': {
    title: 'Мои классы',
    render: () => renderPlaceholderView('Мои классы', 'Классы с учебной нагрузкой учителя (7Б, 8А, 9В)', '#/classes'),
    setup: () => { }
  },

  '#/child': {
    title: 'Ребёнок',
    render: () => renderPlaceholderView('Ребёнок', 'Карточка успеваемости и посещаемости ученика (Петрова Анна)', '#/child'),
    setup: () => { }
  },

  '#/grades': {
    title: 'Оценки',
    render: () => renderPlaceholderView('Оценки', 'Текущие оценки и средний балл по четвертям', '#/grades'),
    setup: () => { }
  },

  '#/accounts': {
    title: 'Учётные записи',
    render: () => renderPlaceholderView('Учётные записи', 'Управление пользователями, ролями и блокировками', '#/accounts'),
    setup: () => { }
  },
  '#/teachers': {
    title: 'Учителя',
    render: () => renderPlaceholderView('Учителя', 'Реестр преподавателей и назначение классных руководителей', '#/teachers'),
    setup: () => { }
  },
  '#/directories': {
    title: 'Справочники',
    render: () => renderPlaceholderView('Справочники', 'Справочники предметов, кабинетов и причин отсутствия', '#/directories'),
    setup: () => { }
  },
  '#/workload': {
    title: 'Нагрузка',
    render: () => renderPlaceholderView('Нагрузка', 'Распределение учебных часов по преподавателям и классам', '#/workload'),
    setup: () => { }
  },
  '#/school-year': {
    title: 'Учебный год',
    render: () => renderPlaceholderView('Учебный год', 'Настройка учебных четвертей, каникул и праздников', '#/school-year'),
    setup: () => { }
  }
};

class Router {
  constructor(rootElementId = 'app') {
    this.rootElementId = rootElementId;
    this.lastUserId = null;
    this.lastUserRole = null;
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('pageshow', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
    this.handleRoute();
  }

  navigate(hash) {
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      this.handleRoute();
    }
  }

  handleRoute() {
    if (this._isRouting) return;
    this._isRouting = true;
    try {
      this._processRoute();
    } finally {
      setTimeout(() => {
        this._isRouting = false;
      }, 40);
    }
  }

  _processRoute() {
    const rawHash = window.location.hash || '';
    const cleanHash = rawHash.split('?')[0];
    const user = getCurrentUser();

    let activeHash = cleanHash;

    if (!user) {
      if (cleanHash !== '#/login') {
        if (window.location.hash !== '#/login') {
          window.location.replace('#/login');
        }
        activeHash = '#/login';
      }
    } else {
      if (cleanHash === '#/login' || cleanHash === '#/' || cleanHash === '') {
        const defRoute = getDefaultRouteForRole(user.role);
        if (window.location.hash !== defRoute) {
          window.location.replace(defRoute);
        }
        activeHash = defRoute;
      } else if (!isRouteAllowedForRole(user.role, cleanHash)) {
        activeHash = '#/forbidden';
      }
    }

    const handler = ROUTE_HANDLERS[activeHash] || {
      title: 'Страница не найдена',
      render: () => renderForbiddenView(),
      setup: () => { }
    };

    document.title = `${handler.title} — Кабинет классного руководителя`;

    const contentHtml = handler.render();

    const rootEl = document.getElementById(this.rootElementId);
    if (!rootEl) return;

    const existingMainLayout = rootEl.querySelector('#main-layout');
    const isAuthRoute = activeHash === '#/login' || !user;
    const isSameUserAndRole = user && this.lastUserId === user.id && this.lastUserRole === user.role;

    if (existingMainLayout && !isAuthRoute && isSameUserAndRole) {
      const appContentContainer = rootEl.querySelector('#app-content > div');
      if (appContentContainer) {
        appContentContainer.innerHTML = contentHtml;
      }
      const appContent = rootEl.querySelector('#app-content');
      if (appContent) {
        appContent.scrollTop = 0;
      }
      updateSidebarActiveItem(activeHash);

      if (handler.setup) {
        handler.setup((h) => this.navigate(h));
      }
    } else {
      this.lastUserId = user ? user.id : null;
      this.lastUserRole = user ? user.role : null;

      const fullHtml = renderLayout(user, activeHash, contentHtml);
      rootEl.innerHTML = fullHtml;
      setupLayoutListeners((h) => this.navigate(h));
      if (handler.setup) {
        handler.setup((h) => this.navigate(h));
      }
    }
  }
}

export const router = new Router('app');
