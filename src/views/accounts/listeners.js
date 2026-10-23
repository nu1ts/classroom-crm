import { PAGE_SIZE, escapeHtml, formatLastLogin, getBindingLabel, getCardOptions, roleBadgeHtml, statusBadgeHtml, toggleStatusButtonHtml } from './helpers.js';

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
    const queryString = window.location.search || '';
    return new URLSearchParams(queryString);
  }

  function syncRoute() {
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (state.filterRole && state.filterRole !== 'all') params.set('role', state.filterRole);
    if (state.page > 1) params.set('page', String(state.page));
    const queryStr = params.toString();
    replaceUrl(queryStr ? `/accounts?${queryStr}` : '/accounts');
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
