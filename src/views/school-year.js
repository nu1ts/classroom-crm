import {
  getDB,
  getAcademicYears,
  getActiveAcademicYear,
  setActiveAcademicYear,
  addAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveQuarter,
  updateQuarter,
  updateVacation,
  addVacation,
  deleteVacation
} from '../services/storage.js';
import { renderIcon } from '../components/icons.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateRu(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getDurationText(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '';
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.round((diffDays / 7) * 10) / 10;
  return `${diffDays} дн. (${weeks} нед.)`;
}

function findUpcomingVacation(vacations, todayStr = '2024-10-28') {
  if (!vacations || vacations.length === 0) return null;
  const sorted = [...vacations].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  const currentOrNext = sorted.find(v => (v.endDate || '') >= todayStr);
  return currentOrNext || sorted[0];
}

export function renderYearTabsHtml(years, selectedYearId) {
  return years.map(y => {
    const isSelected = y.id === selectedYearId;
    const isActive = y.isActive;
    return `
      <button type="button" data-year-tab="${escapeHtml(y.id)}"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${isSelected ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
        <span>${escapeHtml(y.name)}</span>
        ${isActive ? `
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Текущий учебный год"></span>
        ` : ''}
      </button>
    `;
  }).join('');
}

export function renderQuartersTableHtml(quarters) {
  if (!quarters || quarters.length === 0) {
    return `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400">Четверти не настроены</td>
      </tr>
    `;
  }
  return quarters.map((q, idx) => {
    const isQActive = !!q.isActive;
    return `
      <tr class="hover:bg-slate-50/60 transition-colors ${isQActive ? 'bg-emerald-50/20' : ''}" data-quarter-row="${escapeHtml(q.id)}">
        <td class="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
          <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">${idx + 1}</span>
          <span class="quarter-name">${escapeHtml(q.name)}</span>
        </td>
        <td class="py-3.5 px-4 font-medium text-slate-800 quarter-dates">
          ${formatDateRu(q.startDate)} – ${formatDateRu(q.endDate)}
        </td>
        <td class="py-3.5 px-4 text-slate-500">
          ${getDurationText(q.startDate, q.endDate)}
        </td>
        <td class="py-3.5 px-4 quarter-status">
          ${isQActive ? `
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ${renderIcon('check', 'w-3 h-3 mr-1 text-emerald-600')}
              Текущая четверть
            </span>
          ` : `
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Неактивна
            </span>
          `}
        </td>
        <td class="py-3.5 px-4 text-right space-x-1">
          ${!isQActive ? `
            <button type="button" data-action="set-active-quarter" data-quarter-id="${escapeHtml(q.id)}"
                    class="px-2.5 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs transition-colors cursor-pointer">
              Сделать текущей
            </button>
          ` : ''}
          <button type="button" data-action="edit-quarter" data-quarter-id="${escapeHtml(q.id)}"
                  data-quarter-name="${escapeHtml(q.name)}" data-start-date="${escapeHtml(q.startDate)}" data-end-date="${escapeHtml(q.endDate)}"
                  class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center space-x-1">
            ${renderIcon('edit', 'w-3.5 h-3.5')}
            <span>Изменить даты</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export function renderVacationsGridHtml(vacations) {
  if (!vacations || vacations.length === 0) {
    return `<div class="col-span-3 py-4 text-center text-xs text-slate-400">Периоды каникул не добавлены</div>`;
  }
  return vacations.map(v => `
    <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between" data-vacation-card="${escapeHtml(v.id)}">
      <div>
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900 text-xs">${escapeHtml(v.name)}</span>
          <button type="button" data-action="delete-vacation" data-vacation-id="${escapeHtml(v.id)}" data-vacation-name="${escapeHtml(v.name)}"
                  class="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer" title="Удалить">
            ${renderIcon('x', 'w-3.5 h-3.5')}
          </button>
        </div>
        <div class="text-xs font-semibold text-slate-700 mt-1.5">
          ${formatDateRu(v.startDate)} – ${formatDateRu(v.endDate)}
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5">
          ${getDurationText(v.startDate, v.endDate)}
        </div>
      </div>
      <div class="mt-3 text-right">
        <button type="button" data-action="edit-vacation" data-vacation-id="${escapeHtml(v.id)}"
                data-vacation-name="${escapeHtml(v.name)}" data-start-date="${escapeHtml(v.startDate)}" data-end-date="${escapeHtml(v.endDate)}"
                class="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
          Редактировать
        </button>
      </div>
    </div>
  `).join('');
}

export function renderSchoolYearView(options = {}) {
  const db = getDB();
  const years = getAcademicYears(db);
  const activeYear = getActiveAcademicYear(db);
  const selectedYearId = options.yearId || (activeYear ? activeYear.id : (years[0] ? years[0].id : null));
  const currentYear = years.find(y => y.id === selectedYearId) || activeYear || years[0] || null;

  const meta = db.meta || {};
  const activePeriod = meta.period || {};
  const quarters = (currentYear && currentYear.quarters) || [];
  const vacations = (currentYear && currentYear.vacations) || [];
  const upcomingVacation = findUpcomingVacation(vacations, meta.demoToday || '2024-10-28');

  return `
    <div id="school-year-view" class="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto" data-selected-year-id="${escapeHtml(currentYear ? currentYear.id : '')}">
      
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Учебный год</h1>
          <p class="text-sm font-medium text-slate-500 mt-1">
            Настройка учебных периодов, четвертей и каникул образовательного учреждения
          </p>
        </div>

        <div>
          <button type="button" id="btn-open-add-year"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon('plus', 'w-4 h-4')}
            <span>Добавить учебный год</span>
          </button>
        </div>
      </div>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5" id="kpis-container">
        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Текущий учебный год</span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Активен
            </span>
          </div>
          <div class="mt-2.5">
            <div class="text-xl font-bold text-slate-900 tracking-tight" id="kpi-active-year-name">
              ${escapeHtml(activeYear ? activeYear.name : 'Не выбран')}
            </div>
            <div class="text-xs font-medium text-slate-500 mt-1" id="kpi-active-year-dates">
              ${activeYear ? `${formatDateRu(activeYear.startDate)} – ${formatDateRu(activeYear.endDate)}` : '—'}
            </div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Текущая четверть</span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Идёт обучение
            </span>
          </div>
          <div class="mt-2.5">
            <div class="text-xl font-bold text-slate-900 tracking-tight" id="kpi-active-quarter-name">
              ${escapeHtml(activePeriod.name || 'I четверть')}
            </div>
            <div class="text-xs font-medium text-slate-500 mt-1" id="kpi-active-quarter-dates">
              ${formatDateRu(activePeriod.startDate)} – ${formatDateRu(activePeriod.endDate)}
            </div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ближайшие каникулы</span>
            ${renderIcon('calendar', 'w-3.5 h-3.5 text-slate-400')}
          </div>
          <div class="mt-2.5">
            <div class="text-xl font-bold text-slate-900 tracking-tight" id="kpi-upcoming-vacation-name">
              ${escapeHtml(upcomingVacation ? upcomingVacation.name : 'Каникулы не запланированы')}
            </div>
            <div class="text-xs font-medium text-slate-500 mt-1" id="kpi-upcoming-vacation-dates">
              ${upcomingVacation ? `${formatDateRu(upcomingVacation.startDate)} – ${formatDateRu(upcomingVacation.endDate)} (${getDurationText(upcomingVacation.startDate, upcomingVacation.endDate)})` : '—'}
            </div>
          </div>
        </div>
      </div>

<div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Учебный год:</span>
            <div class="inline-flex p-1 bg-slate-100/80 rounded-xl space-x-1" id="academic-years-tabs" role="tablist">
              ${renderYearTabsHtml(years, currentYear ? currentYear.id : '')}
            </div>
          </div>

          <div class="flex items-center space-x-2" id="year-actions-container">
            ${currentYear ? `
              <button type="button" id="btn-open-edit-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}" data-year-start="${escapeHtml(currentYear.startDate)}" data-year-end="${escapeHtml(currentYear.endDate)}"
                      class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                      title="Редактировать параметры года">
                ${renderIcon('edit', 'w-3.5 h-3.5')}
                <span>Редактировать год</span>
              </button>
            ` : ''}
            ${currentYear && !currentYear.isActive ? `
              <button type="button" id="btn-set-active-year" data-year-id="${escapeHtml(currentYear.id)}"
                      class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center space-x-1">
                ${renderIcon('check', 'w-3.5 h-3.5')}
                <span>Сделать текущим годом</span>
              </button>
              <button type="button" id="btn-delete-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}"
                      class="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                      title="Удалить учебный год">
                ${renderIcon('trash', 'w-3.5 h-3.5')}
                <span>Удалить год</span>
              </button>
            ` : `
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" id="badge-current-year-active">
                ${renderIcon('check', 'w-3.5 h-3.5 mr-1 text-emerald-600')}
                Текущий учебный год
              </span>
            `}
          </div>
        </div>

<div class="p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Учебные четверти</h3>
              <p class="text-xs text-slate-500">График четвертей для выбранного учебного года. Смена текущей четверти определяет период расчёта журналов и аналитики.</p>
            </div>
          </div>

          <div class="overflow-x-auto rounded-xl border border-slate-200/80">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="py-3 px-4">Четверть</th>
                  <th class="py-3 px-4">Период</th>
                  <th class="py-3 px-4">Длительность</th>
                  <th class="py-3 px-4">Статус</th>
                  <th class="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white" id="quarters-table-body">
                ${renderQuartersTableHtml(quarters)}
              </tbody>
            </table>
          </div>
        </div>

<div class="px-5 pb-5 pt-1 border-t border-slate-100">
          <div class="flex items-center justify-between mb-3 mt-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Каникулы и перерывы</h3>
              <p class="text-xs text-slate-500">Периоды отдыха между четвертями выбранного учебного года.</p>
            </div>
            <button type="button" id="btn-add-vacation"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1">
              ${renderIcon('plus', 'w-3.5 h-3.5')}
              <span>Добавить каникулы</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5" id="vacations-grid">
            ${renderVacationsGridHtml(vacations)}
          </div>
        </div>
      </div>

<div id="school-year-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="school-year-toast-icon">${renderIcon('check', 'w-4 h-4 text-emerald-400')}</span>
        <span id="school-year-toast-message" class="text-xs font-medium"></span>
      </div>

<div id="modal-add-year" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-add-year-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Новый учебный год</h3>
            <button type="button" data-action="close-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Создание нового учебного цикла с автоматической разметкой четвертей и каникул.</p>

          <form id="form-add-year" class="space-y-4">
            <div id="add-year-error" class="hidden text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>

            <div>
              <label for="input-add-year-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Название учебного года</label>
              <input type="text" id="input-add-year-name" placeholder="2025/2026" required
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 text-slate-800" />
              <p class="text-[11px] text-slate-400 mt-1">Формат: ГГГГ/ГГГГ (например, 2025/2026)</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="input-add-year-start" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата начала</label>
                <input type="date" id="input-add-year-start" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
              <div>
                <label for="input-add-year-end" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата окончания</label>
                <input type="date" id="input-add-year-end" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button type="button" data-action="close-modal"
                      class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" id="btn-submit-add-year"
                      class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-edit-year" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-year-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Редактировать учебный год</h3>
            <button type="button" data-action="close-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Изменение названия и общих дат учебного года.</p>

          <form id="form-edit-year" class="space-y-4">
            <input type="hidden" id="edit-year-id" />
            <div id="edit-year-error" class="hidden text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>

            <div>
              <label for="input-edit-year-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Название учебного года</label>
              <input type="text" id="input-edit-year-name" placeholder="2024/2025" required
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 text-slate-800" />
              <p class="text-[11px] text-slate-400 mt-1">Формат: ГГГГ/ГГГГ (например, 2024/2025)</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="input-edit-year-start" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата начала</label>
                <input type="date" id="input-edit-year-start" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
              <div>
                <label for="input-edit-year-end" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата окончания</label>
                <input type="date" id="input-edit-year-end" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button type="button" data-action="close-modal"
                      class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" id="btn-submit-edit-year"
                      class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>

<div id="modal-edit-quarter" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-quarter-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900" id="modal-edit-quarter-title">Изменить четверть</h3>
            <button type="button" data-action="close-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Корректировка диапазона дат учебного периода.</p>

          <form id="form-edit-quarter" class="space-y-4">
            <input type="hidden" id="edit-quarter-id" />
            <div id="edit-quarter-error" class="hidden text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>

            <div>
              <label for="input-edit-quarter-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Название четверти</label>
              <input type="text" id="input-edit-quarter-name" required
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="input-edit-quarter-start" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата начала</label>
                <input type="date" id="input-edit-quarter-start" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
              <div>
                <label for="input-edit-quarter-end" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата окончания</label>
                <input type="date" id="input-edit-quarter-end" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button type="button" data-action="close-modal"
                      class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" id="btn-submit-edit-quarter"
                      class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>

<div id="modal-edit-vacation" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-vacation-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900" id="modal-edit-vacation-title">Каникулы</h3>
            <button type="button" data-action="close-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Настройка дат каникулярного периода.</p>

          <form id="form-edit-vacation" class="space-y-4">
            <input type="hidden" id="edit-vacation-id" />
            <div id="edit-vacation-error" class="hidden text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>

            <div>
              <label for="input-edit-vacation-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Название каникул</label>
              <input type="text" id="input-edit-vacation-name" placeholder="Осенние каникулы" required
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 text-slate-800" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="input-edit-vacation-start" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата начала</label>
                <input type="date" id="input-edit-vacation-start" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
              <div>
                <label for="input-edit-vacation-end" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата окончания</label>
                <input type="date" id="input-edit-vacation-end" required
                       class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-slate-800 cursor-pointer" />
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button type="button" data-action="close-modal"
                      class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" id="btn-submit-edit-vacation"
                      class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

let toastTimer = null;
function showToast(message, isError = false) {
  const toast = document.getElementById('school-year-toast');
  const msgEl = document.getElementById('school-year-toast-message');
  const iconEl = document.getElementById('school-year-toast-icon');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) {
    iconEl.innerHTML = isError
      ? renderIcon('alert', 'w-4 h-4 text-rose-400')
      : renderIcon('check', 'w-4 h-4 text-emerald-400');
  }

  toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
  }, 3200);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  const dialog = document.getElementById(`${modalId}-dialog`);
  if (!modal) return;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.add('opacity-100', 'pointer-events-auto');
  if (dialog) {
    dialog.classList.remove('scale-95');
    dialog.classList.add('scale-100');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const dialog = document.getElementById(`${modalId}-dialog`);
  if (!modal) return;
  modal.classList.remove('opacity-100', 'pointer-events-auto');
  modal.classList.add('opacity-0', 'pointer-events-none');
  if (dialog) {
    dialog.classList.remove('scale-100');
    dialog.classList.add('scale-95');
  }
}

function closeAllModals() {
  ['modal-add-year', 'modal-edit-year', 'modal-edit-quarter', 'modal-edit-vacation'].forEach(id => closeModal(id));
}

export function setupSchoolYearListeners(navigate) {
  const view = document.getElementById('school-year-view');
  if (!view) return;

  function getCurrentSelectedYearId() {
    return view.getAttribute('data-selected-year-id') || null;
  }

  function setCurrentSelectedYearId(id) {
    view.setAttribute('data-selected-year-id', id || '');
  }

  function updateViewData(selectedYearId = null) {
    const db = getDB();
    const years = getAcademicYears(db);
    const activeYear = getActiveAcademicYear(db);
    const effSelectedId = selectedYearId || getCurrentSelectedYearId() || (activeYear ? activeYear.id : (years[0] ? years[0].id : null));
    const currentYear = years.find(y => y.id === effSelectedId) || activeYear || years[0] || null;

    if (currentYear) {
      setCurrentSelectedYearId(currentYear.id);
    }

    const meta = db.meta || {};
    const activePeriod = meta.period || {};
    const quarters = (currentYear && currentYear.quarters) || [];
    const vacations = (currentYear && currentYear.vacations) || [];
    const upcomingVacation = findUpcomingVacation(vacations, meta.demoToday || '2024-10-28');

    const kpiActiveYear = document.getElementById('kpi-active-year-name');
    if (kpiActiveYear) kpiActiveYear.textContent = activeYear ? activeYear.name : 'Не выбран';
    const kpiActiveYearDates = document.getElementById('kpi-active-year-dates');
    if (kpiActiveYearDates) kpiActiveYearDates.textContent = activeYear ? `${formatDateRu(activeYear.startDate)} – ${formatDateRu(activeYear.endDate)}` : '—';

    const kpiQuarterName = document.getElementById('kpi-active-quarter-name');
    if (kpiQuarterName) kpiQuarterName.textContent = activePeriod.name || 'I четверть';
    const kpiQuarterDates = document.getElementById('kpi-active-quarter-dates');
    if (kpiQuarterDates) kpiQuarterDates.textContent = `${formatDateRu(activePeriod.startDate)} – ${formatDateRu(activePeriod.endDate)}`;

    const kpiVacName = document.getElementById('kpi-upcoming-vacation-name');
    if (kpiVacName) kpiVacName.textContent = upcomingVacation ? upcomingVacation.name : 'Каникулы не запланированы';
    const kpiVacDates = document.getElementById('kpi-upcoming-vacation-dates');
    if (kpiVacDates) kpiVacDates.textContent = upcomingVacation ? `${formatDateRu(upcomingVacation.startDate)} – ${formatDateRu(upcomingVacation.endDate)} (${getDurationText(upcomingVacation.startDate, upcomingVacation.endDate)})` : '—';

    const tabsContainer = document.getElementById('academic-years-tabs');
    if (tabsContainer) tabsContainer.innerHTML = renderYearTabsHtml(years, currentYear ? currentYear.id : '');

    const actionsContainer = document.getElementById('year-actions-container');
    if (actionsContainer && currentYear) {
      const editBtnHtml = `
        <button type="button" id="btn-open-edit-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}" data-year-start="${escapeHtml(currentYear.startDate)}" data-year-end="${escapeHtml(currentYear.endDate)}"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                title="Редактировать параметры года">
          ${renderIcon('edit', 'w-3.5 h-3.5')}
          <span>Редактировать год</span>
        </button>
      `;
      if (!currentYear.isActive) {
        actionsContainer.innerHTML = `
          ${editBtnHtml}
          <button type="button" id="btn-set-active-year" data-year-id="${escapeHtml(currentYear.id)}"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center space-x-1">
            ${renderIcon('check', 'w-3.5 h-3.5')}
            <span>Сделать текущим годом</span>
          </button>
          <button type="button" id="btn-delete-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}"
                  class="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                  title="Удалить учебный год">
            ${renderIcon('trash', 'w-3.5 h-3.5')}
            <span>Удалить год</span>
          </button>
        `;
      } else {
        actionsContainer.innerHTML = `
          ${editBtnHtml}
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" id="badge-current-year-active">
            ${renderIcon('check', 'w-3.5 h-3.5 mr-1 text-emerald-600')}
            Текущий учебный год
          </span>
        `;
      }
    }

    const quartersTbody = document.getElementById('quarters-table-body');
    if (quartersTbody) quartersTbody.innerHTML = renderQuartersTableHtml(quarters);

    const vacationsGrid = document.getElementById('vacations-grid');
    if (vacationsGrid) vacationsGrid.innerHTML = renderVacationsGridHtml(vacations);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  }
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);

  ['modal-add-year', 'modal-edit-quarter', 'modal-edit-vacation'].forEach(modalId => {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          closeModal(modalId);
        }
      });
    }
  });

  view.addEventListener('click', (e) => {

    const closeBtn = e.target.closest('[data-action="close-modal"]');
    if (closeBtn) {
      const parentModal = closeBtn.closest('.fixed.inset-0');
      if (parentModal) closeModal(parentModal.id);
      return;
    }

    const tabBtn = e.target.closest('[data-year-tab]');
    if (tabBtn) {
      e.preventDefault();
      const targetYearId = tabBtn.getAttribute('data-year-tab');
      setCurrentSelectedYearId(targetYearId);
      updateViewData(targetYearId);
      return;
    }

    const setActiveYearBtn = e.target.closest('#btn-set-active-year');
    if (setActiveYearBtn) {
      const yearId = setActiveYearBtn.getAttribute('data-year-id');
      const res = setActiveAcademicYear(yearId);
      if (res.success) {
        updateViewData(yearId);
        showToast(`Учебный год «${res.year.name}» назначен текущим`);
      } else {
        showToast(res.error || 'Ошибка смены года', true);
      }
      return;
    }

    const deleteYearBtn = e.target.closest('#btn-delete-year');
    if (deleteYearBtn) {
      const yearId = deleteYearBtn.getAttribute('data-year-id');
      const yearName = deleteYearBtn.getAttribute('data-year-name');
      if (!confirm(`Вы действительно хотите удалить учебный год «${yearName}»?`)) return;

      const res = deleteAcademicYear(yearId);
      if (res.success) {
        updateViewData();
        showToast(`Учебный год «${yearName}» удалён`);
      } else {
        showToast(res.error || 'Ошибка удаления года', true);
      }
      return;
    }

    const openAddYearBtn = e.target.closest('#btn-open-add-year');
    if (openAddYearBtn) {
      const errEl = document.getElementById('add-year-error');
      if (errEl) errEl.classList.add('hidden');
      const form = document.getElementById('form-add-year');
      if (form) form.reset();
      openModal('modal-add-year');
      return;
    }

    const openEditYearBtn = e.target.closest('#btn-open-edit-year');
    if (openEditYearBtn) {
      const yearId = openEditYearBtn.getAttribute('data-year-id');
      const yearName = openEditYearBtn.getAttribute('data-year-name');
      const yearStart = openEditYearBtn.getAttribute('data-year-start');
      const yearEnd = openEditYearBtn.getAttribute('data-year-end');

      const idEl = document.getElementById('edit-year-id');
      const nameEl = document.getElementById('input-edit-year-name');
      const startEl = document.getElementById('input-edit-year-start');
      const endEl = document.getElementById('input-edit-year-end');
      const errEl = document.getElementById('edit-year-error');

      if (idEl) idEl.value = yearId;
      if (nameEl) nameEl.value = yearName;
      if (startEl) startEl.value = yearStart;
      if (endEl) endEl.value = yearEnd;
      if (errEl) errEl.classList.add('hidden');

      openModal('modal-edit-year');
      return;
    }

    const setQuarterBtn = e.target.closest('[data-action="set-active-quarter"]');
    if (setQuarterBtn) {
      const quarterId = setQuarterBtn.getAttribute('data-quarter-id');
      const curYearId = getCurrentSelectedYearId();
      const res = setActiveQuarter(curYearId, quarterId);
      if (res.success) {
        updateViewData(curYearId);
        showToast(`Текущей четвертью назначена «${res.quarter.name}»`);
      } else {
        showToast(res.error || 'Ошибка смены четверти', true);
      }
      return;
    }

    const editQuarterBtn = e.target.closest('[data-action="edit-quarter"]');
    if (editQuarterBtn) {
      const quarterId = editQuarterBtn.getAttribute('data-quarter-id');
      const quarterName = editQuarterBtn.getAttribute('data-quarter-name');
      const startDate = editQuarterBtn.getAttribute('data-start-date');
      const endDate = editQuarterBtn.getAttribute('data-end-date');

      const idEl = document.getElementById('edit-quarter-id');
      const nameEl = document.getElementById('input-edit-quarter-name');
      const startEl = document.getElementById('input-edit-quarter-start');
      const endEl = document.getElementById('input-edit-quarter-end');
      const errEl = document.getElementById('edit-quarter-error');

      if (idEl) idEl.value = quarterId;
      if (nameEl) nameEl.value = quarterName;
      if (startEl) startEl.value = startDate;
      if (endEl) endEl.value = endDate;
      if (errEl) errEl.classList.add('hidden');

      openModal('modal-edit-quarter');
      return;
    }

    const addVacBtn = e.target.closest('#btn-add-vacation');
    if (addVacBtn) {
      const idEl = document.getElementById('edit-vacation-id');
      const titleEl = document.getElementById('modal-edit-vacation-title');
      const form = document.getElementById('form-edit-vacation');
      const errEl = document.getElementById('edit-vacation-error');

      if (idEl) idEl.value = '';
      if (titleEl) titleEl.textContent = 'Добавление каникул';
      if (form) form.reset();
      if (errEl) errEl.classList.add('hidden');

      openModal('modal-edit-vacation');
      return;
    }

    const editVacBtn = e.target.closest('[data-action="edit-vacation"]');
    if (editVacBtn) {
      const id = editVacBtn.getAttribute('data-vacation-id');
      const name = editVacBtn.getAttribute('data-vacation-name');
      const start = editVacBtn.getAttribute('data-start-date');
      const end = editVacBtn.getAttribute('data-end-date');

      const idEl = document.getElementById('edit-vacation-id');
      const titleEl = document.getElementById('modal-edit-vacation-title');
      const nameEl = document.getElementById('input-edit-vacation-name');
      const startEl = document.getElementById('input-edit-vacation-start');
      const endEl = document.getElementById('input-edit-vacation-end');
      const errEl = document.getElementById('edit-vacation-error');

      if (idEl) idEl.value = id;
      if (titleEl) titleEl.textContent = 'Редактирование каникул';
      if (nameEl) nameEl.value = name;
      if (startEl) startEl.value = start;
      if (endEl) endEl.value = end;
      if (errEl) errEl.classList.add('hidden');

      openModal('modal-edit-vacation');
      return;
    }

    const delVacBtn = e.target.closest('[data-action="delete-vacation"]');
    if (delVacBtn) {
      const id = delVacBtn.getAttribute('data-vacation-id');
      const name = delVacBtn.getAttribute('data-vacation-name');
      if (!confirm(`Удалить каникулы «${name}»?`)) return;

      const curYearId = getCurrentSelectedYearId();
      const res = deleteVacation(curYearId, id);
      if (res.success) {
        updateViewData(curYearId);
        showToast(`Каникулы «${name}» удалены`);
      }
      return;
    }
  });

  const formAddYear = document.getElementById('form-add-year');
  if (formAddYear) {
    formAddYear.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-add-year-name')?.value || '').trim();
      const startDate = document.getElementById('input-add-year-start')?.value || '';
      const endDate = document.getElementById('input-add-year-end')?.value || '';
      const errEl = document.getElementById('add-year-error');

      const res = addAcademicYear({ name, startDate, endDate });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove('hidden');
        }
        return;
      }

      closeModal('modal-add-year');
      updateViewData(res.year.id);
      showToast(`Учебный год «${res.year.name}» успешно создан`);
    });
  }

  const formEditYear = document.getElementById('form-edit-year');
  if (formEditYear) {
    formEditYear.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = (document.getElementById('edit-year-id')?.value || '').trim();
      const name = (document.getElementById('input-edit-year-name')?.value || '').trim();
      const startDate = document.getElementById('input-edit-year-start')?.value || '';
      const endDate = document.getElementById('input-edit-year-end')?.value || '';
      const errEl = document.getElementById('edit-year-error');

      const res = updateAcademicYear(id, { name, startDate, endDate });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error || 'Ошибка обновления';
          errEl.classList.remove('hidden');
        }
        return;
      }

      closeModal('modal-edit-year');
      updateViewData(res.year.id);
      showToast(`Учебный год «${res.year.name}» успешно обновлен`);
    });
  }

  const formEditQuarter = document.getElementById('form-edit-quarter');
  if (formEditQuarter) {
    formEditQuarter.addEventListener('submit', (e) => {
      e.preventDefault();
      const quarterId = document.getElementById('edit-quarter-id')?.value;
      const name = document.getElementById('input-edit-quarter-name')?.value || '';
      const startDate = document.getElementById('input-edit-quarter-start')?.value || '';
      const endDate = document.getElementById('input-edit-quarter-end')?.value || '';
      const errEl = document.getElementById('edit-quarter-error');

      const curYearId = getCurrentSelectedYearId();
      const res = updateQuarter(curYearId, quarterId, { name, startDate, endDate });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove('hidden');
        }
        return;
      }

      closeModal('modal-edit-quarter');
      updateViewData(curYearId);
      showToast(`Даты четверти «${res.quarter.name}» обновлены`);
    });
  }

  const formVac = document.getElementById('form-edit-vacation');
  if (formVac) {
    formVac.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-vacation-id')?.value;
      const name = document.getElementById('input-edit-vacation-name')?.value || '';
      const startDate = document.getElementById('input-edit-vacation-start')?.value || '';
      const endDate = document.getElementById('input-edit-vacation-end')?.value || '';
      const errEl = document.getElementById('edit-vacation-error');

      const curYearId = getCurrentSelectedYearId();
      let res;
      if (id) {
        res = updateVacation(curYearId, id, { name, startDate, endDate });
      } else {
        res = addVacation(curYearId, { name, startDate, endDate });
      }

      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove('hidden');
        }
        return;
      }

      closeModal('modal-edit-vacation');
      updateViewData(curYearId);
      showToast(`Каникулы «${name}» сохранены`);
    });
  }
}
