import {
  getDB,
  createAccount,
  updateAccountRole,
  setAccountStatus,
  setAccountBinding,
  getAccountCardRef,
  resetAccountPassword,
  ROLE_LABELS
} from '../services/storage.js';
import { renderIcon } from '../components/icons.js';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['admin', 'teacher', 'subject_teacher', 'parent', 'student'];

const ACCOUNT_ROLE_LABELS = {
  ...ROLE_LABELS,
  subject_teacher: 'Учитель'
};

const ROLE_BADGE_CLASSES = {
  admin: 'bg-rose-100 text-rose-700',
  teacher: 'bg-violet-100 text-violet-700',
  subject_teacher: 'bg-sky-100 text-sky-700',
  parent: 'bg-emerald-100 text-emerald-700',
  student: 'bg-slate-200 text-slate-700'
};

function getBindingLabel(user, db) {
  switch (user.role) {
    case 'teacher':
      return user.cardName
        ? `Учитель: ${user.cardName}`
        : (user.className || 'Классный руководитель');
    case 'subject_teacher':
      return user.cardName
        ? `Учитель: ${user.cardName}`
        : (user.subject || 'Без нагрузки');
    case 'parent':
      return user.childName || 'Без привязки';
    case 'student': {
      const student = (db.students || []).find(s => s.id === user.studentId);
      if (student) {
        return `Ученик: ${student.shortName || student.fullName}`;
      }
      return user.className || 'Без привязки';
    }
    case 'admin':
      return 'Все классы школы';
    default:
      return '—';
  }
}

/**
 * Список учётных карточек, доступных для привязки по роли
 */
function getCardOptions(db, role, user = null) {
  if (role === 'student' || role === 'parent') {
    return (db.students || []).map(s => ({ id: s.id, label: s.fullName }));
  }
  if (role === 'teacher' || role === 'subject_teacher') {
    const names = [...new Set((db.subjects || []).map(s => s.teacher))];
    if (user && user.shortName && !names.includes(user.shortName)) {
      names.push(user.shortName);
    }
    return names.map(name => ({ id: name, label: name }));
  }
  return [];
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

function statusBadgeHtml(isActive) {
  return isActive
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Активен</span>`
    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">Заблокирован</span>`;
}

function roleBadgeHtml(user) {
  const label = ACCOUNT_ROLE_LABELS[user.role] || user.roleLabel || user.role;
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE_CLASSES[user.role] || 'bg-slate-100 text-slate-600'}">${escapeHtml(label)}</span>`;
}

function toggleStatusButtonHtml(user, isSelf) {
  const isActive = user.status === 'active';
  if (isActive) {
    return `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="blocked"
              ${isSelf ? 'disabled title="Нельзя заблокировать собственную учётную запись"' : 'title="Заблокировать учётную запись"'}
              class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${isSelf
        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
        : 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer'}">Блок</button>`;
  }
  return `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="active" title="Разблокировать учётную запись"
            class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer">Разблок</button>`;
}

export function renderAccountsView(options = {}) {
  const db = getDB();
  const currentUser = db.users.find(u => u.id === (options.currentUserId || ''));

  const searchQuery = (options.searchQuery || '').trim();
  const filterRole = options.filterRole || 'all';

  const rows = (db.users || []).map(user => ({
    user,
    isSelf: Boolean(currentUser && currentUser.id === user.id)
  }));

  const activeCount = rows.filter(r => r.user.status === 'active').length;
  const blockedCount = rows.length - activeCount;

  const roleFilterOptions = ROLE_OPTIONS.map(role => `
    <option value="${role}" ${filterRole === role ? 'selected' : ''}>${ACCOUNT_ROLE_LABELS[role]}</option>
  `).join('');

  const roleSelectOptions = ROLE_OPTIONS.map(role => `
    <option value="${role}">${ACCOUNT_ROLE_LABELS[role]}</option>
  `).join('');

  return `
    <div id="accounts-view" class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Учётные записи</h1>
          <p class="text-sm font-medium text-slate-500 mt-1" id="accounts-total-subtitle">
            ${rows.length} учётных записей · ${activeCount} активных · ${blockedCount} заблокированных
          </p>
        </div>

        <div>
          <button type="button" id="btn-open-create-account"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon('user-plus', 'w-4 h-4')}
            <span>Создать учётную запись</span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('search', 'w-4 h-4')}
          </div>
          <input type="text" id="input-accounts-search" value="${escapeHtml(searchQuery)}"
                 placeholder="Поиск по ФИО или логину..."
                 autocomplete="off"
                 style="padding-left: 2.75rem; padding-right: 2.25rem;"
                 class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
          <button type="button" id="btn-clear-accounts-search" title="Очистить поиск"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? '' : 'hidden'} cursor-pointer">
            ${renderIcon('x', 'w-3.5 h-3.5')}
          </button>
        </div>

        <div class="relative md:ml-auto">
          <select id="select-accounts-role"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-48">
            <option value="all" ${filterRole === 'all' ? 'selected' : ''}>Все роли</option>
            ${roleFilterOptions}
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('chevron-down', 'w-4 h-4')}
          </div>
        </div>
      </div>

      <div id="accounts-table-wrapper"></div>

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

          <div id="edit-binding-block" class="mt-3.5">
            <label for="select-edit-binding" class="block text-xs font-semibold text-slate-700 mb-1.5">Учётная карточка</label>
            <div class="flex items-stretch space-x-2">
              <div class="relative flex-1">
                <select id="select-edit-binding"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
              <button type="button" id="btn-unlink-account" title="Отвязать учётную карточку"
                      class="px-3.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap">Отвязать</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Каждая учётная карточка может быть связана только с одной учётной записью.</p>
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

export function setupAccountsListeners() {
  const demoToday = (getDB().meta && getDB().meta.demoToday) || new Date().toISOString().slice(0, 10);
  const state = {
    searchQuery: '',
    filterRole: 'all',
    page: 1
  };

  const toast = document.getElementById('accounts-toast');
  const toastMessage = document.getElementById('accounts-toast-message');
  const tableWrapper = document.getElementById('accounts-table-wrapper');
  const subtitle = document.getElementById('accounts-total-subtitle');

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
    toast.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3200);
  }

  function readParams() {
    const hash = window.location.hash || '';
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    return new URLSearchParams(queryString);
  }

  function syncRoute() {
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (state.filterRole && state.filterRole !== 'all') params.set('role', state.filterRole);
    if (state.page > 1) params.set('page', String(state.page));
    const queryStr = params.toString();
    window.history.replaceState(null, '', queryStr ? `#/accounts?${queryStr}` : '#/accounts');
  }

  function getCurrentUserId() {
    try {
      const session = JSON.parse(localStorage.getItem('classroom_crm_session') || 'null');
      return session ? session.userId : null;
    } catch {
      return null;
    }
  }

  function getFilteredRows() {
    const db = getDB();
    const currentUserId = getCurrentUserId();
    const q = state.searchQuery.toLowerCase();

    return (db.users || [])
      .map(user => ({
        user,
        binding: getBindingLabel(user, db),
        isSelf: user.id === currentUserId
      }))
      .filter(row => {
        if (state.filterRole !== 'all' && row.user.role !== state.filterRole) return false;
        if (q) {
          const name = (row.user.personName || '').toLowerCase();
          const login = (row.user.username || '').toLowerCase();
          if (!name.includes(q) && !login.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.user.personName || '').localeCompare(b.user.personName || '', 'ru'));
  }

  function actionsCellHtml(user, isSelf) {
    return `
      <div class="flex items-center justify-end space-x-2">
        <button type="button" data-action="edit-account" data-user-id="${user.id}" title="Изменить учётную запись"
                class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 cursor-pointer">Изменить</button>
        ${toggleStatusButtonHtml(user, isSelf)}
      </div>
    `;
  }

  function renderTableArea() {
    if (!tableWrapper) return;
    const filteredRows = getFilteredRows();
    const totalFiltered = filteredRows.length;
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    const startIndex = (state.page - 1) * PAGE_SIZE;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

    const tableRows = paginatedRows.map(row => {
      const { user, binding, isSelf } = row;
      const isActive = user.status === 'active';
      return `
        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors" data-account-row="${user.id}">
          <td class="py-3.5 pl-6 pr-4 text-sm font-semibold text-slate-800">${escapeHtml(user.personName)}</td>
          <td class="px-4 py-3.5 text-xs text-slate-500 font-mono">${escapeHtml(user.username)}</td>
          <td class="px-4 py-3.5">${roleBadgeHtml(user)}</td>
          <td class="px-4 py-3.5">${statusBadgeHtml(isActive)}</td>
          <td class="px-4 py-3.5 text-xs text-slate-600">${escapeHtml(binding)}</td>
          <td class="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(formatLastLogin(user.lastLoginAt, demoToday))}</td>
          <td class="py-3.5 pl-4 pr-6">${actionsCellHtml(user, isSelf)}</td>
        </tr>
      `;
    }).join('');

    let paginationHtml = '';
    if (totalPages > 1) {
      const pages = [];
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      const pageButtons = pages.map(p => `
        <button type="button" data-action="goto-page" data-page="${p}"
                class="w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${p === state.page
          ? 'bg-brand-500 text-white shadow-sm'
          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}">${p}</button>
      `).join('');
      paginationHtml = `
        <div class="flex items-center space-x-1.5">
          <button type="button" data-action="goto-page" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}
                  class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer">
            ${renderIcon('chevron-left', 'w-4 h-4')}
          </button>
          ${pageButtons}
          <button type="button" data-action="goto-page" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''}
                  class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer">
            ${renderIcon('chevron-right', 'w-4 h-4')}
          </button>
        </div>
      `;
    }

    tableWrapper.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th scope="col" class="py-3.5 pl-6 pr-4">ФИО пользователя</th>
                <th scope="col" class="px-4 py-3.5">Логин</th>
                <th scope="col" class="px-4 py-3.5">Роль</th>
                <th scope="col" class="px-4 py-3.5">Статус</th>
                <th scope="col" class="px-4 py-3.5">Привязка</th>
                <th scope="col" class="px-4 py-3.5">Последний вход</th>
                <th scope="col" class="py-3.5 pl-4 pr-6 text-right">Действия</th>
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

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
        <p class="text-xs text-slate-500" id="accounts-shown-counter">
          Показано ${paginatedRows.length} из ${totalFiltered} учётных записей
        </p>
        ${paginationHtml}
      </div>
    `;
  }

  function updateSubtitle() {
    if (!subtitle) return;
    const db = getDB();
    const activeCount = (db.users || []).filter(u => u.status === 'active').length;
    const blockedCount = (db.users || []).length - activeCount;
    subtitle.textContent = `${(db.users || []).length} учётных записей · ${activeCount} активных · ${blockedCount} заблокированных`;
  }

  /**
   * Точечное обновление строки таблицы без перерисовки страницы
   * (устраняет мигание при блокировке/разблокировке и смене роли).
   */
  function refreshRowInPlace(userId) {
    const db = getDB();
    const user = (db.users || []).find(u => u.id === userId);
    const rowEl = document.querySelector(`[data-account-row="${userId}"]`);
    if (!user || !rowEl) {
      renderTableArea();
      return;
    }

    const cells = rowEl.querySelectorAll('td');
    if (cells.length >= 7) {
      cells[2].innerHTML = roleBadgeHtml(user);
      cells[3].innerHTML = statusBadgeHtml(user.status === 'active');
      cells[4].textContent = getBindingLabel(user, db);
      cells[6].innerHTML = actionsCellHtml(user, user.id === getCurrentUserId());
    }
    updateSubtitle();
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
  const clearSearchBtn = document.getElementById('btn-clear-accounts-search');
  const roleSelect = document.getElementById('select-accounts-role');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value.trim();
      state.page = 1;
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      }
      syncRoute();
      renderTableArea();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      state.page = 1;
      clearSearchBtn.classList.add('hidden');
      syncRoute();
      renderTableArea();
      if (searchInput) searchInput.focus();
    });
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      state.filterRole = roleSelect.value;
      state.page = 1;
      syncRoute();
      renderTableArea();
    });
  }

  const viewRoot = document.getElementById('accounts-view');
  viewRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'goto-page') {
      if (btn.disabled) return;
      state.page = parseInt(btn.getAttribute('data-page'), 10) || 1;
      syncRoute();
      renderTableArea();
    }

    if (action === 'toggle-status') {
      const userId = btn.getAttribute('data-user-id');
      const nextStatus = btn.getAttribute('data-next-status');
      const res = setAccountStatus(userId, nextStatus);
      if (res.success) {
        refreshRowInPlace(userId);
        showToast(res.message);
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
    const createRoleSelect = document.getElementById('select-create-role');
    if (createRoleSelect) createRoleSelect.value = 'teacher';
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
      state.page = 1;
      syncRoute();
      renderTableArea();
      updateSubtitle();
      showToast('Учётная запись создана. Временный пароль действителен до первого входа.');
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
  let editingUser = null;

  function refreshBindingOptions(db, role, currentRef) {
    const bindingBlock = document.getElementById('edit-binding-block');
    const bindingSelect = document.getElementById('select-edit-binding');
    const unlinkBtn = document.getElementById('btn-unlink-account');
    if (!bindingSelect || !bindingBlock) return;

    if (role === 'admin') {
      bindingBlock.classList.add('hidden');
      return;
    }
    bindingBlock.classList.remove('hidden');

    const options = getCardOptions(db, role, editingUser);
    bindingSelect.innerHTML = [
      '<option value="">— без карточки —</option>',
      ...options.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`)
    ].join('');

    const currentValue = currentRef ? String(currentRef.id) : '';
    const hasCurrent = options.some(o => String(o.id) === currentValue);
    bindingSelect.value = hasCurrent ? currentValue : '';
    if (unlinkBtn) {
      unlinkBtn.disabled = !hasCurrent;
      unlinkBtn.classList.toggle('cursor-not-allowed', !hasCurrent);
      unlinkBtn.classList.toggle('opacity-40', !hasCurrent);
    }
  }

  function openEditModal(userId) {
    const db = getDB();
    const user = (db.users || []).find(u => u.id === userId);
    if (!user || !modalEdit) return;
    editingUserId = userId;
    editingUser = user;
    showEditError('');
    const resetResult = document.getElementById('reset-password-result');
    if (resetResult) resetResult.classList.add('hidden');

    const nameEl = document.getElementById('edit-account-name');
    const loginEl = document.getElementById('edit-account-login');
    const bindingEl = document.getElementById('edit-account-binding');
    if (nameEl) nameEl.textContent = user.personName;
    if (loginEl) loginEl.textContent = user.username;
    if (bindingEl) bindingEl.textContent = getBindingLabel(user, db);

    const editRoleSelect = document.getElementById('select-edit-role');
    if (editRoleSelect) {
      editRoleSelect.value = user.role;
      refreshBindingOptions(db, user.role, getAccountCardRef(user));
    }

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
    editingUser = null;
    modalEdit.classList.remove('opacity-100', 'pointer-events-auto');
    modalEdit.classList.add('opacity-0', 'pointer-events-none');
    if (modalEditDialog) {
      modalEditDialog.classList.remove('scale-100');
      modalEditDialog.classList.add('scale-95');
    }
  }

  const editRoleSelect = document.getElementById('select-edit-role');
  if (editRoleSelect) {
    editRoleSelect.addEventListener('change', () => {
      refreshBindingOptions(getDB(), editRoleSelect.value, null);
    });
  }

  const unlinkBtn = document.getElementById('btn-unlink-account');
  if (unlinkBtn) {
    unlinkBtn.addEventListener('click', () => {
      const bindingSelect = document.getElementById('select-edit-binding');
      if (bindingSelect) bindingSelect.value = '';
      unlinkBtn.disabled = true;
    });
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

      if (newRole !== 'admin') {
        const bindingValue = (document.getElementById('select-edit-binding') || {}).value || '';
        const bindingRes = setAccountBinding(editingUserId, bindingValue ? { cardId: bindingValue } : null);
        if (!bindingRes.success) {
          showEditError(bindingRes.error);
          return;
        }
        closeEditModal();
        refreshRowInPlace(editingUserId);
        showToast(bindingRes.message);
        return;
      }

      closeEditModal();
      refreshRowInPlace(editingUserId);
      showToast(res.message);
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
  state.searchQuery = (params.get('search') || '').trim();
  state.filterRole = params.get('role') || 'all';
  state.page = parseInt(params.get('page') || '1', 10) || 1;

  renderTableArea();
  updateSubtitle();
}
