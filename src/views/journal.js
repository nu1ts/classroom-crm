import { getDB, getCurrentUser, confirmAbsenceRecord, addJournalComment, getJournalComments } from '../services/storage.js';
import { renderIcon } from '../components/icons.js';
import { getUnconfirmedAbsences } from '../mock/calculations.js';

export function renderJournalView(options = {}) {
  const db = getDB();
  const currentUser = getCurrentUser() || { role: 'teacher', shortName: 'Смирнова М. В.' };

  const students = (db.students || []).slice().sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  const subjects = db.subjects || [];
  const allLessons = (db.lessons || []).slice().sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.lessonNumber || 0) - (b.lessonNumber || 0);
  });
  const allGrades = db.grades || [];
  const allAttendance = db.attendance || [];
  const allComments = db.journalComments || [];

  const selectedSubjectId = options.subjectId || 'all';
  const selectedPeriodId = options.periodId || 'q1_2024';
  const selectedWeek = options.weekId || 'all';
  const filterStatus = options.filterStatus || (options.filterUnconfirmedOnly ? 'unconfirmed' : (options.filterOnlyAbsences ? 'absences' : 'all'));
  const isUnconfirmedOnly = filterStatus === 'unconfirmed' || options.filterUnconfirmedOnly === true || options.filterUnconfirmedOnly === 'true';
  const isAbsencesOnly = filterStatus === 'absences' || options.filterOnlyAbsences === true || options.filterOnlyAbsences === 'true' || isUnconfirmedOnly;
  const filterOnlyAbsences = isAbsencesOnly;
  const filterUnconfirmedOnly = isUnconfirmedOnly;
  const isGradesOnly = filterStatus === 'grades';
  const filterOnlyEntries = options.filterOnlyEntries === true || options.filterOnlyEntries === 'true';
  const highlightUnconfirmed = options.highlightUnconfirmed === true || options.highlightUnconfirmed === 'true';
  const searchQuery = (options.searchQuery || '').trim().toLowerCase();

  let lessons = allLessons.filter(l => l.periodId === selectedPeriodId);
  if (selectedSubjectId !== 'all') {
    lessons = lessons.filter(l => l.subjectId === selectedSubjectId);
  }
  if (selectedWeek !== 'all') {
    const weekNum = parseInt(selectedWeek.replace('w', ''), 10);
    if (!isNaN(weekNum)) {
      lessons = lessons.filter(l => l.weekIndex === weekNum);
    }
  }

  if (filterOnlyEntries) {
    const lessonIdsWithEntries = new Set([
      ...allGrades.filter(g => g.periodId === selectedPeriodId && (selectedSubjectId === 'all' || g.subjectId === selectedSubjectId)).map(g => g.lessonId),
      ...allAttendance.filter(a => a.value === 'absent').map(a => a.lessonId)
    ]);
    lessons = lessons.filter(l => lessonIdsWithEntries.has(l.id));
  }

  const gradesMap = new Map();
  allGrades.forEach(g => gradesMap.set(`${g.lessonId}_${g.studentId}`, g));

  const attendanceMap = new Map();
  allAttendance.forEach(a => attendanceMap.set(`${a.lessonId}_${a.studentId}`, a));

  const commentsMap = new Map();
  allComments.forEach(c => {
    const key = `${c.lessonId}_${c.studentId}`;
    if (!commentsMap.has(key)) commentsMap.set(key, []);
    commentsMap.get(key).push(c);
  });

  const periodGrades = allGrades.filter(g => {
    if (g.periodId !== selectedPeriodId) return false;
    if (selectedSubjectId !== 'all' && g.subjectId !== selectedSubjectId) return false;
    return true;
  });

  const periodLessons = allLessons.filter(l => {
    if (l.periodId !== selectedPeriodId) return false;
    if (selectedSubjectId !== 'all' && l.subjectId !== selectedSubjectId) return false;
    return true;
  });
  const periodLessonIds = new Set(periodLessons.map(l => l.id));

  const periodAttendance = allAttendance.filter(a => periodLessonIds.has(a.lessonId));
  const periodAbsences = periodAttendance.filter(a => a.value === 'absent');
  const periodUnconfirmed = periodAbsences.filter(a => a.status === 'unconfirmed' || a.status === 'unexcused' || a.code === 'Н');
  const periodExcused = periodAbsences.filter(a => a.status === 'excused' || a.code === 'УП' || a.code === 'Б');

  const avgGrade = periodGrades.length > 0
    ? (periodGrades.reduce((sum, g) => sum + g.value, 0) / periodGrades.length).toFixed(1)
    : '—';

  let filteredStudents = students;
  if (searchQuery) {
    filteredStudents = filteredStudents.filter(s => s.fullName.toLowerCase().includes(searchQuery));
  }

  if (isUnconfirmedOnly) {
    filteredStudents = filteredStudents.filter(s => {
      return lessons.some(l => {
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return att && att.value === 'absent' && (att.status === 'unconfirmed' || att.status === 'unexcused' || att.code === 'Н');
      });
    });
  } else if (isAbsencesOnly) {
    filteredStudents = filteredStudents.filter(s => {
      return lessons.some(l => {
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return att && att.value === 'absent';
      });
    });
  } else if (isGradesOnly) {
    filteredStudents = filteredStudents.filter(s => {
      return lessons.some(l => gradesMap.has(`${l.id}_${s.id}`));
    });
  }

  if (filterOnlyEntries) {
    filteredStudents = filteredStudents.filter(s => {
      return lessons.some(l => {
        const grade = gradesMap.get(`${l.id}_${s.id}`);
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return !!grade || (att && att.value === 'absent');
      });
    });
  }

  const tableHeaderColumns = lessons.map(l => {
    const [year, month, day] = l.date.split('-');
    const dateFormatted = `${day}.${month}`;
    const subject = subjects.find(s => s.id === l.subjectId);
    const subShort = subject ? subject.shortName : (l.subjectName || '');
    const isClosed = l.status === 'closed';

    return `
      <th class="px-2.5 py-3 text-center border-b border-slate-200 border-r border-slate-100 text-slate-700 bg-slate-50 font-semibold min-w-[56px] select-none text-[11px] leading-tight"
          title="${l.subjectName || ''} · ${l.date} (${l.time}) · ${l.teacher || ''}">
        <div class="font-bold text-slate-900">${dateFormatted}</div>
        <div class="text-[10px] text-slate-500 font-normal truncate max-w-[65px] mx-auto">${subShort}</div>
        <div class="text-[9px] text-slate-400 font-normal flex items-center justify-center space-x-0.5 mt-0.5">
          <span>${l.lessonNumber} ур</span>
          ${isClosed ? `<span title="Урок завершён">${renderIcon('lock', 'w-2.5 h-2.5 text-slate-400')}</span>` : ''}
        </div>
      </th>
    `;
  }).join('');

  const tableRows = filteredStudents.map((s, idx) => {
    const studentGrades = periodGrades.filter(g => g.studentId === s.id);
    const studentAvg = studentGrades.length > 0
      ? (studentGrades.reduce((sum, g) => sum + g.value, 0) / studentGrades.length).toFixed(1)
      : '—';

    const studentAbsences = periodAbsences.filter(a => a.studentId === s.id);
    const studentUnconfirmed = studentAbsences.filter(a => a.status === 'unconfirmed' || a.status === 'unexcused' || a.code === 'Н');

    const lessonCells = lessons.map(l => {
      const grade = gradesMap.get(`${l.id}_${s.id}`);
      const att = attendanceMap.get(`${l.id}_${s.id}`);
      const comments = commentsMap.get(`${l.id}_${s.id}`) || [];
      const hasComments = comments.length > 0;

      let cellContent = '<span class="text-slate-300 font-light select-none">·</span>';
      let cellBg = 'hover:bg-slate-50/80';
      let tooltip = `${s.fullName} · ${l.date} (${l.subjectName || ''})`;

      if (att && att.value === 'absent') {
        const isExcused = att.status === 'excused' || att.code === 'УП' || att.code === 'Б';
        if (isExcused) {
          cellContent = `
            <span class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  title="Уважительная причина: ${att.reason || 'Болезнь / справка'}">
              Б
            </span>
          `;
          tooltip += ` · Пропуск: уважительная причина (${att.reason || 'Справка'})`;
          cellBg = 'bg-indigo-50/20 hover:bg-indigo-50/50';
        } else {
          cellContent = `
            <span class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
                  title="Отсутствовал (причина не подтверждена, требуется справка)">
              Н
            </span>
          `;
          tooltip += ` · Пропуск: Не подтверждён (требуется справка)`;
          cellBg = 'bg-rose-50/30 hover:bg-rose-50/60';
        }
      } else if (grade) {
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        if (grade.value === 5) badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs';
        else if (grade.value === 4) badgeClass = 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs';
        else if (grade.value === 3) badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs';
        else if (grade.value === 2) badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs';

        cellContent = `
          <span class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-lg border ${badgeClass}">
            ${grade.value}
          </span>
        `;
        tooltip += ` · Оценка: ${grade.value} (Учитель: ${grade.teacher || 'Предметник'})`;
      } else if (att && (att.value === 'present' || att.code === 'Был')) {
        tooltip += ' · Присутствовал на уроке';
      }

      const commentIndicator = hasComments
        ? `<span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" title="Комментарии: ${comments.length}"></span>`
        : '';

      const isUnconfirmed = att && att.value === 'absent' && (att.status === 'unconfirmed' || att.status === 'unexcused' || att.code === 'Н');
      const cellStatusClass = isUnconfirmed ? 'journal-cell-unconfirmed' : 'journal-cell-normal';

      return `
        <td class="p-1 text-center border-b border-slate-200 border-r border-slate-100 relative cursor-pointer ${cellBg} transition-all cell-journal-entry ${cellStatusClass}"
            data-lesson-id="${l.id}"
            data-student-id="${s.id}"
            title="${tooltip}">
          <div class="flex items-center justify-center min-h-[30px] w-full">
            ${cellContent}
            ${commentIndicator}
          </div>
        </td>
      `;
    }).join('');

    return `
      <tr class="hover:bg-slate-50/70 transition-colors group student-row" data-student-name="${s.fullName}">
        <td class="px-3.5 py-2.5 text-xs font-semibold text-slate-900 border-b border-slate-200 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[210px] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
          <div class="flex items-center space-x-2.5">
            <span class="w-6 text-center text-slate-400 font-semibold flex-shrink-0">${idx + 1}</span>
            <a href="#/overview?student=${s.id}" class="hover:text-brand-600 transition-colors truncate font-semibold text-slate-900">
              ${s.fullName}
            </a>
          </div>
        </td>
        <td class="px-2.5 py-2.5 text-xs text-center border-b border-slate-200 border-r border-slate-200 bg-slate-50/50 font-bold whitespace-nowrap ${studentAvg !== '—' && parseFloat(studentAvg) < 3.5 ? 'text-amber-700 bg-amber-50/30' : 'text-slate-800'}">
          ${studentAvg}
        </td>
        <td class="px-2 py-2.5 text-xs text-center border-b border-slate-200 border-r border-slate-200 bg-slate-50/30 whitespace-nowrap">
          ${studentAbsences.length > 0
            ? `<span class="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-700">
                 <span>${studentAbsences.length}</span>
                 ${studentUnconfirmed.length > 0 ? `<span class="text-rose-600 font-bold" title="Неподтверждённых: ${studentUnconfirmed.length}">(${studentUnconfirmed.length}Н)</span>` : ''}
               </span>`
            : '<span class="text-slate-300">0</span>'}
        </td>
        ${lessonCells}
      </tr>
    `;
  }).join('');

  return `
    <div class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2.5 mb-1">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Журнал класса 7Б</h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              ${subjects.find(s => s.id === selectedSubjectId)?.name || 'Все предметы'}
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-2.5">
          <a href="#/attendance"
             class="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs">
            ${renderIcon('check-square', 'w-4 h-4 text-brand-500')}
            <span>Подтверждение пропусков</span>
          </a>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Уроков в выборке</div>
          <div class="flex items-baseline space-x-2">
            <span class="text-2xl font-bold text-slate-900">${lessons.length}</span>
            <span class="text-xs text-slate-500">из ${allLessons.length}</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Выставлено оценок</div>
          <div class="flex items-baseline space-x-2">
            <span class="text-2xl font-bold text-slate-900">${periodGrades.length}</span>
            <span class="text-xs text-slate-500">${periodGrades.length % 10 === 1 && periodGrades.length % 100 !== 11 ? 'оценка' : (periodGrades.length % 10 >= 2 && periodGrades.length % 10 <= 4 && (periodGrades.length % 100 < 10 || periodGrades.length % 100 >= 20) ? 'оценки' : 'оценок')}</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Средний балл</div>
          <div class="flex items-baseline space-x-2">
            <span class="text-2xl font-bold text-slate-900">${avgGrade}</span>
            <span class="text-xs text-emerald-600 font-medium">класс 7Б</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Пропуски за период</div>
          <div class="flex items-baseline space-x-2">
            <span class="text-2xl font-bold text-slate-900">${periodAbsences.length}</span>
            ${periodUnconfirmed.length > 0
              ? `<span class="text-xs font-semibold text-rose-600" title="Требуют справку">${periodUnconfirmed.length} не подтверждено</span>`
              : `<span class="text-xs font-semibold text-emerald-600">Все подтверждены</span>`}
          </div>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label for="select-journal-subject" class="block text-xs font-semibold text-slate-700 mb-1.5">Предмет</label>
            <div class="relative">
              <select id="select-journal-subject"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="all" ${selectedSubjectId === 'all' ? 'selected' : ''}>Все предметы (сводный журнал)</option>
                ${subjects.map(sub => `
                  <option value="${sub.id}" ${selectedSubjectId === sub.id ? 'selected' : ''}>
                    ${sub.name} (${sub.teacher || 'Учитель'})
                  </option>
                `).join('')}
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon('chevron-down', 'w-4 h-4')}
              </div>
            </div>
          </div>

          <div>
            <label for="select-journal-week" class="block text-xs font-semibold text-slate-700 mb-1.5">Учебный период</label>
            <div class="relative">
              <select id="select-journal-week"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="all" ${selectedWeek === 'all' ? 'selected' : ''}>Вся I четверть (02.09 – 25.10.2024)</option>
                <option value="w8" ${selectedWeek === 'w8' ? 'selected' : ''}>8 неделя (21.10 – 25.10.2024) — Текущая</option>
                <option value="w7" ${selectedWeek === 'w7' ? 'selected' : ''}>7 неделя (14.10 – 18.10.2024)</option>
                <option value="w6" ${selectedWeek === 'w6' ? 'selected' : ''}>6 неделя (07.10 – 11.10.2024)</option>
                <option value="w5" ${selectedWeek === 'w5' ? 'selected' : ''}>5 неделя (30.09 – 04.10.2024)</option>
                <option value="w4" ${selectedWeek === 'w4' ? 'selected' : ''}>4 неделя (23.09 – 27.09.2024)</option>
                <option value="w3" ${selectedWeek === 'w3' ? 'selected' : ''}>3 неделя (16.09 – 20.09.2024)</option>
                <option value="w2" ${selectedWeek === 'w2' ? 'selected' : ''}>2 неделя (09.09 – 13.09.2024)</option>
                <option value="w1" ${selectedWeek === 'w1' ? 'selected' : ''}>1 неделя (02.09 – 06.09.2024)</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon('chevron-down', 'w-4 h-4')}
              </div>
            </div>
          </div>

          <div>
            <label for="input-search-student" class="block text-xs font-semibold text-slate-700 mb-1.5">Поиск ученика</label>
            <div class="relative">
              <input type="text" id="input-search-student"
                     value="${searchQuery}"
                     placeholder="Фамилия или имя..."
                     autocomplete="off"
                     class="w-full pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
              <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <button type="button" id="btn-clear-search" class="${searchQuery ? '' : 'hidden'} text-slate-400 hover:text-slate-600 p-0.5">
                  ${renderIcon('x', 'w-3.5 h-3.5')}
                </button>
                <span id="icon-search-glass" class="${searchQuery ? 'hidden' : ''}">
                  ${renderIcon('search', 'w-4 h-4')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label for="select-journal-status" class="block text-xs font-semibold text-slate-700 mb-1.5">Отметки и пропуски</label>
            <div class="relative">
              <select id="select-journal-status"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="all" ${filterStatus === 'all' && !filterOnlyAbsences ? 'selected' : ''}>Все отметки и пропуски</option>
                <option value="unconfirmed" ${filterStatus === 'unconfirmed' || filterUnconfirmedOnly ? 'selected' : ''}>Только неподтверждённые («Н»)</option>
                <option value="absences" ${filterStatus === 'absences' || (filterOnlyAbsences && !filterUnconfirmedOnly) ? 'selected' : ''}>Все пропуски («Н», «Б», «УП»)</option>
                <option value="grades" ${filterStatus === 'grades' ? 'selected' : ''}>Только оценки</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon('chevron-down', 'w-4 h-4')}
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" id="btn-toggle-highlight-unconfirmed"
                    class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${highlightUnconfirmed ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}">
              <span class="w-2 h-2 rounded-full ${highlightUnconfirmed ? 'bg-rose-600 animate-pulse' : 'bg-rose-400'}"></span>
              <span>Подсветить неподтверждённые («Н»)</span>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold ${highlightUnconfirmed ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'}">
                ${periodUnconfirmed.length}
              </span>
            </button>

            <label for="check-only-entries"
                   class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer select-none">
              <input type="checkbox" id="check-only-entries"
                     ${filterOnlyEntries ? 'checked' : ''}
                     class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
              <span class="font-medium text-slate-700">Показывать только записи</span>
            </label>

            <div class="h-4 w-px bg-slate-200 hidden md:block"></div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-slate-700">Обозначения:</span>
              <div class="flex items-center space-x-1">
                <span class="w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-300">5</span>
                <span class="w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-blue-50 text-blue-800 border border-blue-300">4</span>
                <span class="w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-300">3</span>
                <span class="w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-rose-50 text-rose-800 border border-rose-300">2</span>
              </div>
              <div class="flex items-center space-x-1 pl-1.5 border-l border-slate-200">
                <span class="px-1.5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Б</span>
                <span class="text-slate-500 text-[11px]">— уваж.</span>
              </div>
              <div class="flex items-center space-x-1 pl-1.5 border-l border-slate-200">
                <span class="px-1.5 h-5 flex items-center justify-center text-[11px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-300">Н</span>
                <span class="text-slate-500 text-[11px]">— неуваж.</span>
              </div>
              <div class="flex items-center space-x-1 pl-1.5 border-l border-slate-200">
                <span class="w-2 h-2 rounded-full bg-brand-500"></span>
                <span class="text-slate-500 text-[11px]">— коммент.</span>
              </div>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 hidden xl:block">
            Кликните на ячейку для просмотра деталей
          </div>
        </div>
      </div>

      <style>
        .journal-highlight-mode .journal-cell-unconfirmed span {
          outline: 2px solid #e11d48 !important;
          outline-offset: 1px !important;
          background-color: #ffe4e6 !important;
          color: #9f1239 !important;
          font-weight: 800 !important;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.25) !important;
        }
        .journal-highlight-mode .journal-cell-normal {
          opacity: 0.35;
          transition: opacity 0.15s ease-in-out;
        }
        .journal-highlight-mode .journal-cell-normal:hover {
          opacity: 1;
        }
      </style>

      <div id="journal-table-container" class="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden ${highlightUnconfirmed ? 'journal-highlight-mode' : ''}">
        <div class="overflow-x-auto scrollbar-thin">
          <table class="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th class="px-3.5 py-3 border-b border-slate-200 border-r border-slate-200 text-slate-700 bg-slate-50 font-bold text-xs sticky left-0 z-20 min-w-[210px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  <div class="flex items-center space-x-2">
                    <span class="w-6 text-center text-slate-400 font-semibold flex-shrink-0">№</span>
                    <span>Ученик (28 чел.)</span>
                  </div>
                </th>
                <th class="px-2.5 py-3 text-center border-b border-slate-200 border-r border-slate-200 text-slate-700 bg-slate-50 font-bold text-xs min-w-[50px]" title="Средний балл за период">
                  Ср. балл
                </th>
                <th class="px-2 py-3 text-center border-b border-slate-200 border-r border-slate-200 text-slate-700 bg-slate-50 font-bold text-xs min-w-[65px]" title="Всего пропусков уроков">
                  Пропуски
                </th>
                ${tableHeaderColumns}
              </tr>
            </thead>
            <tbody id="journal-table-body">
              ${tableRows.length > 0 ? tableRows : `
                <tr>
                  <td colspan="${lessons.length + 3}" class="py-12 text-center text-slate-400 text-xs">
                    По заданным критериям ничего не найдено. Попробуйте сбросить фильтры.
                  </td>
                </tr>
              `}
              <tr id="journal-search-no-results" style="display: none;">
                <td colspan="${lessons.length + 3}" class="py-12 text-center text-slate-400 text-xs">
                  По данному поисковому запросу ученики не найдены.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-journal-entry" class="fixed inset-0 z-50 !m-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-200">
      <div id="modal-journal-dialog" class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform scale-95 transition-all duration-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 id="entry-modal-subject" class="text-base font-bold text-slate-900">Запись в журнале</h3>
              <p id="entry-modal-lesson-info" class="text-xs text-slate-500 mt-0.5">Дата, время, кабинет</p>
            </div>
            <button type="button" id="btn-close-journal-modal" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              ${renderIcon('x', 'w-5 h-5')}
            </button>
          </div>

          <div class="py-4 space-y-4 text-xs">
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ученик</div>
                <div id="entry-modal-student-name" class="text-sm font-bold text-slate-900 mt-0.5">—</div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                7Б класс
              </span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-700">Оценка за урок:</span>
                <div id="entry-modal-grade-badge">
                  <span class="text-slate-400">Оценка не выставлялась</span>
                </div>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-700">Посещаемость:</span>
                <div id="entry-modal-attendance-badge">
                  <span class="text-emerald-700 font-semibold">Был на уроке</span>
                </div>
              </div>
              <div id="entry-modal-absence-details" class="text-slate-600 hidden">
              </div>
              <div id="block-confirm-from-journal" class="hidden pt-1">
                <button type="button" id="btn-quick-confirm-absence"
                        class="w-full py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5">
                  ${renderIcon('check', 'w-4 h-4')}
                  <span>Подтвердить уважительную причину пропуска</span>
                </button>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800">Комментарии к записи</span>
                <span id="entry-modal-comments-count" class="text-[11px] font-semibold text-slate-500">0</span>
              </div>

              <div id="entry-modal-comments-list" class="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
                <p class="text-slate-400 italic text-[11px]">Пока нет комментариев</p>
              </div>

              <form id="form-add-journal-comment" class="pt-2 border-t border-slate-200/70 space-y-2">
                <label for="input-journal-comment-text" class="block font-semibold text-slate-700 text-[11px]">
                  Добавить комментарий классного руководителя
                </label>
                <textarea id="input-journal-comment-text" rows="2"
                          placeholder="Например: Родители уведомлены, справка ожидается..."
                          class="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
                <div class="flex justify-end">
                  <button type="submit"
                          class="py-1.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs">
                    Сохранить комментарий
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button type="button" id="btn-close-journal-modal-footer"
                    class="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      </div>
  `;
}

export function setupJournalListeners(onNavigate) {
  const selectSubject = document.getElementById('select-journal-subject');
  const selectWeek = document.getElementById('select-journal-week');
  const selectStatus = document.getElementById('select-journal-status');
  const checkOnlyEntries = document.getElementById('check-only-entries');
  const inputSearch = document.getElementById('input-search-student');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const iconSearch = document.getElementById('icon-search-glass');
  const btnToggleHighlight = document.getElementById('btn-toggle-highlight-unconfirmed');
  const tableContainer = document.getElementById('journal-table-container');

  function getUrlParams() {
    const rawHash = window.location.hash || '#/journal';
    const queryString = rawHash.includes('?') ? rawHash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const unconfirmed = params.get('unconfirmed') === 'true';
    const absences = params.get('absences') === 'true';
    const statusParam = params.get('status') || (unconfirmed ? 'unconfirmed' : (absences ? 'absences' : 'all'));
    return {
      subjectId: params.get('subject') || 'all',
      weekId: params.get('week') || 'all',
      filterStatus: statusParam,
      filterOnlyAbsences: statusParam === 'absences' || statusParam === 'unconfirmed',
      filterUnconfirmedOnly: statusParam === 'unconfirmed',
      filterOnlyEntries: params.get('onlyEntries') === 'true',
      searchQuery: params.get('search') || ''
    };
  }

  function updateRoute(newParams) {
    const current = getUrlParams();
    const merged = { ...current, ...newParams };
    const params = new URLSearchParams();

    if (merged.subjectId && merged.subjectId !== 'all') params.set('subject', merged.subjectId);
    if (merged.weekId && merged.weekId !== 'all') params.set('week', merged.weekId);
    if (merged.filterStatus && merged.filterStatus !== 'all') {
      params.set('status', merged.filterStatus);
      if (merged.filterStatus === 'unconfirmed') params.set('unconfirmed', 'true');
      if (merged.filterStatus === 'absences' || merged.filterStatus === 'unconfirmed') params.set('absences', 'true');
    }
    if (merged.filterOnlyEntries) params.set('onlyEntries', 'true');
    if (merged.searchQuery) params.set('search', merged.searchQuery);

    const queryStr = params.toString();
    const newHash = queryStr ? `#/journal?${queryStr}` : '#/journal';

    if (onNavigate) {
      onNavigate(newHash);
    } else {
      window.location.hash = newHash;
    }
  }

  if (selectSubject) {
    selectSubject.addEventListener('change', () => {
      updateRoute({ subjectId: selectSubject.value });
    });
  }

  if (selectWeek) {
    selectWeek.addEventListener('change', () => {
      updateRoute({ weekId: selectWeek.value });
    });
  }

  if (selectStatus) {
    selectStatus.addEventListener('change', () => {
      const val = selectStatus.value;
      updateRoute({
        filterStatus: val,
        filterOnlyAbsences: val === 'absences' || val === 'unconfirmed',
        filterUnconfirmedOnly: val === 'unconfirmed'
      });
    });
  }

  if (checkOnlyEntries) {
    checkOnlyEntries.addEventListener('change', () => {
      updateRoute({ filterOnlyEntries: checkOnlyEntries.checked });
    });
  }

  function filterTableRowsLocally(query) {
    const q = (query || '').trim().toLowerCase();
    const rows = document.querySelectorAll('tr.student-row');
    let visibleCount = 0;
    rows.forEach(r => {
      const name = (r.getAttribute('data-student-name') || '').toLowerCase();
      const match = !q || name.includes(q);
      r.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    const noMatchRow = document.getElementById('journal-search-no-results');
    if (noMatchRow) {
      noMatchRow.style.display = (visibleCount === 0 && rows.length > 0) ? '' : 'none';
    }

    if (btnClearSearch && iconSearch) {
      if (q) {
        btnClearSearch.classList.remove('hidden');
        iconSearch.classList.add('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
        iconSearch.classList.remove('hidden');
      }
    }
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      filterTableRowsLocally(inputSearch.value);
    });
  }

  if (btnClearSearch && inputSearch) {
    btnClearSearch.addEventListener('click', () => {
      inputSearch.value = '';
      filterTableRowsLocally('');
      inputSearch.focus();
    });
  }

  if (btnToggleHighlight && tableContainer) {
    btnToggleHighlight.addEventListener('click', () => {
      const isNowActive = !tableContainer.classList.contains('journal-highlight-mode');
      tableContainer.classList.toggle('journal-highlight-mode', isNowActive);

      if (isNowActive) {
        btnToggleHighlight.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
        btnToggleHighlight.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-300', 'ring-2', 'ring-rose-500/20');
      } else {
        btnToggleHighlight.classList.remove('bg-rose-50', 'text-rose-700', 'border-rose-300', 'ring-2', 'ring-rose-500/20');
        btnToggleHighlight.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      }
    });
  }

  const modal = document.getElementById('modal-journal-entry');
  const modalDialog = document.getElementById('modal-journal-dialog');
  const btnCloseX = document.getElementById('btn-close-journal-modal');
  const btnCloseFooter = document.getElementById('btn-close-journal-modal-footer');
  const formComment = document.getElementById('form-add-journal-comment');
  const inputCommentText = document.getElementById('input-journal-comment-text');

  let activeLessonId = null;
  let activeStudentId = null;
  let activeAttendanceRecord = null;

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
    if (modalDialog) {
      modalDialog.classList.remove('scale-100');
      modalDialog.classList.add('scale-95');
    }
    if (formComment) formComment.reset();
  }

  if (btnCloseX) btnCloseX.onclick = closeModal;
  if (btnCloseFooter) btnCloseFooter.onclick = closeModal;
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function openJournalEntryModal(lessonId, studentId) {
    if (!modal) return;
    activeLessonId = lessonId;
    activeStudentId = studentId;

    const currentDB = getDB();
    const lesson = (currentDB.lessons || []).find(l => l.id === lessonId);
    const student = (currentDB.students || []).find(s => s.id === studentId);
    const grade = (currentDB.grades || []).find(g => g.lessonId === lessonId && g.studentId === studentId);
    const att = (currentDB.attendance || []).find(a => a.lessonId === lessonId && a.studentId === studentId);
    activeAttendanceRecord = att;

    const elSub = document.getElementById('entry-modal-subject');
    const elInfo = document.getElementById('entry-modal-lesson-info');
    const elStudent = document.getElementById('entry-modal-student-name');
    const elGrade = document.getElementById('entry-modal-grade-badge');
    const elAtt = document.getElementById('entry-modal-attendance-badge');
    const elAbsenceDetails = document.getElementById('entry-modal-absence-details');
    const elConfirmBlock = document.getElementById('block-confirm-from-journal');

    if (elSub && lesson) elSub.textContent = `Запись в журнале: ${lesson.subjectName || 'Урок'}`;
    if (elInfo && lesson) {
      elInfo.textContent = `${lesson.date} (${lesson.time || ''}) · ${lesson.room || ''} · Преподаватель: ${lesson.teacher || ''}`;
    }
    if (elStudent && student) elStudent.textContent = student.fullName;

    if (elGrade) {
      if (grade) {
        let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
        if (grade.value === 5) badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
        else if (grade.value === 4) badgeStyle = 'bg-blue-50 text-blue-800 border-blue-300';
        else if (grade.value === 3) badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
        else if (grade.value === 2) badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300';

        elGrade.innerHTML = `
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-lg border ${badgeStyle}">
              ${grade.value}
            </span>
            <span class="text-xs text-slate-500 font-medium">Выставил: ${grade.teacher || 'Учитель-предметник'}</span>
          </div>
        `;
      } else {
        elGrade.innerHTML = '<span class="text-slate-400">Оценка не выставлялась</span>';
      }
    }

    if (elAtt) {
      if (att && att.value === 'absent') {
        const isExcused = att.status === 'excused' || att.code === 'УП' || att.code === 'Б';
        if (isExcused) {
          elAtt.innerHTML = `
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span>Б</span>
              <span>Уважительная причина (болезнь / справка)</span>
            </span>
          `;
          if (elAbsenceDetails) {
            elAbsenceDetails.classList.remove('hidden');
            elAbsenceDetails.innerHTML = `
              <div class="mt-1 text-[11px] text-slate-500">
                Основание: <b class="text-slate-700">${att.document || att.reason || 'Справка'}</b>
                ${att.confirmedBy ? `· Подтвердил: <b class="text-slate-700">${att.confirmedBy}</b>` : ''}
              </div>
            `;
          }
          if (elConfirmBlock) elConfirmBlock.classList.add('hidden');
        } else {
          elAtt.innerHTML = `
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
              <span>Н</span>
              <span>Отсутствовал (причина не подтверждена)</span>
            </span>
          `;
          if (elAbsenceDetails) {
            elAbsenceDetails.classList.remove('hidden');
            elAbsenceDetails.innerHTML = `
              <div class="mt-1 text-[11px] text-rose-600 font-medium">
                Требуется медицинская справка или заявление родителей для подтверждения уважительной причины.
              </div>
            `;
          }
          if (elConfirmBlock) elConfirmBlock.classList.remove('hidden');
        }
      } else {
        elAtt.innerHTML = '<span class="text-emerald-700 font-semibold">Был на уроке</span>';
        if (elAbsenceDetails) elAbsenceDetails.classList.add('hidden');
        if (elConfirmBlock) elConfirmBlock.classList.add('hidden');
      }
    }

    renderModalComments(lessonId, studentId);

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    if (modalDialog) {
      modalDialog.classList.remove('scale-95');
      modalDialog.classList.add('scale-100');
    }
  }

  function renderModalComments(lessonId, studentId) {
    const comments = getJournalComments(lessonId, studentId);
    const elList = document.getElementById('entry-modal-comments-list');
    const elCount = document.getElementById('entry-modal-comments-count');

    if (elCount) elCount.textContent = comments.length;
    if (!elList) return;

    if (comments.length === 0) {
      elList.innerHTML = '<p class="text-slate-400 italic text-[11px]">Пока нет комментариев</p>';
      return;
    }

    elList.innerHTML = comments.map(c => `
      <div class="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
        <div class="flex items-center justify-between text-[10px]">
          <span class="font-bold text-slate-800">${c.author} <span class="font-normal text-slate-400">(${c.role === 'teacher' ? 'Классрук' : 'Предметник'})</span></span>
          <span class="text-slate-400">${c.createdAt}</span>
        </div>
        <p class="text-xs text-slate-700 font-medium">${c.text}</p>
      </div>
    `).join('');
  }

  document.querySelectorAll('.cell-journal-entry').forEach(cell => {
    cell.addEventListener('click', () => {
      const lessonId = cell.getAttribute('data-lesson-id');
      const studentId = cell.getAttribute('data-student-id');
      if (lessonId && studentId) {
        openJournalEntryModal(lessonId, studentId);
      }
    });
  });

  const btnQuickConfirm = document.getElementById('btn-quick-confirm-absence');
  if (btnQuickConfirm) {
    btnQuickConfirm.addEventListener('click', () => {
      if (!activeAttendanceRecord) return;
      confirmAbsenceRecord(activeAttendanceRecord.id, {
        status: 'excused',
        reason: 'Медицинская справка от врача',
        document: 'Медицинская справка',
        confirmedBy: 'Смирнова М. В.'
      });
      closeModal();
      const currentHash = window.location.hash || '#/journal';
      if (onNavigate) {
        onNavigate(currentHash);
      } else {
        window.location.reload();
      }
    });
  }

  if (formComment) {
    formComment.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeLessonId || !activeStudentId || !inputCommentText) return;
      const text = inputCommentText.value.trim();
      if (!text) return;

      const res = addJournalComment({
        lessonId: activeLessonId,
        studentId: activeStudentId,
        text,
        author: 'Смирнова М. В.',
        role: 'teacher'
      });

      if (res.success) {
        inputCommentText.value = '';
        renderModalComments(activeLessonId, activeStudentId);
      }
    });
  }
}
