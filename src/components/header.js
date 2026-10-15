import { ROLE_NAVIGATION } from '../config/navigation.js';
import { quickLoginAsRole } from '../services/storage.js';
import { isDevMode } from '../services/env.js';

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
    <header id="app-header" class="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div class="flex items-center space-x-4">
        <h1 id="page-title" class="text-xl font-bold text-slate-800 leading-tight">
          ${pageTitle}
        </h1>
      </div>

      <div class="flex items-center space-x-3.5">
        ${devSwitcherHtml}
      </div>
    </header>
  `;
}

export function setupHeaderListeners(onNavigate) {
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
