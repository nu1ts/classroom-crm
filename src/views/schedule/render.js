import { getCurrentUser, getDB } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { SCHEDULE_WEEKS, TIME_SLOTS, getWeekDays } from "./helpers.js";

function getClassBadgeStyle(className) {
  if (className.includes("7Б")) {
    return "bg-blue-50 text-blue-700 border border-blue-200/80";
  }
  if (className.includes("8А")) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200/80";
  }
  if (className.includes("9В")) {
    return "bg-purple-50 text-purple-700 border border-purple-200/80";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export function renderScheduleView(options = {}) {
  const currentUser = getCurrentUser();
  const db = getDB();
  const isSubjectTeacher = currentUser && currentUser.role === "subject_teacher";
  const isParent = currentUser && currentUser.role === "parent";
  const isStudent = currentUser && currentUser.role === "student";
  const isTeacher = currentUser && (currentUser.role === "teacher" || currentUser.role === "admin");

  let allowedClassId = "class-7b";
  if (isParent) {
    const child = (db.students || []).find((s) => s.id === currentUser.childStudentId);
    allowedClassId = (child && child.classId) || currentUser.classId || "class-7b";
  } else if (currentUser && currentUser.classId) {
    allowedClassId = currentUser.classId;
  }

  const requestedClassId = options.classId || (new URLSearchParams(window.location.search || "")).get("classId") || (new URLSearchParams(window.location.search || "")).get("class");
  const isAccessDenied = Boolean(
    (isParent || isStudent) &&
      requestedClassId &&
      requestedClassId !== allowedClassId &&
      requestedClassId !== "class-7b" &&
      requestedClassId !== "7Б" &&
      requestedClassId !== "7б"
  );

  const queryString = window.location.search || "";
  const urlParams = new URLSearchParams(queryString);
  const activeWeekId = options.weekId || urlParams.get("week") || "w8";

  const activeWeekIndex = SCHEDULE_WEEKS.findIndex((w) => w.id === activeWeekId);
  const selectedWeek = activeWeekIndex !== -1 ? SCHEDULE_WEEKS[activeWeekIndex] : SCHEDULE_WEEKS[7]; // default w8

  const prevWeek = activeWeekIndex > 0 ? SCHEDULE_WEEKS[activeWeekIndex - 1] : null;
  const nextWeek = activeWeekIndex < SCHEDULE_WEEKS.length - 1 ? SCHEDULE_WEEKS[activeWeekIndex + 1] : null;

  const weekDays = getWeekDays(selectedWeek.from);
  const weekDateSet = new Set(weekDays.map((d) => d.date));

  const classesMap = new Map((db.classes || []).map((c) => [c.id, c.name]));

  let scheduleLessons = (db.lessons || []).filter((l) => weekDateSet.has(l.date));

  if (isSubjectTeacher) {
    scheduleLessons = scheduleLessons.filter(
      (l) =>
        l.teacher === currentUser.personName ||
        l.teacher === currentUser.shortName ||
        l.teacher === "Козлов А. П."
    );
  } else {
    scheduleLessons = scheduleLessons.filter(
      (l) => (l.classId || "class-7b") === allowedClassId
    );
  }

  const lessonsByDateAndTime = new Map();
  scheduleLessons.forEach((l) => {
    const key = `${l.date}_${l.time}`;
    if (!lessonsByDateAndTime.has(key)) {
      lessonsByDateAndTime.set(key, []);
    }
    lessonsByDateAndTime.get(key).push(l);
  });

  const totalLessonsCount = scheduleLessons.length;
  const isVacationOrEmpty = selectedWeek.isVacation || totalLessonsCount === 0;

  const todayIso = "2024-10-24";

  const displaySlots = TIME_SLOTS;

  return `
    <div class="space-y-5">
      ${
        isAccessDenied
          ? `
        <div id="schedule-forbidden-alert" class="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-2xs">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <div>
              <div class="text-xs font-bold">Доступ к расписанию другого класса отклонён</div>
              <div class="text-[11px] text-amber-700 font-medium">Отображается только расписание вашего класса.</div>
            </div>
          </div>
        </div>
      `
          : ""
      }
      <div class="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center space-x-3.5">
          <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 id="schedule-week-title" class="text-base font-extrabold text-slate-900 tracking-tight">
                Неделя: ${selectedWeek.label.replace(" (Текущая неделя)", "").replace(" (Каникулы)", "")}
              </h2>
              ${
                selectedWeek.id === "w8"
                  ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE9FE] text-[#6D28D9]">Текущая</span>`
                  : selectedWeek.isVacation
                  ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">Каникулы</span>`
                  : ""
              }
              ${
                !isSubjectTeacher
                  ? `<span id="schedule-class-badge" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Класс ${classesMap.get(allowedClassId) || "7Б"}</span>`
                  : ""
              }
              ${
                isStudent || isParent
                  ? `<span id="badge-readonly" class="badge-read-only inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      ${renderIcon("eye", "w-3 h-3 text-slate-500")}
                      Только для просмотра
                    </span>`
                  : ""
              }
            </div>
            <p class="text-xs font-medium text-slate-500 mt-0.5">
              Уроков в расписании: ${totalLessonsCount}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="relative">
            <select id="select-schedule-week"
                    class="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
              ${SCHEDULE_WEEKS.map(
                (w) => `
                <option value="${w.id}" ${w.id === selectedWeek.id ? "selected" : ""}>
                  ${w.label}
                </option>
              `
              ).join("")}
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            ${
              isTeacher
                ? `<button id="btn-add-lesson"
                           class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors cursor-pointer mr-1"
                           title="Добавить занятие">
                     ${renderIcon("plus", "w-3.5 h-3.5")}
                     <span>Добавить занятие</span>
                   </button>`
                : ""
            }<button id="btn-prev-week"
                    data-week-id="${prevWeek ? prevWeek.id : ""}"
                    ${!prevWeek ? "disabled" : ""}
                    class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Предыдущая неделя">
              Предыдущая
            </button>

            <button id="btn-current-week"
                    data-week-id="w8"
                    class="px-4 py-2 rounded-lg text-xs ${selectedWeek.id === "w8" ? "bg-[#EDE9FE] text-[#6D28D9] font-bold" : "bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"} transition-colors cursor-pointer"
                    title="Текущая неделя">
              Текущая
            </button>

            <button id="btn-next-week"
                    data-week-id="${nextWeek ? nextWeek.id : ""}"
                    ${!nextWeek ? "disabled" : ""}
                    class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Следующая неделя">
              Следующая
            </button>
          </div>
        </div>
      </div>

      ${
        isVacationOrEmpty
          ? `
        <div id="schedule-empty-state" class="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">
            ${selectedWeek.isVacation ? "Школьные каникулы" : "Нет занятий на выбранную неделю"}
          </h3>
          <p class="text-xs font-medium text-slate-500 max-w-md mx-auto">
            ${
              selectedWeek.isVacation
                ? "На эту неделю занятия не запланированы (каникулы). Учебный процесс возобновится со следующей недели."
                : "В расписании на указанный период уроки отсутствуют."
            }
          </p>
          <div class="mt-5 flex items-center justify-center gap-3">
            ${
              isTeacher
                ? `<button id="btn-empty-add-lesson"
                           class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors cursor-pointer"
                           title="Добавить занятие">
                     ${renderIcon("plus", "w-3.5 h-3.5")}
                     <span>Добавить занятие</span>
                   </button>`
                : ""
            }<button id="btn-empty-return-current"
                    data-week-id="w8"
                    class="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-[#EDE9FE] hover:bg-[#E0E7FE] text-[#6D28D9] transition-colors cursor-pointer">
              Вернуться на текущую неделю
            </button>
          </div>
        </div>
      `
          : `
        <div id="schedule-grid" class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[840px]">
              <thead>
                <tr class="border-b border-slate-200/90 bg-slate-50/50">
                  <th class="py-3 px-4 w-32 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Время
                  </th>
                  ${weekDays
                    .map((day) => {
                      const isToday = day.date === todayIso;
                      return `
                    <th class="py-3 px-4 text-[11px] font-extrabold ${isToday ? "text-brand-700 bg-brand-50/50 border-b-2 border-brand-500" : "text-slate-600"} uppercase tracking-wider border-l border-slate-100" ${isToday ? 'data-today="true"' : ""}>
                      <div class="flex items-center justify-between">
                        <span>${day.name}</span>
                        <span class="text-[10px] font-bold ${isToday ? "text-brand-600" : "text-slate-400"}">${day.displayDate}</span>
                      </div>
                    </th>
                  `;
                    })
                    .join("")}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${displaySlots
                  .map((slot) => {
                    return `
                  <tr class="hover:bg-slate-50/30 transition-colors">
                    <td class="py-4 px-4 align-top w-32 bg-slate-50/30">
                      <div class="text-xs font-extrabold text-slate-800">${slot.number} урок</div>
                      <div class="text-[11px] font-semibold text-slate-400 mt-0.5">${slot.time}</div>
                    </td>

                    ${weekDays
                      .map((day) => {
                        const lessonsInSlot = lessonsByDateAndTime.get(`${day.date}_${slot.time}`) || [];
                        const isToday = day.date === todayIso;

                        return `
                        <td class="py-3 px-3 align-top border-l border-slate-100 ${isToday ? "bg-brand-50/10" : ""}">
                          ${
                            lessonsInSlot.length > 0
                              ? lessonsInSlot
                                  .map((lesson) => {
                                    const className =
                                      (lesson.classId && classesMap.get(lesson.classId)) ||
                                      (lesson.classId === "class-7b"
                                        ? "7Б"
                                        : lesson.classId === "class-8a"
                                        ? "8А"
                                        : lesson.classId === "class-9v"
                                        ? "9В"
                                        : "7Б");

                                    const badgeStyle = getClassBadgeStyle(className);

                                    return `
                                    <div class="schedule-card bg-white border border-slate-200/90 hover:border-brand-300 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all"
                                         data-lesson-id="${lesson.id}"
                                         data-class-id="${lesson.classId || "class-7b"}"
                                         data-date="${lesson.date}">
                                      
                                      <div class="flex items-start justify-between gap-2.5">
                                        <div>
                                          <div class="text-xs font-bold text-slate-900 leading-snug">
                                            ${lesson.subjectName}
                                          </div>
                                          <div class="text-[11px] font-medium text-slate-500 mt-0.5 lesson-teacher">
                                            ${lesson.teacher || "Козлов А. П."}
                                          </div>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${badgeStyle}">
                                            ${className}
                                          </span>
                                          ${
                                            isTeacher
                                              ? `<div class="flex items-center gap-0.5 ml-1">
                                                   <button type="button"
                                                           data-action="edit-lesson"
                                                           data-lesson-id="${lesson.id}"
                                                           class="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors cursor-pointer"
                                                           title="Изменить занятие">
                                                     ${renderIcon("edit", "w-3.5 h-3.5")}
                                                   </button>
                                                   <button type="button"
                                                           data-action="delete-lesson"
                                                           data-lesson-id="${lesson.id}"
                                                           class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                           title="Отменить занятие">
                                                     ${renderIcon("trash", "w-3.5 h-3.5")}
                                                   </button>
                                                 </div>`
                                              : ""
                                          }
                                        </div>
                                      </div>

                                      <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                                        <span class="font-bold text-brand-600">
                                          ${lesson.room || "Каб. 204"}
                                        </span>
                                        ${
                                          lesson.status === "closed"
                                            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">Проведено</span>`
                                            : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Запланировано</span>`
                                        }
                                      </div>
                                    </div>
                                  `;
                                  })
                                  .join("")
                              : `
                                ${
                                isTeacher
                                  ? `<button type="button"
                                             data-action="slot-add-lesson"
                                             data-date="${day.date}"
                                             data-time="${slot.time}"
                                             class="w-full h-14 border border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/40 rounded-xl flex items-center justify-center text-slate-300 hover:text-brand-600 transition-all cursor-pointer group"
                                             title="Добавить занятие в этот слот">
                                       <span class="text-xs group-hover:hidden select-none">—</span>
                                       <span class="hidden group-hover:inline-flex items-center text-xs font-semibold gap-1">
                                         ${renderIcon("plus", "w-3.5 h-3.5")}
                                       </span>
                                     </button>`
                                  : `<div class="h-14 flex items-center justify-center text-slate-200 text-xs select-none">—</div>`
                              }
                              `
                          }
                        </td>
                      `;
                      })
                      .join("")}
                  </tr>
                `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
      }
      ${
        isTeacher
          ? `
        <div id="modal-lesson-form" class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
          <div id="modal-lesson-dialog" class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
                  ${renderIcon("calendar", "w-5 h-5 text-brand-600")}
                </div>
                <div>
                  <h3 id="modal-lesson-title" class="text-sm font-bold text-slate-900">
                    Добавить занятие
                  </h3>
                  <p class="text-[11px] text-slate-500 font-medium">Планирование и редактирование уроков класса</p>
                </div>
              </div>
              <button type="button" id="btn-close-lesson-modal" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                ${renderIcon("close", "w-4 h-4")}
              </button>
            </div>

            <div id="lesson-room-conflict-error" class="hidden mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold mt-0.5">!</div>
              <div id="lesson-conflict-error-text" class="flex-1 leading-relaxed"></div>
            </div>

            <form id="form-lesson" class="space-y-4">
              <input type="hidden" id="lesson-id-input" value="" />

              <div>
                <label for="lesson-subject-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Предмет</label>
                <div class="relative">
                  <select id="lesson-subject-select" required
                          class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="Физика">Физика</option>
                    <option value="История">История</option>
                    <option value="Математика (Алгебра)">Математика (Алгебра)</option>
                    <option value="Русский язык">Русский язык</option>
                    <option value="Физкультура">Физкультура</option>
                    <option value="Разговоры о важном">Разговоры о важном</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="lesson-class-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Класс</label>
                  <div class="relative">
                    <select id="lesson-class-select" required
                            ${!currentUser || currentUser.role !== "admin" ? "disabled" : ""}
                            class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all ${!currentUser || currentUser.role !== "admin" ? "bg-slate-100/90 text-slate-600 cursor-not-allowed" : "bg-white hover:border-slate-300 cursor-pointer"}">
                      <option value="${allowedClassId}" selected>${classesMap.get(allowedClassId) || "7Б"}</option>
                      ${
                        currentUser && currentUser.role === "admin"
                          ? `
                        <option value="class-8a">8А</option>
                        <option value="class-8b">8Б</option>
                        <option value="class-9v">9В</option>
                      `
                          : ""
                      }
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                    </div>
                  </div>
                </div>

                <div>
                  <label for="lesson-date-select" class="block text-xs font-semibold text-slate-700 mb-1.5">День недели / Дата</label>
                  <div class="relative">
                    <select id="lesson-date-select" required
                            class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      ${weekDays
                        .map(
                          (d) => `
                        <option value="${d.date}">${d.name} (${d.displayDate})</option>
                      `
                        )
                        .join("")}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="lesson-time-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Время / Урок</label>
                  <div class="relative">
                    <select id="lesson-time-select" required
                            class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      ${TIME_SLOTS.map(
                        (s) =>
                          `<option value="${s.time}" ${s.number === 4 ? "selected" : ""}>${s.number} урок (${s.time})</option>`
                      ).join("")}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                    </div>
                  </div>
                </div>

                <div>
                  <label for="lesson-room-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Аудитория</label>
                  <div class="relative">
                    <select id="lesson-room-select" required
                            class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      <option value="Каб. 401">Каб. 401</option>
                      <option value="Каб. 302">Каб. 302</option>
                      <option value="Каб. 204">Каб. 204</option>
                      <option value="Спортзал">Спортзал</option>
                      <option value="Каб. 210">Каб. 210</option>
                      <option value="Каб. 405">Каб. 405</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label for="lesson-teacher-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Учитель</label>
                <div class="relative">
                  <select id="lesson-teacher-select" required
                          class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="Дмитриев Д. К.">Дмитриев Д. К. (Физика)</option>
                    <option value="Морозов В. Д.">Морозов В. Д. (История)</option>
                    <option value="Козлов А. П.">Козлов А. П. (Математика)</option>
                    <option value="Смирнова М. В.">Смирнова М. В. (Классрук)</option>
                    <option value="Иванова Е. С.">Иванова Е. С. (Русский язык)</option>
                    <option value="Новиков С. А.">Новиков С. А. (Физкультура)</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon("chevronDown", "w-3.5 h-3.5")}
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center space-x-2.5">
                <button type="button" id="btn-cancel-lesson-form"
                        class="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" id="btn-save-lesson"
                        class="flex-1 py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-confirm-delete-lesson" class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
          <div id="modal-confirm-delete-lesson-dialog" class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
                  ${renderIcon("alertTriangle", "w-5 h-5 text-rose-600")}
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Отмена занятия</h3>
                  <p class="text-[11px] text-slate-500 font-medium">Удаление урока из расписания</p>
                </div>
              </div>
              <button type="button" id="btn-close-delete-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                ${renderIcon("close", "w-4 h-4")}
              </button>
            </div>

            <div class="mb-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-medium leading-relaxed">
              <p id="cancel-lesson-warning">
                Занятие будет удалено из расписания. Обратите внимание: ранее внесённые записи журнала (оценки и посещаемость) сохраняются.
              </p>
            </div>

            <input type="hidden" id="delete-lesson-id-input" value="" />

            <div class="pt-2 flex items-center space-x-2.5">
              <button type="button" id="btn-cancel-delete-lesson"
                      class="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                Назад
              </button>
              <button type="button" id="btn-confirm-delete-lesson"
                      class="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer">
                Подтвердить отмену
              </button>
            </div>
          </div>
        </div>
        `
          : ""
      }
    </div>
  `;
}