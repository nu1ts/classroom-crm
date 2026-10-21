import {
  getDB,
  createAccount,
  updateAccountRole,
  setAccountStatus,
  resetAccountPassword,
  ROLE_LABELS
} from '../services/storage.js';
import { renderIcon } from '../components/icons.js';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['admin', 'teacher', 'subject_teacher', 'parent', 'student'];

const ROLE_BADGE_CLASSES = {
  admin: 'bg-rose-100 text-rose-700',
  teacher: 'bg-violet-100 text-violet-700',
  subject_teacher: 'bg-sky-100 text-sky-700',
  parent: 'bg-emerald-100 text-emerald-700',
  student: 'bg-slate-200 text-slate-700'
};

function getBindingLabel(user) {
  switch (user.role) {
    case 'teacher':
      return user.className || 'Классный руководитель';
    case 'subject_teacher':
      return user.subject || 'Без нагрузки';
    case 'parent':
      return user.childName || 'Без привязки';
    case 'student':
      return user.className || (user.studentId ? `Карточка ученика: ${user.studentId}` : 'Без привязки');
    case 'admin':
      return 'Все классы школы';
    default:
      return '—';
  }
}

function formatLastLogin(isoValue, demoToday) {
  if (!isoValue) return '—';
  const dateStr = isoValue.slice(0, 10);
  const timeStr = isoValue.slice(11, 16);

  if (dateStr === demoToday) {
    return timeStr ? `Сегодня, ${timeStr}` : 'Сегодня';
  }

  const demoDate = new Date(`${demoToday}T00:00:00`);
  const prevDate = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((demoDate - prevDate) / 86400000);
  if (diffDays === 1) {
    return timeStr ? `Вчера, ${timeStr}` : 'Вчера';
  }

  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}${timeStr ? `, ${timeStr}` : ''}`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderAccountsView(options = {}) {
  const db = getDB();
  const demoToday = (db.meta && db.meta.demoToday) || new Date().toISOString().slice(0, 10);
  const currentUser = db.users.find(u => u.id === (options.currentUserId || ''));

  const searchQuery = (options.searchQuery || '').trim().toLowerCase();
  const filterRole = options.filterRole || 'all';
  const currentPage = parseInt(options.page || '1', 10) || 1;

  const rows = (db.users || []).map(user => ({
    user,
    binding: getBindingLabel(user),
    isSelf: Boolean(currentUser && currentUser.id === user.id)
  }));

  const filteredRows = rows.filter(row => {
    if (filterRole !== 'all' && row.user.role !== filterRole) return false;
    if (searchQuery) {
      const name = (row.user.personName || '').toLowerCase();
      const login = (row.user.username || '').toLowerCase();
      if (!name.includes(searchQuery) && !login.includes(searchQuery)) return false;
    }
    return true;
  });

  filteredRows.sort((a, b) => (a.user.personName || '').localeCompare(b.user.personName || '', 'ru'));

  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  const activeCount = rows.filter(r => r.user.status === 'active').length;
  const blockedCount = rows.length - activeCount;

  const roleFilterOptions = ROLE_OPTIONS.map(role => `
    <option value="${role}" ${filterRole === role ? 'selected' : ''}>${ROLE_LABELS[role]}</option>
  `).join('');

  const tableRows = paginatedRows.map(row => {
    const { user, binding, isSelf } = row;
    const isActive = user.status === 'active';
    const statusBadge = isActive
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Активен</span>`
      : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">Заблокирован</span>`;
    const roleBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE_CLASSES[user.role] || 'bg-slate-100 text-slate-600'}">${escapeHtml(user.roleLabel || ROLE_LABELS[user.role] || user.role)}</span>`;

    const blockButton = isActive
      ? `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="blocked"
                 ${isSelf ? 'disabled title="Нельзя заблокировать собственную учётную запись"' : 'title="Заблокировать учётную запись"'}
                 class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${isSelf
        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
        : 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer'}">Блок</button>`
      : `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="active" title="Разблокировать учётную запись"
                 class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer">Разблок</button>`;

    return `
      <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors" data-account-row="${user.id}">
        <td class="px-4 py-3.5 text-sm font-semibold text-slate-800">${escapeHtml(user.personName)}</td>
        <td class="px-4 py-3.5 text-xs text-slate-500 font-mono">${escapeHtml(user.username)}</td>
        <td class="px-4 py-3.5">${roleBadge}</td>
        <td class="px-4 py-3.5">${statusBadge}</td>
        <td class="px-4 py-3.5 text-xs text-slate-600">${escapeHtml(binding)}</td>
        <td class="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(formatLastLogin(user.lastLoginAt, demoToday))}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center justify-end space-x-2">
            <button type="button" data-action="edit-account" data-user-id="${user.id}" title="Изменить учётную запись"
                    class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 cursor-pointer">Изменить</button>
            ${blockButton}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  let paginationHtml = '';
  if (totalPages > 1) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    const pageButtons = pages.map(p => `
      <button type="button" data-action="goto-page" data-page="${p}"
              class="w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${p === validPage
        ? 'bg-brand-500 text-white shadow-sm'
        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}">${p}</button>
    `).join('');
    paginationHtml = `
      <div class="flex items-center space-x-1.5">
        <button type="button" data-action="goto-page" data-page="${validPage - 1}" ${validPage <= 1 ? 'disabled' : ''}
                class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer">
          ${renderIcon('chevron-left', 'w-4 h-4')}
        </button>
        ${pageButtons}
        <button type="button" data-action="goto-page" data-page="${validPage + 1}" ${validPage >= totalPages ? 'disabled' : ''}
                class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer">
          ${renderIcon('chevron-right', 'w-4 h-4')}
        </button>
      </div>
    `;
  }

  const roleSelectOptions = ROLE_OPTIONS.map(role => `
    <option value="${role}">${ROLE_LABELS[role]}</option>
  `).join('');

  return `
    <div class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Учётные записи</h1>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              Администрирование
            </span>
          </div>
          <p class="text-sm font-medium text-slate-500 mt-1" id="accounts-total-subtitle">
            ${rows.length} учётных записей · ${activeCount} активных · ${blockedCount} заблокированных
          </p>
        </div>

        <div>
          <button type="button" id="btn-open-create-account"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon('user-plus', 'w-4 h-4')}
            <span>+ Создать учётную запись</span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row items-center gap-3">
        <div class="relative flex-1 w-full">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('search', 'w-4 h-4')}
          </div>
          <input type="text" id="input-accounts-search" value="${escapeHtml(options.searchQuery || '')}"
                 placeholder="Поиск по ФИО или логину..."
                 class="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
          ${options.searchQuery ? `
            <button type="button" id="btn-clear-accounts-search" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          ` : ''}
        </div>

        <div class="flex items-center space-x-2 w-full md:w-auto">
          <label for="select-accounts-role" class="text-xs font-semibold text-slate-500 whitespace-nowrap">Роль:</label>
          <div class="relative flex-1 md:flex-none">
            <select id="select-accounts-role"
                    class="appearance-none h-10 pl-3.5 pr-9 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs cursor-pointer md:w-52">
              <option value="all" ${filterRole === 'all' ? 'selected' : ''}>Все роли</option>
              ${roleFilterOptions}
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              ${renderIcon('chevron-down', 'w-4 h-4')}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200">
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ФИО пользователя</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Логин</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Роль</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Статус</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Привязка</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Последний вход</th>
                <th class="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Действия</th>
              </tr>
            </thead>
            <tbody id="accounts-table-body">
              ${tableRows || `
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center">
                    <div class="text-sm font-medium text-slate-500">Ничего не найдено</div>
                    <div class="text-xs text-slate-400 mt-1">Измените условия поиска или фильтр по роли</div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p class="text-xs text-slate-500" id="accounts-shown-counter">
          Показано ${paginatedRows.length} из ${totalFiltered} учётных записей
        </p>
        ${paginationHtml}
      </div>

      <div id="modal-create-account" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-create-account-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Создать учётную запись</h3>
            <button type="button" data-action="close-create-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Пользователь обязан сменить временный пароль при первом входе.</p>

          <div class="space-y-3.5">
            <div>
              <label for="input-create-name" class="block text-xs font-semibold text-slate-700 mb-1.5">ФИО пользователя</label>
              <input type="text" id="input-create-name" placeholder="Например: Иванова Елена Сергеевна"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>
            <div>
              <label for="input-create-login" class="block text-xs font-semibold text-slate-700 mb-1.5">Логин (электронная почта)</label>
              <input type="email" id="input-create-login" placeholder="ivanova.e@school.ru"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>
            <div>
              <label for="select-create-role" class="block text-xs font-semibold text-slate-700 mb-1.5">Роль</label>
              <div class="relative">
                <select id="select-create-role"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  ${roleSelectOptions}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
            </div>
            <div>
              <label for="input-create-password" class="block text-xs font-semibold text-slate-700 mb-1.5">Временный пароль</label>
              <input type="text" id="input-create-password" placeholder="Не менее 8 символов, буквы обоих регистров и цифра"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 font-mono" />
              <p class="text-[11px] text-slate-400 mt-1">Требования: не короче 8 символов, буквы в обоих регистрах и хотя бы одна цифра.</p>
            </div>
          </div>

          <div id="create-account-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-create-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-create-account"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Создать</button>
          </div>
        </div>
      </div>

      <div id="modal-edit-account" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-account-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Изменить учётную запись</h3>
            <button type="button" data-action="close-edit-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Смена роли применяется при следующем входе пользователя в систему.</p>

          <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-700 space-y-1 mb-4">
            <div><span class="font-semibold text-slate-900">ФИО:</span> <span id="edit-account-name">—</span></div>
            <div><span class="font-semibold text-slate-900">Логин:</span> <span id="edit-account-login" class="font-mono">—</span></div>
            <div><span class="font-semibold text-slate-900">Привязка:</span> <span id="edit-account-binding">—</span></div>
          </div>

          <div>
            <label for="select-edit-role" class="block text-xs font-semibold text-slate-700 mb-1.5">Роль</label>
            <div class="relative">
              <select id="select-edit-role"
                      class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                ${roleSelectOptions}
              </select>
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                ${renderIcon('chevron-down', 'w-4 h-4')}
              </div>
            </div>
          </div>

          <div id="edit-account-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-edit-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-edit-account"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Сохранить</button>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold text-slate-700">Сброс пароля</div>
                <div class="text-[11px] text-slate-400 mt-0.5">Будет выдан временный пароль, обязательный к смене при первом входе.</div>
              </div>
              <button type="button" id="btn-reset-account-password"
                      class="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap">Сбросить пароль</button>
            </div>
            <div id="reset-password-result" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium"></div>
          </div>
        </div>
      </div>

      <div id="accounts-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="accounts-toast-icon">${renderIcon('check', 'w-4 h-4 text-emerald-400')}</span>
        <span id="accounts-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}

export function setupAccountsListeners(onNavigate) {
  const toast = document.getElementById('accounts-toast');
  const toastMessage = document.getElementById('accounts-toast-message');

  function showToast(msg, isError = false) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    const icon = document.getElementById('accounts-toast-icon');
    if (icon) {
      icon.innerHTML = isError
        ? renderIcon('alert', 'w-4 h-4 text-rose-400')
        : renderIcon('check', 'w-4 h-4 text-emerald-400');
    }
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3200);
  }

  function readParams() {
    const hash = window.location.hash || '';
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    return new URLSearchParams(queryString);
  }

  function updateQueryUrl(newParams = {}) {
    const params = readParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    const target = `#/accounts${qs ? `?${qs}` : ''}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
    } else {
      onNavigate(target);
    }
  }

  function showCreateError(msg) {
    const box = document.getElementById('create-account-error');
    if (!box) return;
    if (msg) {
      box.textContent = msg;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  function showEditError(msg) {
    const box = document.getElementById('edit-account-error');
    if (!box) return;
    if (msg) {
      box.textContent = msg;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  const searchInput = document.getElementById('input-accounts-search');
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        updateQueryUrl({ search: searchInput.value.trim(), page: null });
      }, 400);
    });
  }

  const clearSearchBtn = document.getElementById('btn-clear-accounts-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      updateQueryUrl({ search: null, page: null });
    });
  }

  const roleSelect = document.getElementById('select-accounts-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      updateQueryUrl({ role: roleSelect.value, page: null });
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'goto-page') {
      if (btn.disabled) return;
      updateQueryUrl({ page: btn.getAttribute('data-page') });
    }

    if (action === 'toggle-status') {
      const userId = btn.getAttribute('data-user-id');
      const nextStatus = btn.getAttribute('data-next-status');
      const res = setAccountStatus(userId, nextStatus);
      if (res.success) {
        showToast(res.message);
        setTimeout(() => onNavigate(window.location.hash), 500);
      } else {
        showToast(res.error, true);
      }
    }

    if (action === 'edit-account') {
      openEditModal(btn.getAttribute('data-user-id'));
    }

    if (action === 'close-create-modal') closeCreateModal();
    if (action === 'close-edit-modal') closeEditModal();
  });

  const modalCreate = document.getElementById('modal-create-account');
  const modalCreateDialog = document.getElementById('modal-create-account-dialog');

  function openCreateModal() {
    if (!modalCreate) return;
    showCreateError('');
    ['input-create-name', 'input-create-login', 'input-create-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const roleSelect = document.getElementById('select-create-role');
    if (roleSelect) roleSelect.value = 'teacher';
    modalCreate.classList.remove('opacity-0', 'pointer-events-none');
    modalCreate.classList.add('opacity-100', 'pointer-events-auto');
    if (modalCreateDialog) {
      modalCreateDialog.classList.remove('scale-95');
      modalCreateDialog.classList.add('scale-100');
    }
  }

  function closeCreateModal() {
    if (!modalCreate) return;
    modalCreate.classList.remove('opacity-100', 'pointer-events-auto');
    modalCreate.classList.add('opacity-0', 'pointer-events-none');
    if (modalCreateDialog) {
      modalCreateDialog.classList.remove('scale-100');
      modalCreateDialog.classList.add('scale-95');
    }
  }

  const openCreateBtn = document.getElementById('btn-open-create-account');
  if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);

  const submitCreateBtn = document.getElementById('btn-submit-create-account');
  if (submitCreateBtn) {
    submitCreateBtn.addEventListener('click', () => {
      const personName = (document.getElementById('input-create-name') || {}).value || '';
      const username = (document.getElementById('input-create-login') || {}).value || '';
      const role = (document.getElementById('select-create-role') || {}).value || 'teacher';
      const tempPassword = (document.getElementById('input-create-password') || {}).value || '';

      const res = createAccount({ personName, username, role, tempPassword });
      if (!res.success) {
        showCreateError(res.error);
        return;
      }
      closeCreateModal();
      showToast('Учётная запись создана. Временный пароль действителен до первого входа.');
      setTimeout(() => onNavigate(window.location.hash), 500);
    });
  }

  if (modalCreate) {
    modalCreate.addEventListener('click', (e) => {
      if (e.target === modalCreate) closeCreateModal();
    });
  }

  const modalEdit = document.getElementById('modal-edit-account');
  const modalEditDialog = document.getElementById('modal-edit-account-dialog');
  let editingUserId = null;

  function openEditModal(userId) {
    const db = getDB();
    const user = (db.users || []).find(u => u.id === userId);
    if (!user || !modalEdit) return;
    editingUserId = userId;
    showEditError('');
    const resetResult = document.getElementById('reset-password-result');
    if (resetResult) resetResult.classList.add('hidden');

    const nameEl = document.getElementById('edit-account-name');
    const loginEl = document.getElementById('edit-account-login');
    const bindingEl = document.getElementById('edit-account-binding');
    if (nameEl) nameEl.textContent = user.personName;
    if (loginEl) loginEl.textContent = user.username;
    if (bindingEl) bindingEl.textContent = getBindingLabel(user);

    const roleSelect = document.getElementById('select-edit-role');
    if (roleSelect) roleSelect.value = user.role;

    modalEdit.classList.remove('opacity-0', 'pointer-events-none');
    modalEdit.classList.add('opacity-100', 'pointer-events-auto');
    if (modalEditDialog) {
      modalEditDialog.classList.remove('scale-95');
      modalEditDialog.classList.add('scale-100');
    }
  }

  function closeEditModal() {
    if (!modalEdit) return;
    editingUserId = null;
    modalEdit.classList.remove('opacity-100', 'pointer-events-auto');
    modalEdit.classList.add('opacity-0', 'pointer-events-none');
    if (modalEditDialog) {
      modalEditDialog.classList.remove('scale-100');
      modalEditDialog.classList.add('scale-95');
    }
  }

  const submitEditBtn = document.getElementById('btn-submit-edit-account');
  if (submitEditBtn) {
    submitEditBtn.addEventListener('click', () => {
      if (!editingUserId) return;
      const newRole = (document.getElementById('select-edit-role') || {}).value;
      const res = updateAccountRole(editingUserId, newRole);
      if (!res.success) {
        showEditError(res.error);
        return;
      }
      closeEditModal();
      showToast(res.message);
      setTimeout(() => onNavigate(window.location.hash), 500);
    });
  }

  const resetPwdBtn = document.getElementById('btn-reset-account-password');
  if (resetPwdBtn) {
    resetPwdBtn.addEventListener('click', () => {
      if (!editingUserId) return;
      const res = resetAccountPassword(editingUserId);
      const resultBox = document.getElementById('reset-password-result');
      if (!res.success) {
        showEditError(res.error);
        return;
      }
      if (resultBox) {
        resultBox.textContent = `Временный пароль: ${res.tempPassword} — сообщите его пользователю.`;
        resultBox.classList.remove('hidden');
      }
      showToast('Пароль сброшен. Пользователь сменит его при первом входе.');
    });
  }

  if (modalEdit) {
    modalEdit.addEventListener('click', (e) => {
      if (e.target === modalEdit) closeEditModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalCreate && !modalCreate.classList.contains('pointer-events-none')) closeCreateModal();
    if (modalEdit && !modalEdit.classList.contains('pointer-events-none')) closeEditModal();
  });

  const params = readParams();
  const editParam = params.get('edit');
  if (editParam) {
    openEditModal(editParam);
    const clean = `#/accounts${params.get('search') || params.get('role') || params.get('page') ? `?${[
      params.get('search') ? `search=${encodeURIComponent(params.get('search'))}` : '',
      params.get('role') ? `role=${params.get('role')}` : '',
      params.get('page') ? `page=${params.get('page')}` : ''
    ].filter(Boolean).join('&')}` : ''}`;
    history.replaceState(null, '', clean);
  }
}
