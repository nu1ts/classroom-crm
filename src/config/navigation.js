export const ROLE_NAVIGATION = {
  teacher: {
    label: 'Классный руководитель',
    defaultRoute: '#/overview',
    items: [
      { id: 'nav-overview', title: 'Обзор класса', path: '#/overview', icon: 'grid' },
      { id: 'nav-students', title: 'Ученики', path: '#/students', icon: 'users' },
      { id: 'nav-journal', title: 'Журнал', path: '#/journal', icon: 'book-open' },
      { id: 'nav-attendance', title: 'Посещаемость', path: '#/attendance', icon: 'check-square' },
      { id: 'nav-schedule', title: 'Расписание', path: '#/schedule', icon: 'calendar' },
      { id: 'nav-parents', title: 'Родители', path: '#/parents', icon: 'heart' },
      { id: 'nav-meetings', title: 'Собрания', path: '#/meetings', icon: 'users-group' },
      { id: 'nav-announcements', title: 'Объявления', path: '#/announcements', icon: 'megaphone' },
      { id: 'nav-analytics', title: 'Аналитика', path: '#/analytics', icon: 'chart-bar' }
    ],
    allowedRoutes: [
      '#/overview',
      '#/students',
      '#/student',
      '#/student-summary',
      '#/journal',
      '#/attendance',
      '#/schedule',
      '#/parents',
      '#/meetings',
      '#/announcements',
      '#/analytics',
      '#/profile'
    ]
  },

  subject_teacher: {
    label: 'Учитель-предметник',
    defaultRoute: '#/classes',
    items: [
      { id: 'nav-classes', title: 'Мои классы', path: '#/classes', icon: 'grid' },
      { id: 'nav-schedule', title: 'Расписание', path: '#/schedule', icon: 'calendar' },
      { id: 'nav-attendance', title: 'Посещаемость', path: '#/attendance', icon: 'check-square' },
      { id: 'nav-profile', title: 'Профиль', path: '#/profile', icon: 'user' }
    ],
    allowedRoutes: [
      '#/classes',
      '#/schedule',
      '#/attendance',
      '#/profile'
    ]
  },

  parent: {
    label: 'Родитель',
    defaultRoute: '#/child',
    items: [
      { id: 'nav-child', title: 'Ребёнок', path: '#/child', icon: 'user' },
      { id: 'nav-schedule', title: 'Расписание', path: '#/schedule', icon: 'calendar' },
      { id: 'nav-announcements', title: 'Объявления', path: '#/announcements', icon: 'megaphone' },
      { id: 'nav-profile', title: 'Профиль', path: '#/profile', icon: 'user' }
    ],
    allowedRoutes: [
      '#/child',
      '#/schedule',
      '#/announcements',
      '#/profile'
    ]
  },

  student: {
    label: 'Ученик',
    isReadOnly: true,
    defaultRoute: '#/schedule',
    items: [
      { id: 'nav-schedule', title: 'Расписание', path: '#/schedule', icon: 'calendar' },
      { id: 'nav-grades', title: 'Оценки', path: '#/grades', icon: 'award' },
      { id: 'nav-announcements', title: 'Объявления', path: '#/announcements', icon: 'megaphone' },
      { id: 'nav-profile', title: 'Профиль', path: '#/profile', icon: 'user' }
    ],
    allowedRoutes: [
      '#/schedule',
      '#/grades',
      '#/announcements',
      '#/profile'
    ]
  },

  admin: {
    label: 'Администратор',
    defaultRoute: '#/accounts',
    items: [
      { id: 'nav-accounts', title: 'Учётные записи', path: '#/accounts', icon: 'shield' },
      { id: 'nav-teachers', title: 'Учителя', path: '#/teachers', icon: 'users' },
      { id: 'nav-directories', title: 'Справочники', path: '#/directories', icon: 'book' },
      { id: 'nav-workload', title: 'Нагрузка', path: '#/workload', icon: 'briefcase' },
      { id: 'nav-school-year', title: 'Учебный год', path: '#/school-year', icon: 'calendar' }
    ],
    allowedRoutes: [
      '#/accounts',
      '#/teachers',
      '#/directories',
      '#/workload',
      '#/school-year',
      '#/profile'
    ]
  }
};

export function isRouteAllowedForRole(role, route) {
  const cleanRoute = (route || '').split('?')[0];
  if (cleanRoute === '#/login' || cleanRoute === '#/forbidden') {
    return true;
  }
  const config = ROLE_NAVIGATION[role];
  if (!config) return false;
  return config.allowedRoutes.includes(cleanRoute);
}

export function getDefaultRouteForRole(role) {
  const config = ROLE_NAVIGATION[role];
  return config ? config.defaultRoute : '#/login';
}
