import { getCurrentUser } from './services/storage.js';
import { isRouteAllowedForRole, getDefaultRouteForRole } from './config/navigation.js';
import { renderLayout, setupLayoutListeners } from './components/layout.js';
import { renderLoginView, setupLoginListeners } from './views/login.js';
import { renderOverviewView, setupOverviewListeners } from './views/overview.js?v=2';
import { renderProfileView, setupProfileListeners } from './views/profile.js';
import { renderForbiddenView } from './views/forbidden.js';
import { renderPlaceholderView } from './views/placeholder.js';

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
    title: 'Журнал',
    render: () => renderPlaceholderView('Журнал', 'Электронный журнал успеваемости класса 7Б по предметам', '#/journal'),
    setup: () => { }
  },
  '#/attendance': {
    title: 'Посещаемость',
    render: () => renderPlaceholderView('Посещаемость', 'Учёт посещаемости уроков, причины отсутствия и справки', '#/attendance'),
    setup: () => { }
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
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());
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
    const fullHtml = renderLayout(user, activeHash, contentHtml);

    const rootEl = document.getElementById(this.rootElementId);
    if (rootEl) {
      rootEl.innerHTML = fullHtml;
      setupLayoutListeners((h) => this.navigate(h));
      if (handler.setup) {
        handler.setup((h) => this.navigate(h));
      }
    }
  }
}

export const router = new Router('app');
