import {
  getDB,
  getCurrentUser,
  confirmAbsenceRecord,
  addJournalComment,
  getJournalComments,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { getUnconfirmedAbsences } from "../../mock/calculations.js";
import { hrefFor, navigate } from "../../services/navigation.js";

export function renderJournalView(options = {}) {
  const db = getDB();
  const currentUser = getCurrentUser() || {
    role: "teacher",
    shortName: "Смирнова М. В.",
  };
  const isSubjectTeacher = currentUser && currentUser.role === "subject_teacher";

  const selectedClassId = options.classId || "class-7b";
  const classObj = (db.classes || []).find(
    (c) => c.id === selectedClassId || c.name === selectedClassId,
  );
  const classDisplayName = classObj ? classObj.name : "7Б";

  const students = (db.students || [])
    .filter(
      (s) =>
        (!s.classId && selectedClassId === "class-7b") ||
        s.classId === selectedClassId,
    )
    .slice()
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
  const subjects = db.subjects || [];

  const teacherObj = isSubjectTeacher
    ? (db.teachers || []).find(
        (t) =>
          t.accountUserId === currentUser.id ||
          t.id === currentUser.teacherId ||
          (currentUser.personName && t.fullName === currentUser.personName) ||
          (currentUser.shortName && t.shortName === currentUser.shortName),
      )
    : null;
  const fullTeacherWorkload =
    teacherObj && Array.isArray(teacherObj.workload) ? teacherObj.workload : [];
  const teacherWorkload = fullTeacherWorkload.filter(
    (w) => w.classId === selectedClassId || w.className === classDisplayName,
  );
  const teacherSubjectIds = new Set(teacherWorkload.map((w) => w.subjectId));
  const availableSubjectsForUser = isSubjectTeacher
    ? subjects.filter((s) => teacherSubjectIds.has(s.id) || (teacherObj && s.teacher === teacherObj.shortName))
    : subjects;

  let selectedSubjectId = options.subjectId;
  if (isSubjectTeacher) {
    const hasValidSubject = availableSubjectsForUser.some(
      (s) => s.id === selectedSubjectId,
    );
    if (!hasValidSubject) {
      selectedSubjectId = availableSubjectsForUser[0]
        ? availableSubjectsForUser[0].id
        : "math";
    }
  } else {
    selectedSubjectId = selectedSubjectId || "all";
  }

  const allLessons = (db.lessons || [])
    .filter(
      (l) =>
        (!l.classId && selectedClassId === "class-7b") ||
        l.classId === selectedClassId,
    )
    .slice()
    .sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.lessonNumber || 0) - (b.lessonNumber || 0);
  });
  const allGrades = db.grades || [];
  const allAttendance = db.attendance || [];
  const allComments = db.journalComments || [];
  const selectedPeriodId = options.periodId || "q1_2024";
  const selectedWeek = options.weekId || "all";
  const filterStatus =
    options.filterStatus ||
    (options.filterUnconfirmedOnly
      ? "unconfirmed"
      : options.filterOnlyAbsences
        ? "absences"
        : "all");
  const isUnconfirmedOnly =
    filterStatus === "unconfirmed" ||
    options.filterUnconfirmedOnly === true ||
    options.filterUnconfirmedOnly === "true";
  const isAbsencesOnly =
    filterStatus === "absences" ||
    options.filterOnlyAbsences === true ||
    options.filterOnlyAbsences === "true" ||
    isUnconfirmedOnly;
  const filterOnlyAbsences = isAbsencesOnly;
  const filterUnconfirmedOnly = isUnconfirmedOnly;
  const isGradesOnly = filterStatus === "grades";
  const filterOnlyEntries =
    options.filterOnlyEntries === true || options.filterOnlyEntries === "true";
  const highlightUnconfirmed =
    options.highlightUnconfirmed === true ||
    options.highlightUnconfirmed === "true";
  const searchQuery = (options.searchQuery || "").trim().toLowerCase();

  let lessons = allLessons.filter((l) => l.periodId === selectedPeriodId);
  if (selectedSubjectId !== "all") {
    lessons = lessons.filter((l) => l.subjectId === selectedSubjectId);
  }
  if (selectedWeek !== "all") {
    const weekNum = parseInt(selectedWeek.replace("w", ""), 10);
    if (!isNaN(weekNum)) {
      lessons = lessons.filter((l) => l.weekIndex === weekNum);
    }
  }

  if (filterOnlyEntries) {
    const lessonIdsWithEntries = new Set([
      ...allGrades
        .filter(
          (g) =>
            g.periodId === selectedPeriodId &&
            (selectedSubjectId === "all" || g.subjectId === selectedSubjectId),
        )
        .map((g) => g.lessonId),
      ...allAttendance
        .filter((a) => a.value === "absent")
        .map((a) => a.lessonId),
    ]);
    lessons = lessons.filter((l) => lessonIdsWithEntries.has(l.id));
  }

  const gradesMap = new Map();
  allGrades.forEach((g) => gradesMap.set(`${g.lessonId}_${g.studentId}`, g));

  const attendanceMap = new Map();
  allAttendance.forEach((a) =>
    attendanceMap.set(`${a.lessonId}_${a.studentId}`, a),
  );

  const commentsMap = new Map();
  allComments.forEach((c) => {
    const key = `${c.lessonId}_${c.studentId}`;
    if (!commentsMap.has(key)) commentsMap.set(key, []);
    commentsMap.get(key).push(c);
  });

  const periodGrades = allGrades.filter((g) => {
    if (g.periodId !== selectedPeriodId) return false;
    if (selectedSubjectId !== "all" && g.subjectId !== selectedSubjectId)
      return false;
    return true;
  });

  const periodLessons = allLessons.filter((l) => {
    if (l.periodId !== selectedPeriodId) return false;
    if (selectedSubjectId !== "all" && l.subjectId !== selectedSubjectId)
      return false;
    return true;
  });
  const periodLessonIds = new Set(periodLessons.map((l) => l.id));

  const periodAttendance = allAttendance.filter((a) =>
    periodLessonIds.has(a.lessonId),
  );
  const periodAbsences = periodAttendance.filter((a) => a.value === "absent");
  const periodUnconfirmed = periodAbsences.filter(
    (a) =>
      a.status === "unconfirmed" || a.status === "unexcused" || a.code === "Н",
  );
  const periodExcused = periodAbsences.filter(
    (a) => a.status === "excused" || a.code === "УП" || a.code === "Б",
  );

  const avgGrade =
    periodGrades.length > 0
      ? (
          periodGrades.reduce((sum, g) => sum + g.value, 0) /
          periodGrades.length
        ).toFixed(1)
      : "—";

  let filteredStudents = students;
  if (searchQuery) {
    filteredStudents = filteredStudents.filter((s) =>
      s.fullName.toLowerCase().includes(searchQuery),
    );
  }

  if (isUnconfirmedOnly) {
    filteredStudents = filteredStudents.filter((s) => {
      return lessons.some((l) => {
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return (
          att &&
          att.value === "absent" &&
          (att.status === "unconfirmed" ||
            att.status === "unexcused" ||
            att.code === "Н")
        );
      });
    });
  } else if (isAbsencesOnly) {
    filteredStudents = filteredStudents.filter((s) => {
      return lessons.some((l) => {
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return att && att.value === "absent";
      });
    });
  } else if (isGradesOnly) {
    filteredStudents = filteredStudents.filter((s) => {
      return lessons.some((l) => gradesMap.has(`${l.id}_${s.id}`));
    });
  }

  if (filterOnlyEntries) {
    filteredStudents = filteredStudents.filter((s) => {
      return lessons.some((l) => {
        const grade = gradesMap.get(`${l.id}_${s.id}`);
        const att = attendanceMap.get(`${l.id}_${s.id}`);
        return !!grade || (att && att.value === "absent");
      });
    });
  }

  const tableHeaderColumns = lessons
    .map((l) => {
      const [year, month, day] = l.date.split("-");
      const dateFormatted = `${day}.${month}`;
      const subject = subjects.find((s) => s.id === l.subjectId);
      const subShort = subject ? subject.shortName : l.subjectName || "";
      const isClosed = l.status === "closed";

      return `
      <th class="px-2.5 py-3 text-center border-b border-slate-200 border-r border-slate-100 text-slate-700 bg-slate-50 font-semibold min-w-[56px] select-none text-[11px] leading-tight"
          title="${l.subjectName || ""} · ${l.date} (${l.time}) · ${l.teacher || ""}">
        <div class="font-bold text-slate-900">${dateFormatted}</div>
        <div class="text-[10px] text-slate-500 font-normal truncate max-w-[65px] mx-auto">${subShort}</div>
        <div class="text-[9px] text-slate-400 font-normal flex items-center justify-center space-x-0.5 mt-0.5">
          <span>${l.lessonNumber} ур</span>
          ${isClosed ? `<span title="Урок завершён">${renderIcon("lock", "w-2.5 h-2.5 text-slate-400")}</span>` : ""}
        </div>
      </th>
    `;
    })
    .join("");

  const tableRows = filteredStudents
    .map((s, idx) => {
      const studentGrades = periodGrades.filter((g) => g.studentId === s.id);
      const studentAvg =
        studentGrades.length > 0
          ? (
              studentGrades.reduce((sum, g) => sum + g.value, 0) /
              studentGrades.length
            ).toFixed(1)
          : "—";

      const studentAbsences = periodAbsences.filter(
        (a) => a.studentId === s.id,
      );
      const studentUnconfirmed = studentAbsences.filter(
        (a) =>
          a.status === "unconfirmed" ||
          a.status === "unexcused" ||
          a.code === "Н",
      );

      const lessonCells = lessons
        .map((l) => {
          const grade = gradesMap.get(`${l.id}_${s.id}`);
          const att = attendanceMap.get(`${l.id}_${s.id}`);
          const comments = commentsMap.get(`${l.id}_${s.id}`) || [];
          const hasComments = comments.length > 0;
          const isClosed = l.status === "closed";

          let cellContent = "";
          let cellBg = "hover:bg-slate-50/80";
          let tooltip = `${s.fullName} · ${l.date} (${l.subjectName || ""})`;

          const isAbsent = att && att.value === "absent";
          const isExcused =
            isAbsent &&
            (att.status === "excused" ||
              att.status === "confirmed" ||
              att.code === "УП" ||
              att.code === "Б");
          const isUnconfirmed =
            isAbsent &&
            (att.status === "unconfirmed" ||
              att.status === "unexcused" ||
              att.code === "Н");

          if (isExcused) {
            tooltip += ` · Пропуск: уважительная причина (${att.reason || "Справка"})`;
            cellBg = "bg-indigo-50/20 hover:bg-indigo-50/50";
          } else if (isUnconfirmed) {
            tooltip += ` · Пропуск: Не подтверждён (требуется справка)`;
            cellBg = "bg-rose-50/30 hover:bg-rose-50/60";
          } else if (grade) {
            tooltip += ` · Оценка: ${grade.value} (Учитель: ${grade.teacher || "Предметник"})`;
          } else if (att && (att.value === "present" || att.code === "Был")) {
            tooltip += " · Присутствовал на уроке";
          }

          if (isSubjectTeacher) {
            if (isClosed) {
              const badgeColor = isAbsent
                ? (isExcused ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-rose-50 text-rose-700 border-rose-300")
                : grade
                  ? "bg-slate-100 text-slate-800 border-slate-300"
                  : "bg-slate-50 text-slate-400 border-slate-200";
              cellContent = `
                <div class="flex items-center justify-center space-x-1" title="Урок завершён. Изменение и удаление недоступно">
                  <input type="text"
                         class="grade-input w-7 h-7 text-center text-xs font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none pointer-events-none"
                         value="${grade ? grade.value : ''}"
                         disabled
                         data-lesson-id="${l.id}"
                         data-student-id="${s.id}"
                         title="Урок завершён. Изменение и удаление оценок недоступно" />
                  ${isAbsent ? `<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold rounded ${badgeColor}">${isExcused ? 'Б' : 'Н'}</span>` : ''}
                </div>
              `;
            } else {
              if (isAbsent) {
                cellContent = `
                  <div class="flex items-center justify-center space-x-1">
                    <input type="text"
                           class="grade-input w-7 h-7 text-center text-xs font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200/70 hover:border-slate-300 transition-colors cursor-pointer select-none"
                           value=""
                           disabled
                           data-lesson-id="${l.id}"
                           data-student-id="${s.id}"
                           placeholder="—"
                           title="Ученик отсутствовал. Кликните для открытия карточки записи" />
                    <button type="button"
                            class="btn-toggle-absence inline-flex items-center justify-center min-w-[22px] h-6 px-1 text-xs font-bold rounded-lg border shadow-2xs transition-all ${isExcused ? 'bg-indigo-50 text-indigo-700 border-indigo-200 cursor-not-allowed' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 cursor-pointer'}"
                            data-lesson-id="${l.id}"
                            data-student-id="${s.id}"
                            data-status="${isExcused ? 'confirmed' : 'unconfirmed'}"
                            title="${isExcused ? 'Причина подтверждена классным руководителем' : 'Отсутствовал (нажмите, чтобы снять отметку)'}">
                      ${isExcused ? 'Б' : 'Н'}
                    </button>
                  </div>
                `;
              } else {
                cellContent = `
                  <div class="flex items-center justify-center space-x-1">
                    <input type="text"
                           class="grade-input w-7 h-7 text-center text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                           value="${grade ? grade.value : ''}"
                           maxlength="1"
                           data-lesson-id="${l.id}"
                           data-student-id="${s.id}"
                           placeholder="—"
                           title="Оценка (2, 3, 4, 5)" />
                    <button type="button"
                            class="btn-toggle-absence inline-flex items-center justify-center w-5 h-6 text-[10px] font-bold text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            data-lesson-id="${l.id}"
                            data-student-id="${s.id}"
                            data-status="present"
                            title="Отметить отсутствие ('Н')">
                      Н
                    </button>
                  </div>
                `;
              }
            }
          } else {
            if (isExcused) {
              cellContent = `
                <span class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                      title="Уважительная причина: ${att.reason || 'Болезнь / справка'}">
                  Б
                </span>
              `;
            } else if (isUnconfirmed) {
              cellContent = `
                <span class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
                      title="Отсутствовал (причина не подтверждена, требуется справка)">
                  Н
                </span>
              `;
            } else if (grade) {
              let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
              if (grade.value === 5)
                badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs";
              else if (grade.value === 4)
                badgeClass = "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs";
              else if (grade.value === 3)
                badgeClass = "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs";
              else if (grade.value === 2)
                badgeClass = "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs";

              cellContent = `
                <span class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-lg border ${badgeClass}">
                  ${grade.value}
                </span>
              `;
            } else {
              cellContent = '<span class="text-slate-300 font-light select-none">·</span>';
            }
          }

          const commentIndicator = hasComments
            ? `<span class="indicator-comment absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white pointer-events-none" title="Комментарии: ${comments.length}"></span>`
            : "";

          const cellStatusClass = isUnconfirmed
            ? "journal-cell-unconfirmed"
            : "journal-cell-normal";

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
        })
        .join("");

      return `
      <tr class="hover:bg-slate-50/70 transition-colors group student-row" data-student-name="${s.fullName}">
        <td class="px-3.5 py-2.5 text-xs font-semibold text-slate-900 border-b border-slate-200 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[210px] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
          <div class="flex items-center space-x-2.5">
            <span class="w-6 text-center text-slate-400 font-semibold flex-shrink-0">${idx + 1}</span>
            ${
              isSubjectTeacher
                ? `<span class="truncate font-semibold text-slate-900">${s.fullName}</span>`
                : `<a href="/overview?student=${s.id}" class="hover:text-brand-600 transition-colors truncate font-semibold text-slate-900">${s.fullName}</a>`
            }
          </div>
        </td>
        <td class="student-avg-cell px-2.5 py-2.5 text-xs text-center border-b border-slate-200 border-r border-slate-200 bg-slate-50/50 font-bold whitespace-nowrap ${studentAvg !== "—" && parseFloat(studentAvg) < 3.5 ? "text-amber-700 bg-amber-50/30" : "text-slate-800"}" data-student-id="${s.id}">
          ${studentAvg}
        </td>
        <td class="student-absences-cell px-2 py-2.5 text-xs text-center border-b border-slate-200 border-r border-slate-200 bg-slate-50/30 whitespace-nowrap" data-student-id="${s.id}">
          ${
            studentAbsences.length > 0
              ? `<span class="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-700">
                 <span>${studentAbsences.length}</span>
                 ${studentUnconfirmed.length > 0 ? `<span class="text-rose-600 font-bold" title="Неподтверждённых: ${studentUnconfirmed.length}">(${studentUnconfirmed.length}Н)</span>` : ""}
               </span>`
              : '<span class="text-slate-300">0</span>'
          }
        </td>
        ${lessonCells}
      </tr>
    `;
    })
    .join("");

  return `
    <div class="space-y-6 animate-fadeIn pb-12">
      ${
        isSubjectTeacher
          ? `
        <nav id="journal-breadcrumbs" aria-label="Хлебные крошки" class="flex items-center space-x-2 text-xs font-medium text-slate-500">
          <a href="/classes" id="crumb-classes" class="hover:text-brand-600 transition-colors flex items-center space-x-1">
            <span>Мои классы</span>
          </a>
          <span class="text-slate-300">/</span>
          <span class="text-slate-900 font-semibold truncate">Журнал класса ${classDisplayName}</span>
        </nav>
      `
          : ""
      }
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2.5 mb-1">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Журнал класса ${classDisplayName}</h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              ${subjects.find((s) => s.id === selectedSubjectId)?.name || "Все предметы"}
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-2.5">
          ${
            isSubjectTeacher
              ? `
            <button type="button" id="btn-save-journal"
                    class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer">
              ${renderIcon("check-square", "w-4 h-4 text-white")}
              <span>Сохранить</span>
            </button>
          `
              : `
            <a href="/attendance"
               class="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs">
              ${renderIcon("check-square", "w-4 h-4 text-brand-500")}
              <span>Подтверждение пропусков</span>
            </a>
          `
          }
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
            <span id="stat-total-grades" class="text-2xl font-bold text-slate-900">${periodGrades.length}</span>
            <span id="stat-total-grades-label" class="text-xs text-slate-500">${periodGrades.length % 10 === 1 && periodGrades.length % 100 !== 11 ? "оценка" : periodGrades.length % 10 >= 2 && periodGrades.length % 10 <= 4 && (periodGrades.length % 100 < 10 || periodGrades.length % 100 >= 20) ? "оценки" : "оценок"}</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Средний балл</div>
          <div class="flex items-baseline space-x-2">
            <span id="stat-avg-grade" class="text-2xl font-bold text-slate-900">${avgGrade}</span>
            <span class="text-xs text-emerald-600 font-medium">класс 7Б</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Пропуски за период</div>
          <div class="flex items-baseline space-x-2">
            <span id="stat-total-absences" class="text-2xl font-bold text-slate-900">${periodAbsences.length}</span>
            <span id="stat-unconfirmed-absences" class="text-xs font-semibold ${periodUnconfirmed.length > 0 ? "text-rose-600" : "text-emerald-600"}" title="Требуют справку">
              ${periodUnconfirmed.length > 0 ? `${periodUnconfirmed.length} не подтверждено` : "Все подтверждены"}
            </span>
          </div>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${isSubjectTeacher ? "5" : "4"} gap-3">
          ${
            isSubjectTeacher && fullTeacherWorkload.length > 0
              ? `
          <div>
            <label for="select-journal-class" class="block text-xs font-semibold text-slate-700 mb-1.5">Класс</label>
            <div class="relative">
              <select id="select-journal-class"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer text-slate-800 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all">
                ${fullTeacherWorkload
                  .map(
                    (w) => `
                  <option value="${w.classId}" data-subject-id="${w.subjectId}" ${w.classId === selectedClassId ? "selected" : ""}>
                    ${w.className} (${w.subjectLabel || "Математика"})
                  </option>
                `,
                  )
                  .join("")}
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>
          `
              : ""
          }
          <div>
            <label for="select-journal-subject" class="block text-xs font-semibold text-slate-700 mb-1.5">Предмет</label>
            <div class="relative">
              ${
                isSubjectTeacher
                  ? `
                <select id="select-journal-subject"
                        ${availableSubjectsForUser.length <= 1 ? "disabled" : ""}
                        class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 ${availableSubjectsForUser.length <= 1 ? "bg-slate-100 text-slate-600 cursor-not-allowed select-none" : "bg-white hover:border-slate-300 cursor-pointer text-slate-800"} text-xs font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all">
                  ${availableSubjectsForUser
                    .map(
                      (sub) => `
                    <option value="${sub.id}" ${selectedSubjectId === sub.id || availableSubjectsForUser.length === 1 ? "selected" : ""}>
                      ${sub.name} (${sub.teacher || "Учитель"})
                    </option>
                  `,
                    )
                    .join("")}
                </select>
                `
                  : `
                <select id="select-journal-subject"
                        class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="all" ${selectedSubjectId === "all" ? "selected" : ""}>Все предметы (сводный журнал)</option>
                  ${subjects
                    .map(
                      (sub) => `
                    <option value="${sub.id}" ${selectedSubjectId === sub.id ? "selected" : ""}>
                      ${sub.name} (${sub.teacher || "Учитель"})
                    </option>
                  `,
                    )
                    .join("")}
                </select>
                `
              }
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>

          <div>
            <label for="select-journal-week" class="block text-xs font-semibold text-slate-700 mb-1.5">Учебный период</label>
            <div class="relative">
              <select id="select-journal-week"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="all" ${selectedWeek === "all" ? "selected" : ""}>Вся I четверть (02.09 – 25.10.2024)</option>
                <option value="w8" ${selectedWeek === "w8" ? "selected" : ""}>8 неделя (21.10 – 25.10.2024) — Текущая</option>
                <option value="w7" ${selectedWeek === "w7" ? "selected" : ""}>7 неделя (14.10 – 18.10.2024)</option>
                <option value="w6" ${selectedWeek === "w6" ? "selected" : ""}>6 неделя (07.10 – 11.10.2024)</option>
                <option value="w5" ${selectedWeek === "w5" ? "selected" : ""}>5 неделя (30.09 – 04.10.2024)</option>
                <option value="w4" ${selectedWeek === "w4" ? "selected" : ""}>4 неделя (23.09 – 27.09.2024)</option>
                <option value="w3" ${selectedWeek === "w3" ? "selected" : ""}>3 неделя (16.09 – 20.09.2024)</option>
                <option value="w2" ${selectedWeek === "w2" ? "selected" : ""}>2 неделя (09.09 – 13.09.2024)</option>
                <option value="w1" ${selectedWeek === "w1" ? "selected" : ""}>1 неделя (02.09 – 06.09.2024)</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
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
                <button type="button" id="btn-clear-search" class="${searchQuery ? "" : "hidden"} text-slate-400 hover:text-slate-600 p-0.5">
                  ${renderIcon("x", "w-3.5 h-3.5")}
                </button>
                <span id="icon-search-glass" class="${searchQuery ? "hidden" : ""}">
                  ${renderIcon("search", "w-4 h-4")}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label for="select-journal-status" class="block text-xs font-semibold text-slate-700 mb-1.5">Отметки и пропуски</label>
            <div class="relative">
              <select id="select-journal-status"
                      class="w-full appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="all" ${filterStatus === "all" && !filterOnlyAbsences ? "selected" : ""}>Все отметки и пропуски</option>
                <option value="unconfirmed" ${filterStatus === "unconfirmed" || filterUnconfirmedOnly ? "selected" : ""}>Только неподтверждённые («Н»)</option>
                <option value="absences" ${filterStatus === "absences" || (filterOnlyAbsences && !filterUnconfirmedOnly) ? "selected" : ""}>Все пропуски («Н», «Б», «УП»)</option>
                <option value="grades" ${filterStatus === "grades" ? "selected" : ""}>Только оценки</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-600">
          <div class="flex items-center gap-2.5 flex-nowrap shrink-0">
            <span class="inline-flex items-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-0.5 select-none">Быстрые действия:</span>
            <button type="button" id="btn-toggle-highlight-unconfirmed"
                    class="inline-flex items-center h-9 space-x-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${highlightUnconfirmed ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}">
              <span class="w-2 h-2 rounded-full ${highlightUnconfirmed ? "bg-rose-600 animate-pulse" : "bg-rose-400"}"></span>
              <span>Подсветить неподтверждённые («Н»)</span>
              <span class="badge-unconfirmed-count px-1.5 py-0.5 rounded-full text-[10px] font-bold ${highlightUnconfirmed ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"}">
                ${periodUnconfirmed.length}
              </span>
            </button>

            <label for="check-only-entries"
                   class="inline-flex items-center h-9 space-x-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer select-none whitespace-nowrap shadow-2xs">
              <input type="checkbox" id="check-only-entries"
                     ${filterOnlyEntries ? "checked" : ""}
                     class="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
              <span class="font-medium text-slate-700 text-xs">Показывать только записи</span>
            </label>
          </div>

          <div class="inline-flex items-center h-9 gap-2.5 px-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-2xs whitespace-nowrap shrink-0 self-start md:self-auto">
            <span class="text-[11px] font-semibold text-slate-500">Обозначения:</span>
            <div class="flex items-center space-x-1">
              <span class="legend-badge text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300" title="Оценка 5">5</span>
              <span class="legend-badge text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300" title="Оценка 4">4</span>
              <span class="legend-badge text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300" title="Оценка 3">3</span>
              <span class="legend-badge text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300" title="Оценка 2">2</span>
            </div>
            <div class="h-3.5 w-px bg-slate-200"></div>
            <div class="flex items-center space-x-1">
              <span class="legend-badge text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Б</span>
              <span class="text-slate-500 text-[11px]">— уваж.</span>
            </div>
            <div class="h-3.5 w-px bg-slate-200"></div>
            <div class="flex items-center space-x-1">
              <span class="legend-badge text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">Н</span>
              <span class="text-slate-500 text-[11px]">— неуваж.</span>
            </div>
            <div class="h-3.5 w-px bg-slate-200"></div>
            <div class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white flex-shrink-0"></span>
              <span class="text-slate-500 text-[11px]">— коммент.</span>
            </div>
          </div>
        </div>
      </div>

      <style>
        .legend-badge {
          width: 20px !important;
          height: 20px !important;
          min-width: 20px !important;
          flex-shrink: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 6px !important;
        }
        .journal-highlight-mode .journal-cell-unconfirmed span {
          outline: 2px solid #e11d48 !important;
          outline-offset: 1px !important;
          background-color: #ffe4e6 !important;
          color: #9f1239 !important;
          font-weight: 800 !important;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.25) !important;
        }
        .journal-highlight-mode .journal-cell-unconfirmed {
          background-color: #fff1f2 !important;
        }
        .journal-highlight-mode .journal-cell-normal > div {
          opacity: 0.25;
          transition: opacity 0.15s ease-in-out;
        }
        .journal-highlight-mode .journal-cell-normal:hover > div {
          opacity: 1;
        }
        .journal-empty-sticky-box {
          position: sticky;
          left: 0;
          box-sizing: border-box;
        }
      </style>

      <div id="journal-table-container" class="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden ${highlightUnconfirmed ? "journal-highlight-mode" : ""}">
        <div id="journal-table-scroll" class="overflow-x-auto scrollbar-thin">
          <table class="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th class="px-3.5 py-3 border-b border-slate-200 border-r border-slate-200 text-slate-700 bg-slate-50 font-bold text-xs sticky left-0 z-20 min-w-[210px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  <div class="flex items-center space-x-2">
                    <span class="w-6 text-center text-slate-400 font-semibold flex-shrink-0">№</span>
                    <span>Ученик (${students.length} чел.)</span>
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
              ${
                tableRows.length > 0
                  ? tableRows
                  : `
                <tr>
                  <td colspan="${lessons.length + 3}" class="p-0 border-b border-slate-100">
                    <div class="journal-empty-sticky-box py-12 px-6 flex flex-col items-center justify-center text-center">
                      <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                        ${renderIcon("search", "w-5 h-5")}
                      </div>
                      <div class="text-sm font-semibold text-slate-700">По заданным критериям ничего не найдено</div>
                      <div class="text-xs text-slate-400 mt-1 max-w-sm">Попробуйте изменить выбранные фильтры или сбросить параметры</div>
                    </div>
                  </td>
                </tr>
              `
              }
              <tr id="journal-search-no-results" style="display: none;">
                <td colspan="${lessons.length + 3}" class="p-0 border-b border-slate-100">
                  <div class="journal-empty-sticky-box py-12 px-6 flex flex-col items-center justify-center text-center">
                    <div class="text-sm font-semibold text-slate-700">По данному поисковому запросу ученики не найдены</div>
                    <div class="text-xs text-slate-400 mt-1 max-w-sm">Проверьте правильность написания или сбросьте фильтр поиска</div>
                    <button type="button" id="btn-reset-empty-search" class="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors cursor-pointer shadow-2xs">
                      ${renderIcon("x", "w-3.5 h-3.5")}
                      <span>Сбросить поиск</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-journal-entry" class="fixed inset-0 z-50 !m-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-200">
      <div id="modal-journal-dialog" class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 transform scale-95 transition-all duration-200 max-h-[92vh] overflow-y-auto scrollbar-thin">
        
        <div class="flex items-start justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
              ${renderIcon("book-open", "w-5 h-5 text-brand-600")}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 id="entry-modal-subject" class="text-base font-bold text-slate-900 leading-tight">Запись в журнале</h3>
                <span id="entry-modal-lesson-date-badge" class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"></span>
              </div>
              <p id="entry-modal-lesson-info" class="text-xs text-slate-500 mt-0.5">Дата, кабинет, преподаватель</p>
            </div>
          </div>
          <button type="button" id="btn-close-journal-modal" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0 -mr-1 -mt-1" title="Закрыть">
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <div class="pt-4 pb-3 space-y-3 text-xs">
          <div class="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div id="entry-modal-student-avatar" class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
                УЧ
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span id="entry-modal-student-name" class="text-sm font-bold text-slate-900 leading-tight">—</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 shadow-sm">7Б класс</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5">Ученик класса · Полная сводка успеваемости</p>
              </div>
            </div>
            <a id="entry-modal-student-link" href="/overview" class="${isSubjectTeacher ? "hidden " : ""}px-2.5 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-brand-600 border border-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1 flex-shrink-0 shadow-sm">
              <span>Профиль</span>
              ${renderIcon("external-link", "w-3.5 h-3.5")}
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Оценка за урок</div>
              <div id="entry-modal-grade-badge" class="h-10 flex items-center">
                <span class="text-slate-400 text-xs">Оценка не выставлялась</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Посещаемость</div>
              <div id="entry-modal-attendance-badge" class="h-10 flex items-center">
                <span class="text-emerald-700 font-semibold text-xs">Был на уроке</span>
              </div>
            </div>
          </div>

          <div id="entry-modal-absence-details" class="hidden p-3.5 rounded-xl border text-xs">
          </div>

          ${
            !isSubjectTeacher
              ? `<div id="block-confirm-from-journal" class="hidden">
            <button type="button" id="btn-quick-confirm-absence"
                    class="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer border border-brand-600/30">
              ${renderIcon("check-square", "w-4 h-4 text-white")}
              <span>Подтвердить уважительную причину</span>
            </button>
          </div>`
              : ""
          }

          <div class="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden shadow-sm">
            <div class="px-3.5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                  ${renderIcon("message-square", "w-3.5 h-3.5")}
                </span>
                <span class="text-xs font-bold text-slate-800">Чат записи</span>
                <span id="entry-modal-comments-count" class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">0</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium">Заметки и сообщения</span>
            </div>

            <div id="entry-modal-comments-list" class="p-3 space-y-2 max-h-36 overflow-y-auto">
            </div>

            <form id="form-add-journal-comment" class="p-2.5 bg-white border-t border-slate-200">
              <div class="relative flex items-center">
                <input type="text"
                       id="input-journal-comment-text"
                       placeholder="Написать примечание или комментарий..."
                       autocomplete="off"
                       class="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                <button type="submit"
                        id="btn-send-journal-comment"
                        title="Отправить сообщение"
                        class="absolute w-7 h-7 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm flex-shrink-0"
                        style="width: 28px; height: 28px; min-width: 28px; right: 8px; top: 50%; transform: translateY(-50%);">
                  ${renderIcon("send", "w-3.5 h-3.5")}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex justify-end">
          <button type="button" id="btn-close-journal-modal-footer"
                  class="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
            Закрыть
          </button>
        </div>
      </div>
    </div>

    <div id="modal-journal-confirm-absence" class="fixed inset-0 z-[60] !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none" style="z-index: 60;">
      <div id="modal-journal-confirm-dialog" class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
              ${renderIcon("check-square", "w-5 h-5 text-brand-600")}
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Подтверждение пропуска урока</h3>
              <p class="text-[11px] text-slate-500">Учёт уважительной причины и медицинских документов</p>
            </div>
          </div>
          <button type="button" id="btn-close-journal-confirm-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <form id="form-journal-confirm-absence" class="space-y-4">
          <input type="hidden" id="journal-confirm-attendance-id" />

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Ученик</label>
            <div class="relative flex items-center">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("user", "w-4 h-4 text-slate-400")}
              </div>
              <input type="text" id="journal-confirm-student-name" readonly tabindex="-1"
                     class="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Дата пропуска</label>
              <input type="text" id="journal-confirm-absence-date" readonly tabindex="-1"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Урок / Предмет</label>
              <input type="text" id="journal-confirm-absence-lesson" readonly tabindex="-1"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div>
            <label for="journal-confirm-reason-type" class="block text-xs font-semibold text-slate-700 mb-1.5">Тип причины</label>
            <div class="relative">
              <select id="journal-confirm-reason-type" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="excused">Уважительная (по справке от врача / заявлению родителей)</option>
                <option value="unexcused">Неуважительная (прогул / причина не подтверждена)</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>

          <div id="block-journal-document-fields" class="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <label for="journal-confirm-has-certificate" class="flex items-center space-x-2 cursor-pointer select-none">
              <input type="checkbox" id="journal-confirm-has-certificate" checked class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
              <span class="text-xs font-semibold text-slate-800">Предоставлен подтверждающий документ (справка / заявление)</span>
            </label>

            <div>
              <label for="journal-confirm-document-text" class="block text-xs font-semibold text-slate-700 mb-1">
                Реквизиты документа (номер, дата, медучреждение)
              </label>
              <input type="text" id="journal-confirm-document-text"
                     placeholder="Справка № 142 от 25.10.2024 (ДГП № 1)"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
            </div>
          </div>

          <div>
            <label for="journal-confirm-notes" class="block text-xs font-semibold text-slate-700 mb-1.5">Комментарий классного руководителя</label>
            <textarea id="journal-confirm-notes" rows="2" placeholder="Дополнительное примечание к пропуску..."
                      class="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
          </div>

          <div class="pt-2 flex items-center space-x-2.5">
            <button type="button" id="btn-cancel-journal-confirm" class="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="submit" class="flex-1 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer">
              Подтвердить пропуск
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
