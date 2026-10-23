import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";
import {
  addWorkloadRow,
  getDB,
  getWorkloadRows,
  removeWorkloadRow,
  updateWorkloadRow,
} from "../../services/storage.js";
import { getActiveAcademicYear } from "../../services/school-year.js";
import { getClassDirectory } from "../../services/directories.js";
import {
  escapeHtml,
  pluralizeClasses,
  pluralizeHours,
  pluralizeRows,
  pluralizeTeachers,
  filterWorkloadRows,
} from "./helpers.js";

export function renderWorkloadView(options = {}) {
  const db = getDB();
  const activeYear = getActiveAcademicYear(db);
  const allRows = getWorkloadRows(db);
  const classes = getClassDirectory(db);
  const subjects = db.subjects || [];
  const teachers = db.teachers || [];

  const searchQuery = (options.searchQuery || "").trim();
  const filterSubject = options.filterSubject || "all";
  const filterClass = options.filterClass || "all";

  const rows = filterWorkloadRows(allRows, {
    searchQuery,
    filterSubject,
    filterClass,
  });

  const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);
  const teacherCount = new Set(rows.map((r) => r.teacherId)).size;
  const classCount = new Set(rows.map((r) => r.classId)).size;

  return `
    <div id="workload-view" class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Нагрузка</h1>
          <p class="text-sm font-medium text-slate-500 mt-1" id="workload-total-subtitle">
            ${rows.length} ${pluralizeRows(rows.length)} · ${teacherCount} ${pluralizeTeachers(teacherCount)} · в ${classCount} ${pluralizeClasses(classCount)} · ${totalHours} ${pluralizeHours(totalHours)} в неделю
          </p>
        </div>

        <div class="flex items-center space-x-2.5">
          <span class="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100/90 text-slate-700 text-xs font-semibold border border-slate-200/80" id="badge-workload-academic-year">
            ${renderIcon("calendar", "w-3.5 h-3.5 text-slate-500")}
            <span>${escapeHtml(activeYear ? activeYear.name : "2024/2025")}</span>
          </span>
          <button type="button" id="btn-open-add-workload"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon("plus", "w-4 h-4")}
            <span>Назначить нагрузку</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Часов в неделю</div>
          <div class="text-2xl font-bold text-slate-900" id="workload-stat-hours">${totalHours}</div>
        </div>
        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Учителей</div>
          <div class="text-2xl font-bold text-slate-900" id="workload-stat-teachers">${teacherCount}</div>
        </div>
        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Классов</div>
          <div class="text-2xl font-bold text-slate-900" id="workload-stat-classes">${classCount}</div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("search", "w-4 h-4")}
          </div>
          <input type="text" id="input-workload-search" value="${escapeHtml(searchQuery)}"
                 placeholder="Поиск по учителю или предмету..."
                 autocomplete="off"
                 style="padding-left: 2.75rem; padding-right: 2.25rem;"
                 class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
          <button type="button" id="btn-clear-workload-search" title="Очистить поиск"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? "" : "hidden"} cursor-pointer">
            ${renderIcon("x", "w-3.5 h-3.5")}
          </button>
        </div>

        <div class="relative md:ml-auto">
          <select id="select-workload-subject"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-52">
            <option value="all" ${filterSubject === "all" ? "selected" : ""}>Все предметы</option>
            ${subjects.map((s) => `<option value="${escapeHtml(s.id)}" ${filterSubject === s.id ? "selected" : ""}>${escapeHtml(s.shortName || s.name)}</option>`).join("")}
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("chevron-down", "w-4 h-4")}
          </div>
        </div>

        <div class="relative">
          <select id="select-workload-class"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-40">
            <option value="all" ${filterClass === "all" ? "selected" : ""}>Все классы</option>
            ${classes.map((c) => `<option value="${escapeHtml(c.id)}" ${filterClass === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("chevron-down", "w-4 h-4")}
          </div>
        </div>
      </div>

      <div id="workload-table-area"></div>

      <div id="modal-workload" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-workload-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900" id="workload-modal-title">Назначить нагрузку</h3>
            <button type="button" data-action="close-workload-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Учитель, предмет и класс — по одному назначению.</p>

          <div class="space-y-3.5">
            <div>
              <label for="select-workload-teacher" class="block text-xs font-semibold text-slate-700 mb-1.5">Учитель</label>
              <div class="relative">
                <select id="select-workload-teacher"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  <option value="">Выберите учителя</option>
                  ${teachers.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.fullName)}</option>`).join("")}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div>
              <label for="select-workload-subject-modal" class="block text-xs font-semibold text-slate-700 mb-1.5">Предмет</label>
              <div class="relative">
                <select id="select-workload-subject-modal"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  <option value="">Выберите предмет</option>
                  ${subjects.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("")}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div>
              <label for="select-workload-class-modal" class="block text-xs font-semibold text-slate-700 mb-1.5">Класс</label>
              <div class="relative">
                <select id="select-workload-class-modal"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  <option value="">Выберите класс</option>
                  ${classes.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("")}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div>
              <label for="input-workload-hours" class="block text-xs font-semibold text-slate-700 mb-1.5">Часов в неделю</label>
              <input type="number" id="input-workload-hours" min="1" max="40" step="1" value="3"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            </div>
          </div>

          <div id="workload-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-workload-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-workload"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Сохранить</button>
          </div>
        </div>
      </div>

      <div id="workload-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="workload-toast-icon">${renderIcon("check", "w-4 h-4 text-emerald-400")}</span>
        <span id="workload-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}

export function workloadTableHtml(rows) {
  if (!rows.length) {
    return `
      <div class="py-14 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
          ${renderIcon("briefcase", "w-7 h-7")}
        </div>
        <h2 class="text-base font-bold text-slate-900 mb-1">Нагрузка не назначена</h2>
        <p class="text-xs text-slate-500">Назначьте учителю предмет и класс — строка появится в матрице.</p>
      </div>
    `;
  }

  const bodyRows = rows
    .map(
      (row) => `
    <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors" data-workload-row="${escapeHtml(row.id)}">
      <td class="py-3 pl-4 pr-3">
        <div class="text-xs font-bold text-slate-900">${escapeHtml(row.teacherName)}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(row.teacherShortName)}</div>
      </td>
      <td class="px-3 py-3">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/70">
          ${escapeHtml(row.subjectLabel)}
        </span>
      </td>
      <td class="px-3 py-3">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
          ${escapeHtml(row.className)}
        </span>
      </td>
      <td class="px-3 py-3 text-right">
        <span class="text-sm font-bold text-slate-900">${row.hours}</span>
        <span class="text-[11px] text-slate-400 ml-1">ч</span>
      </td>
      <td class="py-3 pl-3 pr-4 text-right whitespace-nowrap">
        <button type="button" data-action="edit-workload" data-row-id="${escapeHtml(row.id)}"
                class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer">Изменить</button>
        <button type="button" data-action="remove-workload" data-row-id="${escapeHtml(row.id)}"
                class="ml-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer">Снять</button>
      </td>
    </tr>
  `,
    )
    .join("");

  return `
    <div class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <th class="py-3 pl-4 pr-3 text-left">Учитель</th>
            <th class="px-3 py-3 text-left">Предмет</th>
            <th class="px-3 py-3 text-left">Класс</th>
            <th class="px-3 py-3 text-right">Часов в неделю</th>
            <th class="py-3 pl-3 pr-4 text-right">Действия</th>
          </tr>
        </thead>
        <tbody id="workload-table-body">${bodyRows}</tbody>
      </table>
    </div>
  `;
}
