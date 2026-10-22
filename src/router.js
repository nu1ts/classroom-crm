import { getCurrentUser } from './services/storage.js';
import { isRouteAllowedForRole, getDefaultRouteForRole } from './config/navigation.js';
import { renderLayout, setupLayoutListeners, updateSidebarActiveItem } from './components/layout.js';
import { renderLoginView, setupLoginListeners } from './views/login.js';
import { renderOverviewView, setupOverviewListeners } from './views/overview.js';
import { renderProfileView, setupProfileListeners } from './views/profile.js';
import { renderForbiddenView } from './views/forbidden.js';
import { renderPlaceholderView } from './views/placeholder.js';
import { renderAttendanceView, setupAttendanceListeners } from './views/attendance.js';
import { renderJournalView, setupJournalListeners } from './views/journal.js';
import { renderStudentsView, setupStudentsListeners } from './views/students.js';
import { renderStudentSummaryView, setupStudentSummaryListeners } from './views/student-summary.js';
import { renderParentsView, setupParentsListeners, renderParentSummaryView, setupParentSummaryListeners } from './views/parents.js';
import { renderAnalyticsView, setupAnalyticsListeners } from './views/analytics.js';
import { renderAccountsView, setupAccountsListeners } from './views/accounts.js';
import { renderChangePasswordView, setupChangePasswordListeners } from './views/change-password.js';
import { renderTeachersView, setupTeachersListeners } from './views/teachers.js';

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
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderStudentsView({
        periodId: params.get('period') || 'q1_2024',
        searchQuery: params.get('search') || '',
        filterAbsencesOnly: params.get('absences') === 'true',
        sortBy: params.get('sortBy') || 'name',
        sortOrder: params.get('sortOrder') || 'asc',
        page: params.get('page') || '1',
        studentModalId: params.get('student') || null
      });
    },
    setup: (navigate) => setupStudentsListeners(navigate)
  },
  '#/student': {
    title: 'Сводка ученика',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderStudentSummaryView({
        studentId: params.get('id') || params.get('student') || 'st-23',
        periodId: params.get('period') || 'q1_2024'
      });
    },
    setup: (navigate) => setupStudentSummaryListeners(navigate)
  },
  '#/student-summary': {
    title: 'Сводка ученика',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderStudentSummaryView({
        studentId: params.get('id') || params.get('student') || 'st-23',
        periodId: params.get('period') || 'q1_2024'
      });
    },
    setup: (navigate) => setupStudentSummaryListeners(navigate)
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
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderParentsView({
        searchQuery: params.get('search') || '',
        filterLink: params.get('filter') || 'all',
        page: params.get('page') || '1'
      });
    },
    setup: (navigate) => setupParentsListeners(navigate)
  },
  '#/parent': {
    title: 'Сводка по родителю',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderParentSummaryView({
        parentId: params.get('id') || params.get('parent') || 'pr-23'
      });
    },
    setup: (navigate) => setupParentSummaryListeners(navigate)
  },
  '#/parent-summary': {
    title: 'Сводка по родителю',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderParentSummaryView({
        parentId: params.get('id') || params.get('parent') || 'pr-23'
      });
    },
    setup: (navigate) => setupParentSummaryListeners(navigate)
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
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderAnalyticsView({
        periodId: params.get('periodId') || params.get('period') || 'q1_2024',
        showReport: params.get('showReport') === 'true'
      });
    },
    setup: (navigate) => setupAnalyticsListeners(navigate)
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
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      const currentUser = getCurrentUser();
      return renderAccountsView({
        searchQuery: params.get('search') || '',
        filterRole: params.get('role') || 'all',
        page: params.get('page') || '1',
        currentUserId: currentUser ? currentUser.id : null
      });
    },
    setup: (navigate) => setupAccountsListeners(navigate)
  },

  '#/change-password': {
    title: 'Смена временного пароля',
    render: () => renderChangePasswordView(),
    setup: (navigate) => setupChangePasswordListeners(navigate)
  },
  '#/teachers': {
    title: 'Учителя',
    render: () => {
      const hash = window.location.hash || '';
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      return renderTeachersView({
        searchQuery: params.get('search') || '',
        filterSubject: params.get('subject') || 'all',
        filterAccount: params.get('account') || 'all'
      });
    },
    setup: (navigate) => setupTeachersListeners(navigate)
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
      this._isRouting = false;
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
