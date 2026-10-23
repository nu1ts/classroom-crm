import { getDB, createTeacherCard, updateTeacherCard, deleteTeacherCard } from '../../services/storage.js';
import { renderIcon } from '../../components/icons.js';
import { replaceUrl } from '../../services/navigation.js';
import { escapeHtml, getTeacherCards } from './helpers.js';
import { teacherCardHtml } from './render.js';

export function setupTeachersListeners(onNavigate) {
  const state = {
    searchQuery: '',
    filterSubject: 'all',
    filterAccount: 'all'
  };

  const cardsArea = document.getElementById('teachers-cards-area');
  const subtitle = document.getElementById('teachers-total-subtitle');
  const toast = document.getElementById('teachers-toast');
  const toastMessage = document.getElementById('teachers-toast-message');

  function showToast(msg, isError = false) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    const icon = document.getElementById('teachers-toast-icon');
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
    if (state.filterSubject !== 'all') params.set('subject', state.filterSubject);
    if (state.filterAccount !== 'all') params.set('account', state.filterAccount);
    const queryStr = params.toString();
    replaceUrl(queryStr ? `/teachers?${queryStr}` : '/teachers');
  }

  function renderCards() {
    if (!cardsArea) return;
    const cards = getTeacherCards();
    const q = state.searchQuery.toLowerCase();

    const filtered = cards.filter(card => {
      if (state.filterSubject !== 'all' && !card.subjectLabels.includes(state.filterSubject)) return false;
      if (state.filterAccount === 'linked' && !card.account) return false;
      if (state.filterAccount === 'unlinked' && card.account) return false;
      if (q) {
        const name = card.teacher.fullName.toLowerCase();
        const short = card.teacher.shortName.toLowerCase();
        const subjects = card.subjectLabels.join(' ').toLowerCase();
        if (!name.includes(q) && !short.includes(q) && !subjects.includes(q)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      cardsArea.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 py-12 text-center">
          <div class="text-sm font-medium text-slate-500">Ничего не найдено</div>
          <div class="text-xs text-slate-400 mt-1">Измените условия поиска или фильтры</div>
        </div>
      `;
      return;
    }

    cardsArea.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        ${filtered.map(teacherCardHtml).join('')}
      </div>
    `;
  }

  function updateSubtitle() {
    if (!subtitle) return;
    const cards = getTeacherCards();
    const withAccount = cards.filter(c => c.account).length;
    const totalHours = cards.reduce((s, c) => s + c.totalHours, 0);
    subtitle.textContent = `${cards.length} учителей · ${withAccount} с учётной записью · ${totalHours} часов нагрузки`;
  }

  const searchInput = document.getElementById('input-teachers-search');
  const clearSearchBtn = document.getElementById('btn-clear-teachers-search');
  const subjectSelect = document.getElementById('select-teachers-subject');
  const accountSelect = document.getElementById('select-teachers-account');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value.trim();
      state.page = 1;
      if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      syncRoute();
      renderCards();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
      syncRoute();
      renderCards();
      if (searchInput) searchInput.focus();
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener('change', () => {
      state.filterSubject = subjectSelect.value;
      syncRoute();
      renderCards();
    });
  }

  if (accountSelect) {
    accountSelect.addEventListener('change', () => {
      state.filterAccount = accountSelect.value;
      syncRoute();
      renderCards();
    });
  }

  const viewRoot = document.getElementById('teachers-view');
  viewRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'toggle-workload') {
      const teacherId = btn.getAttribute('data-teacher-id');
      const panel = document.querySelector(`[data-workload-panel="${teacherId}"]`);
      if (panel) {
        panel.classList.toggle('hidden');
        const icon = btn.querySelector('span:last-child');
        if (icon) icon.classList.toggle('rotate-180');
      }
    }

    if (action === 'open-account' || action === 'create-account' || action === 'open-workload') {
      if (onNavigate) {
        e.preventDefault();
        onNavigate(btn.getAttribute('href'));
      }
    }

    if (action === 'edit-teacher') {
      openTeacherModal(btn.getAttribute('data-teacher-id'));
    }

    if (action === 'delete-teacher') {
      deleteTeacher(btn.getAttribute('data-teacher-id'));
    }

    if (action === 'close-teacher-modal') {
      closeTeacherModal();
    }
  });

  const modalTeacher = document.getElementById('modal-teacher-card');
  const modalTeacherDialog = document.getElementById('modal-teacher-card-dialog');
  const teacherCardError = document.getElementById('teacher-card-error');
  let editingTeacherId = null;

  function showTeacherError(msg) {
    if (!teacherCardError) return;
    if (msg) {
      teacherCardError.textContent = msg;
      teacherCardError.classList.remove('hidden');
    } else {
      teacherCardError.classList.add('hidden');
    }
  }

  function fillSubjectOptions(selectedIds) {
    const box = document.getElementById('teacher-subjects');
    if (!box) return;
    const subjects = (getDB().subjects || []);
    box.innerHTML = subjects.map(s => `
      <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
        <input type="checkbox" value="${escapeHtml(s.id)}" ${selectedIds.includes(s.id) ? 'checked' : ''}
               class="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500/30 cursor-pointer" />
        <span class="text-[11px] font-medium text-slate-700">${escapeHtml(s.shortName || s.name)}</span>
      </label>
    `).join('');
  }

  function fillHomeroomOptions(selectedId) {
    const select = document.getElementById('select-teacher-homeroom');
    if (!select) return;
    const db = getDB();
    const classNameById = {};
    (db.teachers || []).forEach(t => {
      (t.workload || []).forEach(w => { if (w.classId) classNameById[w.classId] = w.className; });
    });
    if (db.meta && db.meta.classId) classNameById[db.meta.classId] = db.meta.className || '7Б';

    select.innerHTML = [
      '<option value="">Не назначен</option>',
      ...Object.entries(classNameById).map(([id, name]) =>
        `<option value="${escapeHtml(id)}" ${selectedId === id ? 'selected' : ''}>${escapeHtml(name)}</option>`
      )
    ].join('');
    select.value = selectedId || '';
  }

  function fillAccountOptions(selectedId) {
    const select = document.getElementById('select-teacher-account');
    if (!select) return;
    const db = getDB();
    const teacherAccounts = (db.users || []).filter(u => u.role === 'teacher' || u.role === 'subject_teacher');
    select.innerHTML = [
      '<option value="">Без учётной записи</option>',
      ...teacherAccounts.map(u =>
        `<option value="${escapeHtml(u.id)}" ${selectedId === u.id ? 'selected' : ''}>${escapeHtml(u.username)}</option>`
      )
    ].join('');
    select.value = selectedId || '';
  }

  function openTeacherModal(teacherId) {
    if (!modalTeacher) return;
    editingTeacherId = teacherId || null;
    showTeacherError('');

    const titleEl = document.getElementById('teacher-card-modal-title');
    const teacher = teacherId
      ? (getDB().teachers || []).find(t => t.id === teacherId)
      : null;

    if (titleEl) titleEl.textContent = teacher ? 'Изменить карточку учителя' : 'Создать карточку учителя';

    const nameInput = document.getElementById('input-teacher-name');
    if (nameInput) nameInput.value = teacher ? teacher.fullName : '';

    fillSubjectOptions(teacher ? (teacher.subjectIds || []) : []);
    fillHomeroomOptions(teacher ? teacher.homeroomClassId : null);
    fillAccountOptions(teacher ? teacher.accountUserId : null);

    const statusSelect = document.getElementById('select-teacher-status');
    if (statusSelect) statusSelect.value = teacher && teacher.status === 'archived' ? 'archived' : 'active';

    modalTeacher.classList.remove('opacity-0', 'pointer-events-none');
    modalTeacher.classList.add('opacity-100', 'pointer-events-auto');
    if (modalTeacherDialog) {
      modalTeacherDialog.classList.remove('scale-95');
      modalTeacherDialog.classList.add('scale-100');
    }
    if (nameInput) nameInput.focus();
  }

  function closeTeacherModal() {
    if (!modalTeacher) return;
    editingTeacherId = null;
    modalTeacher.classList.remove('opacity-100', 'pointer-events-auto');
    modalTeacher.classList.add('opacity-0', 'pointer-events-none');
    if (modalTeacherDialog) {
      modalTeacherDialog.classList.remove('scale-100');
      modalTeacherDialog.classList.add('scale-95');
    }
  }

  function deleteTeacher(teacherId) {
    const teacher = (getDB().teachers || []).find(t => t.id === teacherId);
    if (!teacher) return;
    const res = deleteTeacherCard(teacherId);
    if (!res.success) {
      showToast(res.error, true);
      return;
    }
    renderCards();
    updateSubtitle();
    showToast(res.message);
  }

  const openCreateTeacherBtn = document.getElementById('btn-open-create-teacher');
  if (openCreateTeacherBtn) openCreateTeacherBtn.addEventListener('click', () => openTeacherModal(null));

  const submitTeacherBtn = document.getElementById('btn-submit-teacher-card');
  if (submitTeacherBtn) {
    submitTeacherBtn.addEventListener('click', () => {
      const fullName = (document.getElementById('input-teacher-name') || {}).value || '';
      const subjectIds = Array.from(document.querySelectorAll('#teacher-subjects input[type="checkbox"]:checked')).map(i => i.value);
      const homeroomClassId = (document.getElementById('select-teacher-homeroom') || {}).value || '';
      const accountUserId = (document.getElementById('select-teacher-account') || {}).value || '';
      const status = (document.getElementById('select-teacher-status') || {}).value || 'active';

      const payload = {
        fullName,
        subjectIds,
        homeroomClassId: homeroomClassId || null,
        accountUserId: accountUserId || null,
        status
      };

      const res = editingTeacherId
        ? updateTeacherCard(editingTeacherId, payload)
        : createTeacherCard(payload);

      if (!res.success) {
        showTeacherError(res.error);
        return;
      }

      closeTeacherModal();
      renderCards();
      updateSubtitle();
      showToast(res.message);
    });
  }

  if (modalTeacher) {
    modalTeacher.addEventListener('click', (e) => {
      if (e.target === modalTeacher) closeTeacherModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalTeacher && !modalTeacher.classList.contains('pointer-events-none')) {
      closeTeacherModal();
    }
  });

  const params = readParams();
  state.searchQuery = (params.get('search') || '').trim();
  state.filterSubject = params.get('subject') || 'all';
  state.filterAccount = params.get('account') || 'all';

  if (searchInput) {
    searchInput.value = state.searchQuery;
    if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
  }
  if (subjectSelect) subjectSelect.value = state.filterSubject;
  if (accountSelect) accountSelect.value = state.filterAccount;

  renderCards();
  updateSubtitle();
}
