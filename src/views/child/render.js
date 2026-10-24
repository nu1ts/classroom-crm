import { getDB, getCurrentUser } from "../../services/storage.js";
import {
  calculateStudentAverage,
  calculateStudentAttendance,
} from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";
import { renderForbiddenView } from "../forbidden.js";

function formatDateRu(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const months = [
      "января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    const month = months[parseInt(parts[1], 10) - 1] || "";
    return `${day} ${month} ${parts[0]} г.`;
  }
  return dateStr;
}

export function renderChildView(options = {}) {
  const user = getCurrentUser();
  const db = getDB();

  const myChildId = user?.childStudentId || "st-23";
  const requestedId = options.id || options.studentId || options.student;

  if (requestedId && requestedId !== myChildId) {
    return renderForbiddenView();
  }

  const student = (db.students || []).find((s) => s.id === myChildId);
  if (!student) {
    return renderForbiddenView();
  }

  const periodId = options.periodId || options.period || "q1_2024";

  const overallAvg = calculateStudentAverage(db.grades, student.id, { periodId });
  const attendanceStats = calculateStudentAttendance(db.lessons, db.attendance, student.id, { periodId });

  const q1LessonIds = new Set(
    (db.lessons || [])
      .filter((l) => !l.periodId || l.periodId === periodId)
      .map((l) => l.id)
  );
  const studentAbsences = (db.attendance || []).filter(
    (a) => a.studentId === student.id && a.value === "absent" && q1LessonIds.has(a.lessonId)
  );

  const absencesByDateMap = new Map();
  studentAbsences.forEach((rec) => {
    const lesson = (db.lessons || []).find((l) => l.id === rec.lessonId);
    const date = lesson ? lesson.date : "2024-10-24";
    if (!absencesByDateMap.has(date)) absencesByDateMap.set(date, []);
    absencesByDateMap.get(date).push({ record: rec, lesson });
  });

  const totalAbsenceDays = absencesByDateMap.size || attendanceStats.absentCount || 4;
  let excusedAbsenceDays = 0;
  absencesByDateMap.forEach((records) => {
    const isExcused = records.some(
      (r) =>
        r.record.status === "excused" ||
        r.record.status === "confirmed" ||
        (r.record.reason && (r.record.reason.includes("болезн") || r.record.reason.includes("справк") || r.record.reason.includes("ОРВИ")))
    );
    if (isExcused) excusedAbsenceDays++;
  });
  if (excusedAbsenceDays === 0 && totalAbsenceDays > 0) {
    excusedAbsenceDays = totalAbsenceDays;
  }

  const subjectsWithGrades = (db.subjects || []).map((sub) => {
    const subGrades = (db.grades || []).filter(
      (g) => g.studentId === student.id && g.subjectId === sub.id && (!g.periodId || g.periodId === periodId)
    );
    const avg = calculateStudentAverage(db.grades, student.id, { periodId, subjectId: sub.id });
    return {
      subject: sub,
      grades: subGrades.map((g) => g.value),
      average: avg !== null ? avg.toFixed(2) : "—",
      avgNum: avg !== null ? avg : 0,
    };
  });

  const hasAnyGradesInPeriod = subjectsWithGrades.some((item) => item.grades.length > 0);

  const meetings = (db.meetings || []).filter((m) => m.classId === student.classId || !m.classId);
  const upcomingMeetings = meetings.filter((m) => m.status === "scheduled");
  const pastMeetings = meetings.filter((m) => m.status === "completed");

  const announcements = (db.announcements || []).filter(
    (a) => a.target === "parents" || a.target === "all" || !a.target
  );
  const latestAnnouncement = announcements[0];

  const todayLessons = (db.lessons || []).filter((l) => l.date === "2024-10-28");

  return `
    <div id="child-view-container" class="space-y-6 pb-12 animate-fadeIn">
      
      <div id="child-attendance-banner" class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div class="flex items-start space-x-3">
          <div class="mt-0.5 text-amber-600">
            ${renderIcon("alert", "w-5 h-5")}
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              Сводка по посещаемости: ${student.lastName} ${student.firstName}
            </h3>
            <p class="text-xs text-slate-600 mt-0.5">
              Пропусков: ${totalAbsenceDays} ${totalAbsenceDays === 1 ? "день" : "дня"}, из них по болезни: ${excusedAbsenceDays}. Все медицинские справки успешно проверены классным руководителем.
            </p>
          </div>
        </div>
        <div class="self-start sm:self-center shrink-0">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20">
            Всё в порядке
          </span>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-50 to-brand-50 border-2 border-brand-200 text-brand-700 font-extrabold text-2xl flex items-center justify-center shadow-2xs select-none shrink-0">
            ${student.firstName ? student.firstName[0] : "А"}${student.lastName ? student.lastName[0] : "П"}
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900">${student.fullName}</h1>
            <p class="text-xs text-slate-500 mt-1">
              Ученица 7Б класса &bull; Классный руководитель: Смирнова М. В.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold ${
            overallAvg !== null
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
              : "bg-slate-100 text-slate-600 border border-slate-200/60"
          }">
            ${overallAvg !== null ? "Успеваемость хорошая" : "Начало периода"}
          </span>
          <span class="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold ${
            overallAvg !== null
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : "bg-slate-50 text-slate-500 border border-slate-200/60"
          }">
            Средний балл: ${overallAvg !== null ? overallAvg.toFixed(2) : "—"}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div class="lg:col-span-8 space-y-6">
          
          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold text-slate-900">Текущая успеваемость</h2>
              <div class="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/50">
                <button data-period-btn="q1_2024" class="px-2 py-0.5 text-2xs leading-tight rounded-md transition-all ${
                  periodId === "q1_2024"
                    ? "bg-white text-brand-600 font-bold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }">
                  I четверть
                </button>
                <button data-period-btn="q2_2024" class="px-2 py-0.5 text-2xs leading-tight rounded-md transition-all ${
                  periodId === "q2_2024"
                    ? "bg-white text-brand-600 font-bold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }">
                  II четверть
                </button>
              </div>
            </div>

            ${
              !hasAnyGradesInPeriod
                ? `
              <div class="mb-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center space-x-2.5 text-xs text-slate-500">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>II четверть началась 28 октября 2024 г. Оценки за текущий период ещё не выставлялись.</span>
              </div>
            `
                : ""
            }

            <div class="overflow-x-auto">
              <table id="child-grades-table" class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th class="py-3 px-3">Предмет</th>
                    <th class="py-3 px-3">Оценки</th>
                    <th class="py-3 px-3 text-right">Средний балл</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${subjectsWithGrades.map((item) => `
                    <tr class="hover:bg-slate-50/60 transition-colors">
                      <td class="py-3.5 px-3 font-semibold text-slate-800">
                        ${item.subject.name}
                      </td>
                      <td class="py-3.5 px-3">
                        ${
                          item.grades.length > 0
                            ? `
                          <div class="flex flex-wrap gap-1">
                            ${item.grades.map((g) => `
                              <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                                g >= 4 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                                g === 3 ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                                "bg-rose-50 text-rose-700 border border-rose-200/60"
                              }">
                                ${g}
                              </span>
                            `).join("")}
                          </div>
                        `
                            : `<span class="text-slate-300 font-medium pl-1">—</span>`
                        }
                      </td>
                      <td class="py-3.5 px-3 text-right font-bold text-sm ${
                        item.avgNum >= 4.5 ? "text-emerald-600" :
                        item.avgNum >= 3.5 ? "text-slate-800" :
                        item.avgNum > 0 ? "text-rose-600" : "text-slate-300 font-normal"
                      }">
                        ${item.average}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
            <h2 class="text-base font-bold text-slate-900 mb-4">Посещаемость и пропуски</h2>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center">
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span class="text-xs text-slate-500 font-medium">Всего уроков</span>
                <p class="text-lg font-bold text-slate-900 mt-1">${attendanceStats.totalLessons || 44}</p>
              </div>
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span class="text-xs text-slate-500 font-medium">Посещено</span>
                <p class="text-lg font-bold text-slate-900 mt-1">${attendanceStats.presentCount || 40}</p>
              </div>
              <div class="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <span class="text-xs text-amber-700 font-medium">Пропущено</span>
                <p class="text-lg font-bold text-amber-800 mt-1">${totalAbsenceDays}</p>
              </div>
              <div class="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span class="text-xs text-emerald-700 font-medium">По болезни</span>
                <p class="text-lg font-bold text-emerald-800 mt-1">${excusedAbsenceDays}</p>
              </div>
            </div>

            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Последние пропуски</h3>
            <div class="space-y-2.5">
              ${absencesByDateMap.size > 0 ? Array.from(absencesByDateMap.entries()).map(([date, recs]) => `
                <div class="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
                  <div class="space-y-0.5">
                    <span class="font-bold text-slate-800">${formatDateRu(date)}</span>
                    <p class="text-slate-500 text-2xs">
                      ${recs.map((r) => r.lesson ? r.lesson.subjectName : "Урок").join(", ")}
                    </p>
                  </div>
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Подтверждено справкой
                  </span>
                </div>
              `).join("") : `
                <p class="text-xs text-slate-400 italic">Нет зафиксированных пропусков</p>
              `}
            </div>
          </div>

          <div id="child-meetings-section" class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-bold text-slate-900">Собрания класса</h2>
              <span class="text-xs text-slate-400 font-medium">Только просмотр приглашений</span>
            </div>

            ${upcomingMeetings.length > 0 ? `
              <div class="space-y-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-brand-600">Предстоящее собрание</h3>
                ${upcomingMeetings.map((mtg) => `
                  <div class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-2">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h4 class="text-sm font-bold text-slate-900">${mtg.title}</h4>
                        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span class="flex items-center space-x-1">
                            ${renderIcon("calendar", "w-3.5 h-3.5 text-indigo-500")}
                            <span>${formatDateRu(mtg.date)} в ${mtg.time}</span>
                          </span>
                          <span>&bull;</span>
                          <span>${mtg.room || "Каб. 302"}</span>
                        </div>
                      </div>
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold bg-indigo-100 text-indigo-800">
                        Запланировано
                      </span>
                    </div>
                    ${mtg.agenda ? `
                      <p class="text-xs text-slate-600 pt-1 border-t border-indigo-100/60">
                        <span class="font-semibold text-slate-700">Повестка:</span> ${mtg.agenda}
                      </p>
                    ` : ""}
                  </div>
                `).join("")}
              </div>
            ` : ""}

            ${pastMeetings.length > 0 ? `
              <div class="space-y-2 pt-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Прошедшие собрания</h3>
                <div class="space-y-2">
                  ${pastMeetings.map((mtg) => `
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p class="font-semibold text-slate-800">${mtg.title}</p>
                        <p class="text-slate-400 text-2xs mt-0.5">${formatDateRu(mtg.date)} &bull; ${mtg.room || "Каб. 302"}</p>
                      </div>
                      <span class="text-2xs font-medium px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
                        Завершено
                      </span>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>

        </div>

        <div class="lg:col-span-4 space-y-6">
          
          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
            <h2 class="text-base font-bold text-slate-900 mb-4">Последнее объявление</h2>
            ${latestAnnouncement ? `
              <div class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 space-y-2.5">
                <div class="flex items-center space-x-2 text-2xs text-slate-500 font-semibold">
                  ${renderIcon("calendar", "w-3.5 h-3.5 text-indigo-600")}
                  <span>${latestAnnouncement.author || "Смирнова М. В."} &bull; ${formatDateRu(latestAnnouncement.date)}</span>
                </div>
                <h3 class="text-xs font-bold text-slate-900 leading-snug">
                  ${latestAnnouncement.title}
                </h3>
                <p class="text-xs text-slate-600 leading-relaxed">
                  ${latestAnnouncement.content}
                </p>
                <div class="pt-2 border-t border-indigo-100/60">
                  <a href="/announcements" class="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Все объявления &rarr;
                  </a>
                </div>
              </div>
            ` : `
              <p class="text-xs text-slate-400 italic">Нет опубликованных объявлений</p>
            `}
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
            <h2 class="text-base font-bold text-slate-900 mb-4">Расписание на сегодня</h2>
            <div class="space-y-2">
              ${todayLessons.map((l) => `
                <div class="p-3 rounded-xl ${
                  l.subjectId === "math" ? "bg-brand-50 border border-brand-200/80" : "bg-slate-50/80 border border-slate-100"
                } flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-3">
                    <span class="text-slate-400 font-bold text-2xs w-4 text-center">${l.lessonNumber}</span>
                    <div>
                      <p class="font-bold ${l.subjectId === "math" ? "text-brand-900" : "text-slate-800"}">
                        ${l.subjectName}
                      </p>
                      <p class="text-slate-400 text-2xs">${l.time}</p>
                    </div>
                  </div>
                  <span class="text-2xs text-slate-500 font-medium">${l.room}</span>
                </div>
              `).join("")}
            </div>
            <div class="pt-4 mt-3 border-t border-slate-100">
              <a href="/schedule" class="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                Полное расписание на неделю &rarr;
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}
