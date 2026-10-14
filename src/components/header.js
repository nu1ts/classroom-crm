import { ROLE_NAVIGATION } from '../config/navigation.js';
import { logout, quickLoginAsRole } from '../services/storage.js';
import { isDevMode } from '../services/env.js';
import { renderIcon } from './icons.js';

export function renderHeader(currentUser, currentPath) {
  if (!currentUser) return '';

  const roleConfig = ROLE_NAVIGATION[currentUser.role] || ROLE_NAVIGATION.teacher;
  const currentItem = roleConfig.items.find(i => i.path === currentPath);
  const pageTitle = currentItem ? currentItem.title : (currentPath === '#/profile' ? 'Мой профиль' : 'Кабинет');

  const showDevSwitcher = isDevMode();
  let devSwitcherHtml = '';

  if (showDevSwitcher) {
    const demoRoles = [
      { key: 'teacher', name: 'Классрук: Смирнова М. В.' },
      { key: 'subject_teacher', name: 'Предметник: Козлов А. П.' },
      { key: 'parent', name: 'Родитель: Петров С. В.' },
      { key: 'student', name: 'Ученик: Петрова А.' },
      { key: 'admin', name: 'Админ: Никитин П. А.' }
    ];

    const roleOptionsHtml = demoRoles.map(r => `
      <option value="${r.key}" ${currentUser.role === r.key ? 'selected' : ''}>
        ${r.name}
      </option>
    `).join('');

    devSwitcherHtml = `
      <div class="hidden sm:flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
        <label for="demo-role-switcher" class="text-xs text-slate-500 font-medium whitespace-nowrap">Роль:</label>
        <select id="demo-role-switcher"
                class="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer">
          ${roleOptionsHtml}
        </select>
      </div>
    `;
  }

  return `
    <header id="app-header" class="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
      <div class="flex items-center space-x-4">
        <div>
          <h1 id="page-title" class="text-xl font-bold text-slate-800 leading-tight">
            ${pageTitle}
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Учебный год 2024/2025 · Демо-день: 28 октября 2024 (Пн)
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-3.5">
        ${devSwitcherHtml}

        <a href="#/profile" class="flex items-center space-x-2.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
          <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
            ${(currentUser.shortName || 'П').slice(0, 2)}
          </div>
          <div class="text-left hidden md:block">
            <div class="text-xs font-semibold text-slate-800 leading-tight">
              ${currentUser.shortName || currentUser.personName}
            </div>
            <div class="text-[11px] text-slate-500 leading-tight">
              ${currentUser.roleLabel}
            </div>
          </div>
        </a>

        <button id="btn-header-logout"
                title="Выйти из системы"
                class="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-medium transition-colors">
          ${renderIcon('logout', 'w-3.5 h-3.5')}
          <span class="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  `;
}

export function setupHeaderListeners(onNavigate) {
  const logoutBtn = document.getElementById('btn-header-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
      window.location.hash = '#/login';
      if (onNavigate) onNavigate('#/login');
    });
  }

  const roleSwitcher = document.getElementById('demo-role-switcher');
  if (roleSwitcher) {
    roleSwitcher.addEventListener('change', (e) => {
      const targetRole = e.target.value;
      const user = quickLoginAsRole(targetRole);
      if (user) {
        const defRoute = ROLE_NAVIGATION[user.role]?.defaultRoute || '#/overview';
        window.location.hash = defRoute;
        if (onNavigate) onNavigate(defRoute);
      }
    });
  }
}
