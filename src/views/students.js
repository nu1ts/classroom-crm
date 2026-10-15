/**
 * Модуль представления страницы «Список учеников» (7Б класс)
 * Реализует требования ТЗ и тест-кейсы TC-OV-01..11:
 * - Таблица учеников 7Б: ФИО, статус, посещаемость за период, средний балл (сходится со сводкой), родитель для связи
 * - Переключатель четвертей / учебных периодов
 * - Поиск по фамилии / ФИО (регистронезависимый)
 * - Фильтр «С пропусками» и комбинированная фильтрация
 * - Бейдж «В зоне риска» рядом с ФИО (у 5 учеников зоны риска)
 * - Сортировка по колонкам (ФИО, средний балл, пропуски)
 * - Пагинация по 10 строк на страницу с сохранением фильтров и сортировки
 * - Открытие детальной модалки сводки ученика по кнопке «Сводка» и по клику на строку
 */

import { getDB, saveDB } from '../services/storage.js';
import {
  calculateStudentAverage,
  calculateStudentAttendance,
  getRiskZoneStudents
} from '../mock/calculations.js';
import { renderIcon } from '../components/icons.js';

export function renderStudentsView(options = {}) {
  const db = getDB();
  const periodId = options.periodId || 'q1_2024';
  const searchQuery = (options.searchQuery || '').trim();
  const filterAbsencesOnly = options.filterAbsencesOnly === true || options.filterAbsencesOnly === 'true';
  const sortBy = options.sortBy || 'name';
  const sortOrder = options.sortOrder || 'asc';
  const currentPage = parseInt(options.page || '1', 10);
  const pageSize = 10;

  const periods = [
    { id: 'q1_2024', name: 'I четверть (02.09 - 25.10.2024)' },
    { id: 'q2_2024', name: 'II четверть (05.11 - 27.12.2024)' },
    { id: 'q3_2024', name: 'III четверть (09.01 - 21.03.2025)' },
    { id: 'q4_2024', name: 'IV четверть (31.03 - 23.05.2025)' },
    { id: 'year_2024_2025', name: '2024/2025 учебный год' }
  ];

  const rawStudents = (db.students || []).filter(s => !s.classId || s.classId === 'class-7b');
  const totalInClass = rawStudents.length;

  const riskStudents = getRiskZoneStudents(
    db.students,
    db.lessons,
    db.attendance,
    db.grades,
    db.subjects,
    { periodId }
  );
  const riskStudentIds = new Set(riskStudents.map(r => r.studentId));

  const studentRows = rawStudents.map(student => {
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

  let filteredRows = studentRows.filter(row => {
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

  filteredRows.sort((a, b) => {
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

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const startShown = totalFiltered > 0 ? startIndex + 1 : 0;
  const endShown = Math.min(startIndex + pageSize, totalFiltered);

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
              ${filterAbsencesOnly ? `<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>` : ''}
            </button>

            <div class="relative">
              <select id="select-students-period"
                      style="padding-left: 0.875rem; padding-right: 2.25rem;"
                      class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
                ${periods.map(p => `
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
                    class="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
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

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
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
    </div>

    <div id="modal-student-summary" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-student-summary-dialog" class="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div id="student-summary-content">
        </div>
      </div>
    </div>
  `;
}

export function setupStudentsListeners(onNavigate) {
  const db = getDB();

  function getUrlParams() {
    const rawHash = window.location.hash || '#/students';
    const queryString = rawHash.includes('?') ? rawHash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    return {
      periodId: params.get('period') || 'q1_2024',
      searchQuery: params.get('search') || '',
      filterAbsencesOnly: params.get('absences') === 'true',
      sortBy: params.get('sortBy') || 'name',
      sortOrder: params.get('sortOrder') || 'asc',
      page: params.get('page') || '1',
      studentModalId: params.get('student') || null
    };
  }

  function updateRoute(newParams) {
    const current = getUrlParams();
    const merged = { ...current, ...newParams };
    const params = new URLSearchParams();

    if (merged.periodId && merged.periodId !== 'q1_2024') params.set('period', merged.periodId);
    if (merged.searchQuery) params.set('search', merged.searchQuery);
    if (merged.filterAbsencesOnly) params.set('absences', 'true');
    if (merged.sortBy && merged.sortBy !== 'name') params.set('sortBy', merged.sortBy);
    if (merged.sortOrder && merged.sortOrder !== 'asc') params.set('sortOrder', merged.sortOrder);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    if (merged.studentModalId) params.set('student', merged.studentModalId);

    const queryStr = params.toString();
    const newHash = queryStr ? `#/students?${queryStr}` : '#/students';

    if (onNavigate) {
      onNavigate(newHash);
    } else {
      window.location.hash = newHash;
    }
  }

  const inputSearch = document.getElementById('input-search-student-list');
  const btnClearSearch = document.getElementById('btn-clear-student-search');

  if (inputSearch) {
    let debounceTimer = null;
    inputSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateRoute({ searchQuery: inputSearch.value.trim(), page: '1' });
      }, 250);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (inputSearch) inputSearch.value = '';
      updateRoute({ searchQuery: '', page: '1' });
    });
  }

  const btnFilterAbsences = document.getElementById('btn-filter-absences-toggle');
  if (btnFilterAbsences) {
    btnFilterAbsences.addEventListener('click', () => {
      const current = getUrlParams();
      updateRoute({ filterAbsencesOnly: !current.filterAbsencesOnly, page: '1' });
    });
  }

  const selectPeriod = document.getElementById('select-students-period');
  if (selectPeriod) {
    selectPeriod.addEventListener('change', () => {
      updateRoute({ periodId: selectPeriod.value, page: '1' });
    });
  }

  const btnReset = document.getElementById('btn-reset-students-filters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (inputSearch) inputSearch.value = '';
      updateRoute({ searchQuery: '', filterAbsencesOnly: false, page: '1' });
    });
  }

  document.querySelectorAll('.col-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const targetSortBy = th.getAttribute('data-sort-by');
      const current = getUrlParams();
      let newOrder = 'asc';
      if (current.sortBy === targetSortBy) {
        newOrder = current.sortOrder === 'asc' ? 'desc' : 'asc';
      }
      updateRoute({ sortBy: targetSortBy, sortOrder: newOrder, page: '1' });
    });
  });

  document.querySelectorAll('.btn-pagination-nav, .btn-pagination-page').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.getAttribute('data-page');
      if (targetPage) {
        updateRoute({ page: targetPage });
      }
    });
  });

  const modalSummary = document.getElementById('modal-student-summary');
  const modalSummaryDialog = document.getElementById('modal-student-summary-dialog');
  const summaryContent = document.getElementById('student-summary-content');

  function openSummary(studentId) {
    const student = (db.students || []).find(s => s.id === studentId);
    if (!student || !summaryContent || !modalSummary) return;

    const currentParams = getUrlParams();
    const periodId = currentParams.periodId;
    const overallAvg = calculateStudentAverage(db.grades, studentId, { periodId });
    const att = calculateStudentAttendance(db.lessons, db.attendance, studentId, { periodId });

    const subjectStats = (db.subjects || []).map(subj => {
      const avg = calculateStudentAverage(db.grades, studentId, { periodId, subjectId: subj.id });
      return { ...subj, average: avg };
    });

    const rels = (db.parentStudentRelations || []).filter(r => r.studentId === studentId);
    const parentList = rels.map(r => {
      const p = (db.parents || []).find(par => par.id === r.parentId);
      return { ...p, relation: r.relationRole || r.relation || 'Родитель', isPrimary: r.isPrimary || r.isPrimaryContact };
    }).filter(Boolean);

    const notes = (db.notes || []).filter(n => n.studentId === studentId);

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
            <div class="text-xl font-extrabold ${att.absenceRate !== null && att.absenceRate > 20 ? 'text-rose-600' : 'text-slate-900'} mt-0.5">
              ${att.attendanceRate !== null ? att.attendanceRate + '%' : '—'}
            </div>
            <span class="text-[9px] text-slate-400">пропуски: ${att.absenceRate}%</span>
          </div>

          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Пропущено</span>
            <div class="text-xl font-extrabold text-slate-900 mt-0.5">
              ${att.absentCount} <span class="text-xs font-normal text-slate-500">из ${att.totalLessons}</span>
            </div>
            <span class="text-[9px] text-slate-400">уроков</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Баллы по предметам</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${subjectStats.map(s => `
              <div class="p-2.5 rounded-xl border ${s.average !== null && s.average < 3.5 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-slate-200 text-slate-800'} flex items-center justify-between text-xs shadow-2xs">
                <span class="font-medium truncate mr-2">${s.name}</span>
                <span class="font-bold ${s.average !== null && s.average < 3.5 ? 'text-rose-600' : 'text-slate-900'}">${s.average !== null ? s.average.toFixed(1).replace('.', ',') : '—'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Контакты родителей</h4>
          <div class="space-y-2">
            ${parentList.length > 0 ? parentList.map(p => `
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div class="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>${p.fullName}</span>
                    <span class="text-[10px] text-slate-500">(${p.relation || 'Родитель'})</span>
                    ${p.isPrimary ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand-100 text-brand-700">Основной</span>' : ''}
                  </div>
                  <div class="text-slate-600 mt-0.5 text-[11px]">${p.phone || '+7 999 000-00-00'} · ${p.email || '—'}</div>
                </div>
              </div>
            `).join('') : `
              <div class="p-3 text-xs text-slate-400 italic">Контакты родителей не добавлены</div>
            `}
          </div>
        </div>

        ${notes.length > 0 ? `
          <div>
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Заметки классного руководителя</h4>
            <div class="space-y-1.5">
              ${notes.map(n => `
                <div class="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs">
                  <div class="text-slate-800 leading-relaxed">${n.text}</div>
                  <div class="text-[10px] text-slate-400 mt-1">${n.date} · ${n.author}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
        <button type="button" id="btn-close-students-summary-footer" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer">
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

  document.querySelectorAll('.btn-open-student-summary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-student-id');
      if (sId) openSummary(sId);
    });
  });

  document.querySelectorAll('.student-row-item').forEach(row => {
    row.addEventListener('click', () => {
      const sId = row.getAttribute('data-student-id');
      if (sId) openSummary(sId);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalSummary && !modalSummary.classList.contains('pointer-events-none')) {
      closeSummary();
    }
  });

  const initialParams = getUrlParams();
  if (initialParams.studentModalId) {
    openSummary(initialParams.studentModalId);
  }
}
