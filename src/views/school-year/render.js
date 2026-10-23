import { escapeHtml, findUpcomingVacation, formatDateRu, getDurationText, renderQuartersTableHtml, renderVacationsGridHtml, renderYearTabsHtml } from './helpers.js';

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

