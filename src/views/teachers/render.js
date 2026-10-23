import { getDB, createTeacherCard, updateTeacherCard, deleteTeacherCard } from '../../services/storage.js';
import { renderIcon } from '../../components/icons.js';
import { replaceUrl } from '../../services/navigation.js';
import { escapeHtml, getInitials, getTeacherCards } from './helpers.js';

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

        <div>
          <button type="button" id="btn-open-create-teacher"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon('user-plus', 'w-4 h-4')}
            <span>Создать карточку учителя</span>
          </button>
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

      <div id="modal-teacher-card" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-teacher-card-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900" id="teacher-card-modal-title">Создать карточку учителя</h3>
            <button type="button" data-action="close-teacher-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Учебная нагрузка назначается в разделе «Нагрузка».</p>

          <div class="space-y-3.5">
            <div>
              <label for="input-teacher-name" class="block text-xs font-semibold text-slate-700 mb-1.5">ФИО учителя</label>
              <input type="text" id="input-teacher-name" placeholder="Например: Иванова Елена Сергеевна"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>

            <div>
              <label for="teacher-subjects" class="block text-xs font-semibold text-slate-700 mb-1.5">Предметы</label>
              <div id="teacher-subjects" class="flex flex-wrap gap-1.5"></div>
              <p class="text-[11px] text-slate-400 mt-1">Отметьте предметы, которые преподаёт учитель.</p>
            </div>

            <div>
              <label for="select-teacher-homeroom" class="block text-xs font-semibold text-slate-700 mb-1.5">Классное руководство</label>
              <div class="relative">
                <select id="select-teacher-homeroom"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
            </div>

            <div>
              <label for="select-teacher-account" class="block text-xs font-semibold text-slate-700 mb-1.5">Учётная запись</label>
              <div class="relative">
                <select id="select-teacher-account"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
            </div>

            <div>
              <label for="select-teacher-status" class="block text-xs font-semibold text-slate-700 mb-1.5">Статус</label>
              <div class="relative">
                <select id="select-teacher-status"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  <option value="active">Работает</option>
                  <option value="archived">В архиве</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
            </div>
          </div>

          <div id="teacher-card-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-teacher-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-teacher-card"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Сохранить</button>
          </div>
        </div>
      </div>

      <div id="teachers-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="teachers-toast-icon">${renderIcon('check', 'w-4 h-4 text-emerald-400')}</span>
        <span id="teachers-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}

export function teacherCardHtml(card) {
  const { teacher, account, workload, totalHours, classNames } = card;

  const statusBadge = teacher.status === 'active'
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Работает</span>`
    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">В архиве</span>`;

  const accountBlock = account
    ? `<a href="/accounts?search=${encodeURIComponent(account.username)}" data-action="open-account" data-login="${escapeHtml(account.username)}"
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
        <a href="/accounts" data-action="create-account" class="flex-shrink-0 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline whitespace-nowrap">Создать</a>
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
        <div class="flex items-center space-x-2">
          <button type="button" data-action="toggle-workload" data-teacher-id="${teacher.id}"
                  class="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 cursor-pointer">
            <span>Нагрузка по предметам</span>
            <span class="text-slate-400">${renderIcon('chevron-down', 'w-4 h-4')}</span>
          </button>
          <button type="button" data-action="edit-teacher" data-teacher-id="${teacher.id}" title="Изменить карточку учителя"
                  class="px-3 py-2.5 rounded-xl border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors text-xs font-semibold cursor-pointer">Изменить</button>
          <button type="button" data-action="delete-teacher" data-teacher-id="${teacher.id}" title="Удалить карточку учителя"
                  class="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors text-xs font-semibold cursor-pointer">Удалить</button>
        </div>
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
        <a href="/workload" data-action="open-workload"
           class="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline">
          Перейти в раздел «Нагрузка»
          ${renderIcon('arrow-right', 'w-3.5 h-3.5')}
        </a>
      </div>
    </article>
  `;
}
