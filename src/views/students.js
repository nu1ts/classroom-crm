/**
 * Модуль представления страницы «Список учеников» (7Б класс)
 * Реализует требования ТЗ и тест-кейсы TC-OV-01..11:
 * - Таблица учеников 7Б: ФИО, статус, посещаемость за период, средний балл (сходится со сводкой), родитель для связи
 * - Переключатель четвертей / учебных периодов
 * - Поиск по фамилии / ФИО (регистронезависимый, живой real-time поиск как на странице журнала)
 * - Фильтр «С пропусками» и комбинированная фильтрация
 * - Бейдж «В зоне риска» рядом с ФИО (у 5 учеников зоны риска)
 * - Сортировка по колонкам (ФИО, средний балл, пропуски)
 * - Пагинация по 10 строк на страницу с сохранением фильтров и сортировки
 * - Открытие детальной модалки сводки ученика по кнопке «Сводка» и по клику на строку
 * - Модальное окно «Архив класса» с просмотром выбывших учеников, переводом в архив и восстановлением
 * - Модальное окно «Добавить ученика» с сохранением в БД, генерацией личного дела и контактов родителей
 */

import { getDB, saveDB } from '../services/storage.js';
import {
  calculateStudentAverage,
  calculateStudentAttendance,
  getRiskZoneStudents
} from '../mock/calculations.js';
import { renderIcon } from '../components/icons.js';

const PERIODS = [
  { id: 'q1_2024', name: 'I четверть (02.09 - 25.10.2024)' },
  { id: 'q2_2024', name: 'II четверть (05.11 - 27.12.2024)' },
  { id: 'q3_2024', name: 'III четверть (09.01 - 21.03.2025)' },
  { id: 'q4_2024', name: 'IV четверть (31.03 - 23.05.2025)' },
  { id: 'year_2024_2025', name: '2024/2025 учебный год' }
];

function prepareStudentRows(db, periodId) {
  const rawStudents = (db.students || []).filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived');
  const riskStudents = getRiskZoneStudents(
    db.students,
    db.lessons,
    db.attendance,
    db.grades,
    db.subjects,
    { periodId }
  );
  const riskStudentIds = new Set(riskStudents.map(r => r.studentId));

  return rawStudents.map(student => {
    const avg = calculateStudentAverage(db.grades, student.id, { periodId });
    const att = calculateStudentAttendance(db.lessons, db.attendance, student.id, { periodId });
    const isRisk = riskStudentIds.has(student.id);

    const rels = (db.parentStudentRelations || []).filter(r => r.studentId === student.id);
    const primaryRel = rels.find(r => r.isPrimary || r.isPrimaryContact) || rels[0];
    const parent = primaryRel ? (db.parents || []).find(p => p.id === primaryRel.parentId) : null;

    const parts = (student.fullName || '').trim().split(/\s+/);
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : (student.fullName ? student.fullName.slice(0, 2) : 'УЧ');

    return {
      student,
      initials: initials.toUpperCase(),
      averageGrade: avg,
      attendance: att,
      isRisk,
      parent,
      parentRelationRole: primaryRel?.relationRole || 'Родитель'
    };
  });
}

function filterAndSortRows(studentRows, { searchQuery, filterAbsencesOnly, sortBy, sortOrder }) {
  const filtered = studentRows.filter(row => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ln = (row.student.lastName || '').toLowerCase();
      if (!ln.includes(q)) {
        return false;
      }
    }

    if (filterAbsencesOnly) {
      if (!row.attendance || row.attendance.absentCount <= 0) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'grade') {
      const gA = a.averageGrade !== null ? a.averageGrade : -1;
      const gB = b.averageGrade !== null ? b.averageGrade : -1;
      cmp = gA - gB;
      if (cmp === 0) {
        cmp = (a.student.lastName || '').localeCompare(b.student.lastName || '', 'ru');
      }
    } else if (sortBy === 'absences') {
      const absA = a.attendance?.absentCount ?? 0;
      const absB = b.attendance?.absentCount ?? 0;
      cmp = absA - absB;
      if (cmp === 0) {
        cmp = (a.student.lastName || '').localeCompare(b.student.lastName || '', 'ru');
      }
    } else {
      cmp = (a.student.lastName || '').localeCompare(b.student.lastName || '', 'ru');
    }

    return sortOrder === 'desc' ? -cmp : cmp;
  });

  return filtered;
}

function renderTableHtml({ pageRows, totalFiltered, totalInClass, startShown, endShown, validPage, totalPages, sortBy, sortOrder, searchQuery }) {
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <th scope="col" class="py-3.5 pl-6 pr-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable" data-sort-by="name">
              <div class="flex items-center space-x-1.5">
                <span>ФИО УЧЕНИКА</span>
                ${sortBy === 'name' ? renderIcon('chevron-down', 'w-3 h-3 text-brand-600 ' + (sortOrder === 'asc' ? '' : 'transform rotate-180')) : ''}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4 text-center">СТАТУС</th>
            <th scope="col" class="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable text-center" data-sort-by="grade">
              <div class="inline-flex items-center space-x-1.5">
                <span>СРЕДНИЙ БАЛЛ</span>
                ${sortBy === 'grade' ? renderIcon('chevron-down', 'w-3 h-3 text-brand-600 ' + (sortOrder === 'asc' ? '' : 'transform rotate-180')) : ''}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable text-center" data-sort-by="absences">
              <div class="inline-flex items-center space-x-1.5">
                <span>ПРОПУСКИ</span>
                ${sortBy === 'absences' ? renderIcon('chevron-down', 'w-3 h-3 text-brand-600 ' + (sortOrder === 'asc' ? '' : 'transform rotate-180')) : ''}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4">РОДИТЕЛЬ ДЛЯ СВЯЗИ</th>
            <th scope="col" class="py-3.5 pl-4 pr-6 text-right">ДЕЙСТВИЯ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs">
          ${pageRows.length > 0 ? pageRows.map(row => {
    const s = row.student;
    const isAbsentAlert = row.attendance && row.attendance.absentCount > 0;

    let gradeColor = 'text-slate-900';
    if (row.averageGrade !== null) {
      if (row.averageGrade >= 4.5) gradeColor = 'text-emerald-600';
      else if (row.averageGrade < 3.5) gradeColor = 'text-rose-600';
      else gradeColor = 'text-amber-600';
    }

    return `
              <tr class="hover:bg-slate-50/70 transition-colors student-row-item cursor-pointer group" data-student-id="${s.id}">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center space-x-3.5">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-brand-50 border border-brand-200/70 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform" style="width: 40px; height: 40px; min-width: 40px; border-radius: 9999px;">
                      ${row.initials}
                    </div>
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-sm">${s.fullName}</span>
                        ${row.isRisk ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                            В зоне риска
                          </span>
                        ` : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 mt-0.5">
                        Личное дело: ${s.id} · ${s.birthDate || '2011 г.'}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${s.status === 'active' ? 'bg-brand-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'}">
                    ${s.status === 'active' ? 'Учится' : 'В архиве'}
                  </span>
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="text-sm font-extrabold ${gradeColor}">
                    ${row.averageGrade !== null ? row.averageGrade.toFixed(1).replace('.', ',') : '—'}
                  </span>
                </td>

                <td class="py-4 px-4 text-center">
                  <div class="inline-flex flex-col items-center">
                    <span class="font-bold ${isAbsentAlert ? 'text-amber-700' : 'text-slate-800'} text-xs">
                      ${row.attendance.absentCount} из ${row.attendance.totalLessons}
                    </span>
                    <span class="text-[10px] text-slate-400 mt-0.5">
                      ${row.attendance.absentCount === 0 ? '0 дней' : row.attendance.absentCount + (row.attendance.absentCount === 1 ? ' день' : (row.attendance.absentCount < 5 ? ' дня' : ' дней'))}
                    </span>
                  </div>
                </td>

                <td class="py-4 px-4">
                  ${row.parent ? `
                    <div>
                      <div class="font-semibold text-slate-900 text-xs">${row.parent.fullName}</div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${row.parent.phone || 'Телефон не указан'}</div>
                    </div>
                  ` : `
                    <span class="text-slate-400 text-xs italic">Контакт не указан</span>
                  `}
                </td>

                <td class="py-4 pl-4 pr-6 text-right">
                  <button type="button"
                          class="btn-open-student-summary px-4 py-1.5 rounded-lg border border-brand-500 hover:bg-brand-50 text-brand-600 font-semibold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                          data-student-id="${s.id}">
                    Сводка
                  </button>
                </td>
              </tr>
            `;
  }).join('') : `
            <tr>
              <td colspan="6" class="py-12 text-center text-slate-500">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    ${renderIcon('users', 'w-6 h-6')}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Ничего не найдено</div>
                    <div class="text-xs text-slate-400 mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры</div>
                  </div>
                  <button type="button"
                          id="btn-reset-students-filters"
                          class="py-2 px-4 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors cursor-pointer border border-brand-200">
                    Сбросить фильтры
                  </button>
                </div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="text-xs text-slate-500 font-medium" id="students-counter-label">
        ${totalFiltered === 1 && searchQuery ? `Показано 1 из ${totalInClass} учеников 7Б класса` : `Показано ${startShown}–${endShown} из ${totalFiltered} учеников 7Б класса`}
      </div>

      ${totalPages > 1 ? `
        <div class="flex items-center space-x-1.5 select-none">
          <button type="button"
                  data-page="${validPage - 1}"
                  class="btn-pagination-nav w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  ${validPage <= 1 ? 'disabled' : ''}>
            ${renderIcon('chevron-left', 'w-4 h-4')}
          </button>

          ${Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => `
            <button type="button"
                    data-page="${pageNum}"
                    class="btn-pagination-page w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${pageNum === validPage ? 'bg-brand-500 text-white shadow-xs' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'}">
              ${pageNum}
            </button>
          `).join('')}

          <button type="button"
                  data-page="${validPage + 1}"
                  class="btn-pagination-nav w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  ${validPage >= totalPages ? 'disabled' : ''}>
            ${renderIcon('chevron-right', 'w-4 h-4')}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderStudentsView(options = {}) {
  const db = getDB();
  const periodId = options.periodId || 'q1_2024';
  const searchQuery = (options.searchQuery || '').trim();
  const filterAbsencesOnly = options.filterAbsencesOnly === true || options.filterAbsencesOnly === 'true';
  const sortBy = options.sortBy || 'name';
  const sortOrder = options.sortOrder || 'asc';
  const currentPage = parseInt(options.page || '1', 10);
  const pageSize = 10;

  const rawStudents = (db.students || []).filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived');
  const totalInClass = rawStudents.length;

  const studentRows = prepareStudentRows(db, periodId);
  const filteredRows = filterAndSortRows(studentRows, { searchQuery, filterAbsencesOnly, sortBy, sortOrder });

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const startShown = totalFiltered > 0 ? startIndex + 1 : 0;
  const endShown = Math.min(startIndex + pageSize, totalFiltered);

  const tableMarkup = renderTableHtml({
    pageRows,
    totalFiltered,
    totalInClass,
    startShown,
    endShown,
    validPage,
    totalPages,
    sortBy,
    sortOrder,
    searchQuery
  });

  return `
    <div class="space-y-6">

      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div class="flex flex-wrap items-center gap-3 flex-1">

            <div class="relative min-w-[260px] flex-1 max-w-md">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon('search', 'w-4 h-4')}
              </div>
              <input type="text"
                     id="input-search-student-list"
                     placeholder="Поиск ученика по фамилии..."
                     value="${searchQuery}"
                     autocomplete="off"
                     style="padding-left: 2.75rem; padding-right: 2.25rem;"
                     class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
              <button type="button"
                       id="btn-clear-student-search"
                       title="Очистить поиск"
                       class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? '' : 'hidden'} cursor-pointer">
                ${renderIcon('x', 'w-3.5 h-3.5')}
              </button>
            </div>

            <button type="button"
                    id="btn-filter-absences-toggle"
                    class="px-4 py-2.5 rounded-xl border ${filterAbsencesOnly ? 'bg-brand-500 text-white border-brand-500 shadow-xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs'} text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer">
              ${renderIcon('filter', 'w-4 h-4 ' + (filterAbsencesOnly ? 'text-white' : 'text-slate-500'))}
              <span>Фильтр: С пропусками</span>
            </button>

            <div class="relative">
              <select id="select-students-period"
                      style="padding-left: 0.875rem; padding-right: 2.25rem;"
                      class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
                ${PERIODS.map(p => `
                  <option value="${p.id}" ${p.id === periodId ? 'selected' : ''}>${p.name}</option>
                `).join('')}
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                ${renderIcon('chevron-down', 'w-3.5 h-3.5')}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <button type="button"
                    id="btn-class-archive"
                    class="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5">
              ${renderIcon('archive', 'w-3.5 h-3.5 text-slate-500')}
              <span>Архив класса</span>
            </button>

            <button type="button"
                    id="btn-add-student-mock"
                    class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs hover:shadow transition-colors flex items-center space-x-1.5 cursor-pointer">
              <span class="text-base font-bold leading-none">+</span>
              <span>Добавить ученика</span>
            </button>
          </div>
        </div>
      </div>

      <div id="students-table-wrapper" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        ${tableMarkup}
      </div>
    </div>

    <div id="modal-student-summary" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-student-summary-dialog" class="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div id="student-summary-content">
        </div>
      </div>
    </div>

    <div id="modal-add-student" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-add-student-dialog" class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              ${renderIcon('user-plus', 'w-5 h-5')}
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Добавить ученика в 7Б класс</h3>
              <p class="text-xs text-slate-500 mt-0.5">Ввод данных личного дела и контактов родителя</p>
            </div>
          </div>
          <button type="button" id="btn-close-add-student-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon('x', 'w-4 h-4')}
          </button>
        </div>

        <form id="form-add-student" class="py-4 space-y-4 text-xs">
          <div id="add-student-error" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="add-student-lastname" class="block text-xs font-semibold text-slate-700 mb-1.5">Фамилия <span class="text-rose-500">*</span></label>
              <input type="text" id="add-student-lastname" required placeholder="Новиков"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
            <div>
              <label for="add-student-firstname" class="block text-xs font-semibold text-slate-700 mb-1.5">Имя <span class="text-rose-500">*</span></label>
              <input type="text" id="add-student-firstname" required placeholder="Арсений"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
            <div>
              <label for="add-student-middlename" class="block text-xs font-semibold text-slate-700 mb-1.5">Отчество</label>
              <input type="text" id="add-student-middlename" placeholder="Игоревич"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="add-student-gender" class="block text-xs font-semibold text-slate-700 mb-1.5">Пол</label>
              <div class="relative">
                <select id="add-student-gender" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
            </div>

            <div>
              <label for="add-student-birthdate" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата рождения</label>
              <input type="date" id="add-student-birthdate" value="2011-05-15"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer" />
            </div>

            <div>
              <label for="add-student-id" class="block text-xs font-semibold text-slate-700 mb-1.5">Личное дело</label>
              <input type="text" id="add-student-id" readonly title="Номер личного дела присваивается автоматически"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-700 cursor-not-allowed select-none focus:outline-none flex items-center" />
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
            <div class="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                ${renderIcon('user', 'w-3.5 h-3.5 text-brand-600')}
              </span>
              <span>Основной родитель для связи</span>
            </div>

            <div>
              <label for="add-parent-fullname" class="block text-xs font-semibold text-slate-700 mb-1.5">ФИО родителя / представителя</label>
              <input type="text" id="add-parent-fullname" placeholder="Смирнов Дмитрий Олегович"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="add-parent-relation" class="block text-xs font-semibold text-slate-700 mb-1.5">Степень родства</label>
                <div class="relative">
                  <select id="add-parent-relation" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="Мать">Мать</option>
                    <option value="Отец">Отец</option>
                    <option value="Законный представитель">Законный представитель</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon('chevron-down', 'w-4 h-4')}
                  </div>
                </div>
              </div>

              <div>
                <label for="add-parent-phone" class="block text-xs font-semibold text-slate-700 mb-1.5">Телефон для связи</label>
                <div class="relative flex items-center">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    ${renderIcon('phone', 'w-4 h-4 text-slate-400')}
                  </div>
                  <input type="tel" id="add-parent-phone" placeholder="+7 999 123-45-67"
                         class="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2.5">
            <button type="button" id="btn-cancel-add-student" class="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="submit" id="btn-submit-add-student" class="py-2.5 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Зачислить в класс</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div id="modal-class-archive" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-class-archive-dialog" class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
              ${renderIcon('archive', 'w-5 h-5')}
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-bold text-slate-900">Архив 7Б класса</h3>
                <span id="class-archive-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  0 учеников
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Выбывшие, переведённые и архивные дела учеников</p>
            </div>
          </div>
          <button type="button" id="btn-close-class-archive-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon('x', 'w-4 h-4')}
          </button>
        </div>

        <div class="py-4 space-y-5 text-xs">
          <div>
            <h4 class="text-xs font-bold text-slate-800 mb-2.5 flex items-center space-x-1.5">
              <span>Выбывшие ученики</span>
            </h4>
            <div id="class-archive-list-container" class="space-y-2.5">
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
            <h4 class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span>Оформить выбытие ученика в архив</span>
            </h4>

            <form id="form-archive-student" class="space-y-3.5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="select-archive-student" class="block text-xs font-semibold text-slate-700 mb-1.5">Выберите ученика <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <select id="select-archive-student" required class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon('chevron-down', 'w-4 h-4')}
                    </div>
                  </div>
                </div>

                <div>
                  <label for="select-archive-reason" class="block text-xs font-semibold text-slate-700 mb-1.5">Причина выбытия</label>
                  <div class="relative">
                    <select id="select-archive-reason" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      <option value="Перевод в другую школу">Перевод в другую школу</option>
                      <option value="Переезд в другой регион">Переезд в другой регион / город</option>
                      <option value="По заявлению родителей">По заявлению родителей (семейное обучение)</option>
                      <option value="Перевод в параллельный класс">Перевод в параллельный класс (7А)</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon('chevron-down', 'w-4 h-4')}
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="input-archive-date" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата выбытия</label>
                  <input type="date" id="input-archive-date" value="2024-10-25"
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer" />
                </div>
                <div>
                  <label for="input-archive-order" class="block text-xs font-semibold text-slate-700 mb-1.5">Реквизиты приказа (опционально)</label>
                  <input type="text" id="input-archive-order" placeholder="Приказ № 48-у от 25.10.2024"
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button type="submit" class="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs hover:shadow transition-colors cursor-pointer">
                  Перевести в архив
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div id="students-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 transition-all duration-300 opacity-0 translate-y-4 pointer-events-none text-xs font-medium">
      <div id="students-toast-icon"></div>
      <span id="students-toast-message"></span>
    </div>
  `;
}

export function setupStudentsListeners(onNavigate) {
  let db = getDB();

  function getUrlParams() {
    const rawHash = window.location.hash || '#/students';
    const queryString = rawHash.includes('?') ? rawHash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    return {
      periodId: params.get('period') || 'q1_2024',
      searchQuery: (params.get('search') || '').trim(),
      filterAbsencesOnly: params.get('absences') === 'true',
      sortBy: params.get('sortBy') || 'name',
      sortOrder: params.get('sortOrder') || 'asc',
      page: parseInt(params.get('page') || '1', 10),
      studentModalId: params.get('student') || null
    };
  }

  // Текущее состояние фильтрации и пагинации
  const state = getUrlParams();
  const pageSize = 10;

  // Элементы верхней панели
  const inputSearch = document.getElementById('input-search-student-list');
  const btnClearSearch = document.getElementById('btn-clear-student-search');
  const btnFilterAbsences = document.getElementById('btn-filter-absences-toggle');
  const selectPeriod = document.getElementById('select-students-period');
  const tableWrapper = document.getElementById('students-table-wrapper');

  // Модальные окна
  const modalSummary = document.getElementById('modal-student-summary');
  const modalSummaryDialog = document.getElementById('modal-student-summary-dialog');
  const summaryContent = document.getElementById('student-summary-content');

  const modalAdd = document.getElementById('modal-add-student');
  const modalAddDialog = document.getElementById('modal-add-student-dialog');
  const formAdd = document.getElementById('form-add-student');
  const btnAddOpen = document.getElementById('btn-add-student-mock');

  const modalArchive = document.getElementById('modal-class-archive');
  const modalArchiveDialog = document.getElementById('modal-class-archive-dialog');
  const btnArchiveOpen = document.getElementById('btn-class-archive');
  const formArchive = document.getElementById('form-archive-student');

  function showToast(message, isSuccess = true) {
    const toast = document.getElementById('students-toast');
    const msgEl = document.getElementById('students-toast-message');
    const iconEl = document.getElementById('students-toast-icon');
    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = message;
    iconEl.innerHTML = isSuccess ? renderIcon('check', 'w-4 h-4 text-emerald-400') : renderIcon('alert', 'w-4 h-4 text-amber-400');
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3200);
  }

  function syncRoute() {
    const params = new URLSearchParams();
    if (state.periodId && state.periodId !== 'q1_2024') params.set('period', state.periodId);
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (state.filterAbsencesOnly) params.set('absences', 'true');
    if (state.sortBy && state.sortBy !== 'name') params.set('sortBy', state.sortBy);
    if (state.sortOrder && state.sortOrder !== 'asc') params.set('sortOrder', state.sortOrder);
    if (state.page && state.page > 1) params.set('page', String(state.page));

    const queryStr = params.toString();
    const newHash = queryStr ? `#/students?${queryStr}` : '#/students';
    window.history.replaceState(null, '', newHash);
  }

  function updateFilterAbsencesBtnUI() {
    if (!btnFilterAbsences) return;
    if (state.filterAbsencesOnly) {
      btnFilterAbsences.className = 'px-4 py-2.5 rounded-xl border bg-brand-500 text-white border-brand-500 shadow-xs text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer';
      btnFilterAbsences.innerHTML = `
        ${renderIcon('filter', 'w-4 h-4 text-white')}
        <span>Фильтр: С пропусками</span>
      `;
    } else {
      btnFilterAbsences.className = 'px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer';
      btnFilterAbsences.innerHTML = `
        ${renderIcon('filter', 'w-4 h-4 text-slate-500')}
        <span>Фильтр: С пропусками</span>
      `;
    }
  }

  function renderAndAttachTable() {
    if (!tableWrapper) return;

    db = getDB();
    const rawStudents = (db.students || []).filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived');
    const totalInClass = rawStudents.length;

    const studentRows = prepareStudentRows(db, state.periodId);
    const filteredRows = filterAndSortRows(studentRows, {
      searchQuery: state.searchQuery,
      filterAbsencesOnly: state.filterAbsencesOnly,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    });

    const totalFiltered = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);

    const startIndex = (state.page - 1) * pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const startShown = totalFiltered > 0 ? startIndex + 1 : 0;
    const endShown = Math.min(startIndex + pageSize, totalFiltered);

    tableWrapper.innerHTML = renderTableHtml({
      pageRows,
      totalFiltered,
      totalInClass,
      startShown,
      endShown,
      validPage: state.page,
      totalPages,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      searchQuery: state.searchQuery
    });

    // 1. Сортировка по колонкам
    tableWrapper.querySelectorAll('.col-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const targetSortBy = th.getAttribute('data-sort-by');
        if (state.sortBy === targetSortBy) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = targetSortBy;
          state.sortOrder = 'asc';
        }
        state.page = 1;
        syncRoute();
        renderAndAttachTable();
      });
    });

    // 2. Пагинация
    tableWrapper.querySelectorAll('.btn-pagination-nav, .btn-pagination-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages && p !== state.page) {
          state.page = p;
          syncRoute();
          renderAndAttachTable();
        }
      });
    });

    // 3. Кнопка сброса фильтра при пустом результате
    const btnReset = tableWrapper.querySelector('#btn-reset-students-filters');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.searchQuery = '';
        state.filterAbsencesOnly = false;
        state.page = 1;
        if (inputSearch) inputSearch.value = '';
        if (btnClearSearch) btnClearSearch.classList.add('hidden');
        updateFilterAbsencesBtnUI();
        syncRoute();
        renderAndAttachTable();
        if (inputSearch) inputSearch.focus();
      });
    }

    // 4. Открытие сводки ученика
    tableWrapper.querySelectorAll('.btn-open-student-summary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sId = btn.getAttribute('data-student-id');
        if (sId) openSummary(sId);
      });
    });

    tableWrapper.querySelectorAll('.student-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const sId = row.getAttribute('data-student-id');
        if (sId) openSummary(sId);
      });
    });
  }

  // === Поиск в реальном времени (как в журнале, без перерендеривания инпута) ===
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      state.searchQuery = inputSearch.value.trim();
      state.page = 1;
      if (btnClearSearch) {
        btnClearSearch.classList.toggle('hidden', !state.searchQuery);
      }
      syncRoute();
      renderAndAttachTable();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (inputSearch) inputSearch.value = '';
      state.searchQuery = '';
      state.page = 1;
      btnClearSearch.classList.add('hidden');
      syncRoute();
      renderAndAttachTable();
      if (inputSearch) inputSearch.focus();
    });
  }

  // === Тумблер фильтра «С пропусками» ===
  if (btnFilterAbsences) {
    btnFilterAbsences.addEventListener('click', () => {
      state.filterAbsencesOnly = !state.filterAbsencesOnly;
      state.page = 1;
      updateFilterAbsencesBtnUI();
      syncRoute();
      renderAndAttachTable();
    });
  }

  // === Выбор периода / четверти ===
  if (selectPeriod) {
    selectPeriod.addEventListener('change', () => {
      state.periodId = selectPeriod.value;
      state.page = 1;
      syncRoute();
      renderAndAttachTable();
    });
  }

  // === МОДАЛЬНОЕ ОКНО «СВОДКА УЧЕНИКА» ===
  function openSummary(studentId) {
    db = getDB();
    const student = (db.students || []).find(s => s.id === studentId);
    if (!student || !summaryContent || !modalSummary) return;

    const overallAvg = calculateStudentAverage(db.grades, studentId, { periodId: state.periodId });
    const att = calculateStudentAttendance(db.lessons, db.attendance, studentId, { periodId: state.periodId });

    const subjectStats = (db.subjects || []).map(subj => {
      const avg = calculateStudentAverage(db.grades, studentId, { periodId: state.periodId, subjectId: subj.id });
      return { ...subj, average: avg };
    });

    const rels = (db.parentStudentRelations || []).filter(r => r.studentId === studentId);
    const parentList = rels.map(r => {
      const p = (db.parents || []).find(par => par.id === r.parentId);
      return { ...p, relation: r.relationRole || r.relation || 'Родитель', isPrimary: r.isPrimary || r.isPrimaryContact };
    }).filter(Boolean);

    summaryContent.innerHTML = `
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="text-base font-bold text-slate-900">${student.fullName}</h3>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">7Б класс</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Дата рождения: ${student.birthDate || '2011 г.'} · Личное дело № ${student.id}</p>
        </div>
        <button type="button" id="btn-close-students-summary-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
          ${renderIcon('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="py-3.5 space-y-4">
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Средний балл</span>
            <div class="text-xl font-extrabold ${overallAvg !== null && overallAvg < 3.5 ? 'text-rose-600' : 'text-slate-900'} mt-0.5">
              ${overallAvg !== null ? overallAvg.toFixed(1).replace('.', ',') : '—'}
            </div>
            <span class="text-[9px] text-slate-400">порог: 3.5</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Посещаемость</span>
            <div class="text-xl font-extrabold text-slate-900 mt-0.5">
              ${att.attendanceRate}%
            </div>
            <span class="text-[9px] text-slate-400">пропуски: ${att.absenceRate}%</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Пропущено</span>
            <div class="text-xl font-extrabold ${att.absentCount > 0 ? 'text-amber-600' : 'text-slate-900'} mt-0.5">
              ${att.absentCount} <span class="text-xs font-semibold text-slate-400">из ${att.totalLessons}</span>
            </div>
            <span class="text-[9px] text-slate-400">уроков</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Баллы по предметам</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${subjectStats.map(s => `
              <div class="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 flex items-center justify-between">
                <span class="text-xs text-slate-700 font-medium truncate mr-2" title="${s.name}">${s.name}</span>
                <span class="text-xs font-extrabold ${s.average !== null && s.average < 3.5 ? 'text-rose-600' : 'text-slate-900'}">
                  ${s.average !== null ? s.average.toFixed(1).replace('.', ',') : '—'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Контакты родителей</h4>
          <div class="space-y-1.5">
            ${parentList.length > 0 ? parentList.map(p => `
              <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-900 text-xs">
                    ${p.fullName}
                    <span class="text-[10px] font-normal text-slate-400 ml-1">(${p.relation})</span>
                    ${p.isPrimary ? '<span class="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-50 text-brand-700 border border-brand-200">Основной</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">${p.phone || 'Телефон не указан'} · ${p.email || '—'}</div>
                </div>
              </div>
            `).join('') : `
              <div class="text-xs text-slate-400 italic">Контакты родителей не внесены</div>
            `}
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <button type="button" id="btn-archive-from-summary" data-student-id="${student.id}"
                class="py-2 px-3.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5">
          ${renderIcon('archive', 'w-3.5 h-3.5 text-rose-500')}
          <span>Перевести в архив</span>
        </button>

        <button type="button" id="btn-close-students-summary-footer"
                class="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
          Закрыть
        </button>
      </div>
    `;

    modalSummary.classList.remove('opacity-0', 'pointer-events-none');
    modalSummary.classList.add('opacity-100', 'pointer-events-auto');
    if (modalSummaryDialog) {
      modalSummaryDialog.classList.remove('scale-95');
      modalSummaryDialog.classList.add('scale-100');
    }

    const closeBtn = document.getElementById('btn-close-students-summary-footer');
    const closeX = document.getElementById('btn-close-students-summary-x');
    if (closeBtn) closeBtn.onclick = closeSummary;
    if (closeX) closeX.onclick = closeSummary;

    const btnArchiveFromSummary = document.getElementById('btn-archive-from-summary');
    if (btnArchiveFromSummary) {
      btnArchiveFromSummary.onclick = () => {
        closeSummary();
        openArchiveModal(student.id);
      };
    }
  }

  function closeSummary() {
    if (!modalSummary) return;
    modalSummary.classList.remove('opacity-100', 'pointer-events-auto');
    modalSummary.classList.add('opacity-0', 'pointer-events-none');
    if (modalSummaryDialog) {
      modalSummaryDialog.classList.remove('scale-100');
      modalSummaryDialog.classList.add('scale-95');
    }
  }

  if (modalSummary) {
    modalSummary.addEventListener('click', (e) => {
      if (e.target === modalSummary) closeSummary();
    });
  }

  // === МОДАЛЬНОЕ ОКНО «ДОБАВИТЬ УЧЕНИКА» ===
  function openAddModal() {
    if (!modalAdd) return;
    db = getDB();

    // Генерация следующего ID личного дела
    const maxNum = (db.students || []).reduce((max, s) => {
      const match = (s.id || '').match(/st-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        return n > max ? n : max;
      }
      return max;
    }, 0);
    const nextId = `st-${String(maxNum + 1).padStart(2, '0')}`;

    const idInput = document.getElementById('add-student-id');
    if (idInput) idInput.value = nextId;

    const errBox = document.getElementById('add-student-error');
    if (errBox) {
      errBox.classList.add('hidden');
      errBox.textContent = '';
    }

    if (formAdd) formAdd.reset();
    if (idInput) idInput.value = nextId;

    modalAdd.classList.remove('opacity-0', 'pointer-events-none');
    modalAdd.classList.add('opacity-100', 'pointer-events-auto');
    if (modalAddDialog) {
      modalAddDialog.classList.remove('scale-95');
      modalAddDialog.classList.add('scale-100');
    }

    const firstInput = document.getElementById('add-student-lastname');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  }

  function closeAddModal() {
    if (!modalAdd) return;
    modalAdd.classList.remove('opacity-100', 'pointer-events-auto');
    modalAdd.classList.add('opacity-0', 'pointer-events-none');
    if (modalAddDialog) {
      modalAddDialog.classList.remove('scale-100');
      modalAddDialog.classList.add('scale-95');
    }
  }

  if (btnAddOpen) btnAddOpen.addEventListener('click', openAddModal);
  const btnCloseAddX = document.getElementById('btn-close-add-student-x');
  const btnCancelAdd = document.getElementById('btn-cancel-add-student');
  if (btnCloseAddX) btnCloseAddX.addEventListener('click', closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);
  if (modalAdd) {
    modalAdd.addEventListener('click', (e) => {
      if (e.target === modalAdd) closeAddModal();
    });
  }

  if (formAdd) {
    formAdd.addEventListener('submit', (e) => {
      e.preventDefault();
      const lastName = (document.getElementById('add-student-lastname')?.value || '').trim();
      const firstName = (document.getElementById('add-student-firstname')?.value || '').trim();
      const middleName = (document.getElementById('add-student-middlename')?.value || '').trim();
      const gender = document.getElementById('add-student-gender')?.value || 'M';
      const birthDate = document.getElementById('add-student-birthdate')?.value || '2011-05-15';
      const studentId = document.getElementById('add-student-id')?.value || `st-${Date.now()}`;

      const parentName = (document.getElementById('add-parent-fullname')?.value || '').trim();
      const parentRole = document.getElementById('add-parent-relation')?.value || 'Родитель';
      const parentPhone = (document.getElementById('add-parent-phone')?.value || '').trim();

      const errBox = document.getElementById('add-student-error');
      if (!lastName || !firstName) {
        if (errBox) {
          errBox.textContent = 'Пожалуйста, укажите фамилию и имя ученика.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      db = getDB();
      if (!db.students) db.students = [];
      if (!db.parents) db.parents = [];
      if (!db.parentStudentRelations) db.parentStudentRelations = [];

      const fullName = `${lastName} ${firstName} ${middleName}`.trim();
      const shortName = `${lastName} ${firstName[0]}.`;

      const newStudent = {
        id: studentId,
        classId: 'class-7b',
        lastName,
        firstName,
        middleName,
        fullName,
        shortName,
        gender,
        birthDate,
        age: 13,
        status: 'active',
        avatar: ''
      };

      db.students.push(newStudent);

      if (parentName) {
        const parentId = `parent-${studentId}`;
        db.parents.push({
          id: parentId,
          fullName: parentName,
          shortName: parentName,
          phone: parentPhone || '+7 999 123-45-00',
          email: ''
        });
        db.parentStudentRelations.push({
          parentId,
          studentId,
          relationRole: parentRole,
          isPrimary: true
        });
      }

      if (db.meta) {
        db.meta.studentsCount = db.students.filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived').length;
      }

      saveDB(db);
      closeAddModal();
      showToast(`Ученик ${fullName} успешно зачислен в 7Б класс!`);
      renderAndAttachTable();
    });
  }

  // === МОДАЛЬНОЕ ОКНО «АРХИВ КЛАССА» ===
  function populateArchiveContent(preselectStudentId = null) {
    db = getDB();
    const archivedList = (db.students || []).filter(s => (!s.classId || s.classId === 'class-7b') && s.status === 'archived');
    const activeList = (db.students || []).filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived');

    const badge = document.getElementById('class-archive-count-badge');
    if (badge) {
      badge.textContent = `${archivedList.length} ${archivedList.length === 1 ? 'ученик' : (archivedList.length >= 2 && archivedList.length <= 4 ? 'ученика' : 'учеников')}`;
    }

    const container = document.getElementById('class-archive-list-container');
    if (container) {
      if (archivedList.length === 0) {
        container.innerHTML = `
          <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
              ${renderIcon('archive', 'w-5 h-5')}
            </div>
            <div class="text-xs font-bold text-slate-700">В архиве класса нет выбывших учеников</div>
            <div class="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
              Все 28 учеников числятся в активном составе 7Б. Вы можете перевести ученика в архив в блоке ниже.
            </div>
          </div>
        `;
      } else {
        container.innerHTML = archivedList.map(s => `
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-slate-900 text-xs">${s.fullName}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">В архиве</span>
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Личное дело № ${s.id} · Причина: ${s.archiveReason || 'Перевод'} (${s.archiveDate || '2024 г.'})
              </div>
            </div>
            <button type="button" data-restore-id="${s.id}"
                    class="btn-restore-student py-1.5 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 transition-colors cursor-pointer flex-shrink-0">
              Восстановить в класс
            </button>
          </div>
        `).join('');

        container.querySelectorAll('.btn-restore-student').forEach(btn => {
          btn.addEventListener('click', () => {
            const rId = btn.getAttribute('data-restore-id');
            restoreStudentFromArchive(rId);
          });
        });
      }
    }

    const selectStudent = document.getElementById('select-archive-student');
    if (selectStudent) {
      if (activeList.length === 0) {
        selectStudent.innerHTML = `<option value="">Нет активных учеников</option>`;
      } else {
        selectStudent.innerHTML = activeList.map(s => `
          <option value="${s.id}" ${s.id === preselectStudentId ? 'selected' : ''}>${s.fullName} (${s.id})</option>
        `).join('');
      }
    }
  }

  function openArchiveModal(preselectStudentId = null) {
    if (!modalArchive) return;
    populateArchiveContent(preselectStudentId);

    modalArchive.classList.remove('opacity-0', 'pointer-events-none');
    modalArchive.classList.add('opacity-100', 'pointer-events-auto');
    if (modalArchiveDialog) {
      modalArchiveDialog.classList.remove('scale-95');
      modalArchiveDialog.classList.add('scale-100');
    }
  }

  function closeArchiveModal() {
    if (!modalArchive) return;
    modalArchive.classList.remove('opacity-100', 'pointer-events-auto');
    modalArchive.classList.add('opacity-0', 'pointer-events-none');
    if (modalArchiveDialog) {
      modalArchiveDialog.classList.remove('scale-100');
      modalArchiveDialog.classList.add('scale-95');
    }
  }

  function restoreStudentFromArchive(studentId) {
    db = getDB();
    const st = (db.students || []).find(s => s.id === studentId);
    if (!st) return;

    st.status = 'active';
    delete st.archiveReason;
    delete st.archiveDate;

    if (db.meta) {
      db.meta.studentsCount = db.students.filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived').length;
    }

    saveDB(db);
    populateArchiveContent();
    renderAndAttachTable();
    showToast(`Ученик ${st.fullName} восстановлен в активный состав 7Б класса!`);
  }

  if (btnArchiveOpen) btnArchiveOpen.addEventListener('click', () => openArchiveModal());
  const btnCloseArchiveX = document.getElementById('btn-close-class-archive-x');
  if (btnCloseArchiveX) btnCloseArchiveX.addEventListener('click', closeArchiveModal);
  if (modalArchive) {
    modalArchive.addEventListener('click', (e) => {
      if (e.target === modalArchive) closeArchiveModal();
    });
  }

  if (formArchive) {
    formArchive.addEventListener('submit', (e) => {
      e.preventDefault();
      const sId = document.getElementById('select-archive-student')?.value;
      const reason = document.getElementById('select-archive-reason')?.value || 'Перевод в другую школу';
      const date = document.getElementById('input-archive-date')?.value || '2024-10-25';
      const order = (document.getElementById('input-archive-order')?.value || '').trim();

      if (!sId) return;

      db = getDB();
      const st = (db.students || []).find(s => s.id === sId);
      if (!st) return;

      st.status = 'archived';
      st.archiveReason = order ? `${reason} (${order})` : reason;
      st.archiveDate = date;

      if (db.meta) {
        db.meta.studentsCount = db.students.filter(s => (!s.classId || s.classId === 'class-7b') && s.status !== 'archived').length;
      }

      saveDB(db);
      populateArchiveContent();
      renderAndAttachTable();
      showToast(`Ученик ${st.fullName} переведён в архив класса`);
    });
  }

  // === Закрытие по Escape ===
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalSummary && !modalSummary.classList.contains('pointer-events-none')) closeSummary();
      if (modalAdd && !modalAdd.classList.contains('pointer-events-none')) closeAddModal();
      if (modalArchive && !modalArchive.classList.contains('pointer-events-none')) closeArchiveModal();
    }
  });

  // Автооткрытие по параметру URL ?student=st-XX
  if (state.studentModalId) {
    openSummary(state.studentModalId);
  }

  // Первоначальное построение таблицы и привязка слушателей
  renderAndAttachTable();
}
