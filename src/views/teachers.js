import { getDB } from '../services/storage.js';
import { renderIcon } from '../components/icons.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getInitials(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  if (parts.length < 2) return (fullName || 'УЧ').slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getTeacherCards(db = getDB()) {
  const users = db.users || [];
  const teachers = db.teachers || [];

  return teachers.map(teacher => {
    const account = teacher.accountUserId
      ? users.find(u => u.id === teacher.accountUserId)
      : users.find(u => (u.cardName || u.shortName) === teacher.shortName);

    const workload = (teacher.workload || []).map(w => ({
      className: w.className,
      subjectLabel: w.subjectLabel,
      hours: w.hours
    }));

    const totalHours = workload.reduce((sum, w) => sum + (w.hours || 0), 0);
    const classNames = [...new Set(workload.map(w => w.className))];

    return {
      teacher,
      account: account || null,
      accountLogin: account ? account.username : null,
      accountStatus: account ? account.status : null,
      workload,
      totalHours,
      classNames,
      subjectLabels: [...new Set((teacher.subjectIds || []).map(id => {
        const subject = (db.subjects || []).find(s => s.id === id);
        return subject ? subject.shortName : id;
      }))]
    };
  });
}

export function renderTeachersView(options = {}) {
  const db = getDB();
  const cards = getTeacherCards(db);

  const searchQuery = (options.searchQuery || '').trim();
  const filterSubject = options.filterSubject || 'all';
  const filterAccount = options.filterAccount || 'all';

  const subjectOptions = [...new Set(cards.flatMap(c => c.subjectLabels))].sort();
  const withAccount = cards.filter(c => c.account).length;

  return `
    <div id="teachers-view" class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Учителя</h1>
          <p class="text-sm font-medium text-slate-500 mt-1" id="teachers-total-subtitle">
            ${cards.length} учителей · ${withAccount} с учётной записью · ${cards.reduce((s, c) => s + c.totalHours, 0)} часов нагрузки
          </p>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('search', 'w-4 h-4')}
          </div>
          <input type="text" id="input-teachers-search" value="${escapeHtml(searchQuery)}"
                 placeholder="Поиск по ФИО или предмету..."
                 autocomplete="off"
                 style="padding-left: 2.75rem; padding-right: 2.25rem;"
                 class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
          <button type="button" id="btn-clear-teachers-search" title="Очистить поиск"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? '' : 'hidden'} cursor-pointer">
            ${renderIcon('x', 'w-3.5 h-3.5')}
          </button>
        </div>

        <div class="relative md:ml-auto">
          <select id="select-teachers-subject"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-52">
            <option value="all" ${filterSubject === 'all' ? 'selected' : ''}>Все предметы</option>
            ${subjectOptions.map(s => `<option value="${escapeHtml(s)}" ${filterSubject === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('chevron-down', 'w-4 h-4')}
          </div>
        </div>

        <div class="relative">
          <select id="select-teachers-account"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-56">
            <option value="all" ${filterAccount === 'all' ? 'selected' : ''}>Все учётные записи</option>
            <option value="linked" ${filterAccount === 'linked' ? 'selected' : ''}>С учётной записью</option>
            <option value="unlinked" ${filterAccount === 'unlinked' ? 'selected' : ''}>Без учётной записи</option>
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon('chevron-down', 'w-4 h-4')}
          </div>
        </div>
      </div>

      <div id="teachers-cards-area"></div>
    </div>
  `;
}

function teacherCardHtml(card) {
  const { teacher, account, workload, totalHours, classNames } = card;

  const statusBadge = teacher.status === 'active'
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Работает</span>`
    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">В архиве</span>`;

  const accountBlock = account
    ? `<a href="#/accounts?search=${encodeURIComponent(account.username)}" data-action="open-account" data-login="${escapeHtml(account.username)}"
          class="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-brand-50/70 border border-brand-200/70 hover:bg-brand-50 hover:border-brand-300 transition-colors">
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold text-slate-500">Учётная запись</span>
          <span class="block text-xs font-medium text-brand-700 truncate">${escapeHtml(account.username)}</span>
        </span>
        <span class="flex-shrink-0 text-brand-400 group-hover:text-brand-600 transition-colors">
          ${renderIcon('external-link', 'w-4 h-4')}
        </span>
      </a>`
    : `<div class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold text-slate-500">Учётная запись</span>
          <span class="block text-xs font-medium text-amber-700">не создана</span>
        </span>
        <a href="#/accounts" data-action="create-account" class="flex-shrink-0 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline whitespace-nowrap">Создать</a>
      </div>`;

  const workloadRows = workload.map(w => `
    <tr class="border-b border-slate-100 last:border-0">
      <td class="py-2 pl-3 pr-2 text-xs font-semibold text-slate-700">${escapeHtml(w.className)}</td>
      <td class="px-2 py-2 text-xs text-slate-600">${escapeHtml(w.subjectLabel)}</td>
      <td class="py-2 pl-2 pr-3 text-right text-xs font-semibold text-slate-800">${w.hours}</td>
    </tr>
  `).join('');

  return `
    <article class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden flex flex-col" data-teacher-card="${teacher.id}">
      <div class="p-5 flex items-start gap-3.5">
        <div class="w-11 h-11 flex-shrink-0 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center text-sm font-bold">
          ${escapeHtml(getInitials(teacher.fullName))}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-sm font-bold text-slate-900 leading-tight">${escapeHtml(teacher.fullName)}</h2>
            ${statusBadge}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(teacher.shortName)}</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${card.subjectLabels.map(s => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">${escapeHtml(s)}</span>`).join('')}
            ${teacher.homeroomClassId ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-200/70">Классный руководитель</span>` : ''}
          </div>
        </div>
      </div>

      <div class="px-5 pb-4 space-y-2.5">
        <div class="grid grid-cols-2 gap-2.5">
          <div class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500">Нагрузка</div>
            <div class="text-sm font-bold text-slate-800 mt-0.5">${totalHours} ч</div>
          </div>
          <div class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500">Классы</div>
            <div class="text-sm font-bold text-slate-800 mt-0.5">${escapeHtml(classNames.join(', ') || '—')}</div>
          </div>
        </div>
        ${accountBlock}
      </div>

      <div class="px-5 pb-4 mt-auto">
        <button type="button" data-action="toggle-workload" data-teacher-id="${teacher.id}"
                class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 cursor-pointer">
          <span>Нагрузка по предметам</span>
          <span class="text-slate-400">${renderIcon('chevron-down', 'w-4 h-4')}</span>
        </button>
        <div class="hidden mt-2.5 overflow-hidden rounded-xl border border-slate-200" data-workload-panel="${teacher.id}">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th class="py-2 pl-3 pr-2 text-left">Класс</th>
                <th class="px-2 py-2 text-left">Предмет</th>
                <th class="py-2 pl-2 pr-3 text-right">Часов</th>
              </tr>
            </thead>
            <tbody>${workloadRows}</tbody>
          </table>
        </div>
        <a href="#/workload" data-action="open-workload"
           class="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline">
          Перейти в раздел «Нагрузка»
          ${renderIcon('arrow-right', 'w-3.5 h-3.5')}
        </a>
      </div>
    </article>
  `;
}

export function setupTeachersListeners(onNavigate) {
  const state = {
    searchQuery: '',
    filterSubject: 'all',
    filterAccount: 'all'
  };

  const cardsArea = document.getElementById('teachers-cards-area');
  const subtitle = document.getElementById('teachers-total-subtitle');

  function readParams() {
    const hash = window.location.hash || '';
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    return new URLSearchParams(queryString);
  }

  function syncRoute() {
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (state.filterSubject !== 'all') params.set('subject', state.filterSubject);
    if (state.filterAccount !== 'all') params.set('account', state.filterAccount);
    const queryStr = params.toString();
    window.history.replaceState(null, '', queryStr ? `#/teachers?${queryStr}` : '#/teachers');
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
