import { getCurrentUser, getDB } from "../../services/storage.js";
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

  const displaySlots = TIME_SLOTS.slice(0, 5);

  return `
    <div class="space-y-5">
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
            <button id="btn-prev-week"
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
          <div class="mt-5">
            <button id="btn-empty-return-current"
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
                    <th class="py-3 px-4 text-[11px] font-extrabold ${isToday ? "text-brand-700 bg-brand-50/30" : "text-slate-600"} uppercase tracking-wider border-l border-slate-100">
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
                                        <div class="text-xs font-bold text-slate-900 leading-snug">
                                          ${lesson.subjectName}
                                        </div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${badgeStyle}">
                                          ${className}
                                        </span>
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
                                <div class="h-14 flex items-center justify-center text-slate-200 text-xs select-none">
                                  —
                                </div>
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
    </div>
  `;
}
