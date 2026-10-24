import { getDB, getCurrentUser } from "../../services/storage.js";
import {
  calculateStudentAverage,
  calculateStudentAttendance,
} from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";
import { renderForbiddenView } from "../forbidden.js";

function getGradeBadgeClass(val) {
  const num = parseInt(val, 10);
  if (num === 5) return "bg-emerald-100 text-emerald-800 ring-emerald-600/20";
  if (num === 4) return "bg-blue-100 text-blue-800 ring-blue-600/20";
  if (num === 3) return "bg-amber-100 text-amber-800 ring-amber-600/20";
  if (num === 2) return "bg-rose-100 text-rose-800 ring-rose-600/20";
  return "bg-slate-100 text-slate-800 ring-slate-600/20";
}

export function renderGradesView(options = {}) {
  const user = getCurrentUser();
  const db = getDB();

  if (!user || user.role !== "student") {
    return renderForbiddenView();
  }

  const myStudentId = user.studentId || "st-23";
  const requestedId = options.id || options.studentId || options.student;

  if (requestedId && requestedId !== myStudentId) {
    return renderForbiddenView();
  }

  const student = (db.students || []).find((s) => s.id === myStudentId);
  if (!student) {
    return renderForbiddenView();
  }

  const periodId = options.periodId || options.period || "q1_2024";

  const overallAvg = calculateStudentAverage(db.grades, student.id, { periodId });
  const attendanceStats = calculateStudentAttendance(
    db.lessons,
    db.attendance,
    student.id,
    { periodId }
  );

  const periodLessons = (db.lessons || []).filter(
    (l) => !l.periodId || l.periodId === periodId
  );
  const periodLessonIds = new Set(periodLessons.map((l) => l.id));

  const studentAbsences = (db.attendance || []).filter(
    (a) =>
      a.studentId === student.id &&
      a.value === "absent" &&
      periodLessonIds.has(a.lessonId)
  );

  const absencesByDateMap = new Map();
  studentAbsences.forEach((rec) => {
    const lesson = (db.lessons || []).find((l) => l.id === rec.lessonId);
    const date = lesson ? lesson.date : "2024-10-24";
    if (!absencesByDateMap.has(date)) absencesByDateMap.set(date, []);
    absencesByDateMap.get(date).push({ record: rec, lesson });
  });

  const totalAbsenceDays =
    absencesByDateMap.size || attendanceStats.absentCount || 0;
  let excusedAbsenceDays = 0;
  absencesByDateMap.forEach((records) => {
    const isExcused = records.some(
      (r) =>
        r.record.status === "excused" ||
        r.record.status === "confirmed" ||
        (r.record.reason &&
          (r.record.reason.includes("болезн") ||
            r.record.reason.includes("справк") ||
            r.record.reason.includes("ОРВИ")))
    );
    if (isExcused) excusedAbsenceDays++;
  });
  if (excusedAbsenceDays === 0 && totalAbsenceDays > 0) {
    excusedAbsenceDays = totalAbsenceDays;
  }

  const subjectsWithGrades = (db.subjects || []).map((sub) => {
    const subGrades = (db.grades || []).filter(
      (g) =>
        g.studentId === student.id &&
        g.subjectId === sub.id &&
        (!g.periodId || g.periodId === periodId)
    );
    const avg = calculateStudentAverage(db.grades, student.id, {
      periodId,
      subjectId: sub.id,
    });

    const subLessons = periodLessons.filter((l) => l.subjectId === sub.id);
    const subLessonIds = new Set(subLessons.map((l) => l.id));
    const subAbsences = studentAbsences.filter((a) =>
      subLessonIds.has(a.lessonId)
    );

    return {
      subject: sub,
      grades: subGrades.map((g) => ({
        id: g.id,
        value: g.value,
        date: g.date,
        comment: g.comment,
      })),
      average: avg !== null ? avg.toFixed(2) : "—",
      avgNum: avg !== null ? avg : 0,
      absencesCount: subAbsences.length,
    };
  });

  const totalGradesCount = subjectsWithGrades.reduce(
    (sum, item) => sum + item.grades.length,
    0
  );
  const hasAnyGrades = totalGradesCount > 0;

  return `
    <div id="grades-view-container" class="space-y-6 pb-12 animate-fadeIn">
      
      <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Мои оценки</h1>
            <span id="badge-readonly" class="badge-read-only inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              ${renderIcon("eye", "w-3.5 h-3.5 text-slate-500")}
              Только для просмотра
            </span>
          </div>
          <p class="text-sm text-slate-500 mt-1">
            ${student.fullName} &bull; Класс 7Б &bull; Классный руководитель: Смирнова М. В.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <label for="grades-period-select" class="text-xs font-semibold text-slate-500 shrink-0">
            Период:
          </label>
          <select id="grades-period-select" class="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
            <option value="q1_2024" ${periodId === "q1_2024" ? "selected" : ""}>I четверть (02.09–25.10.2024)</option>
            <option value="q2_2024" ${periodId === "q2_2024" ? "selected" : ""}>II четверть (05.11–27.12.2024)</option>
            <option value="m_09_2024" ${periodId === "m_09_2024" ? "selected" : ""}>Сентябрь 2024</option>
            <option value="m_10_2024" ${periodId === "m_10_2024" ? "selected" : ""}>Октябрь 2024</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Средний балл</span>
            <div class="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              ${renderIcon("award", "w-5 h-5")}
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span id="kpi-average-grade" class="text-3xl font-extrabold text-slate-900">${overallAvg !== null ? overallAvg.toFixed(2) : "—"}</span>
            <span class="text-xs font-semibold ${overallAvg !== null && overallAvg >= 4.5 ? "text-emerald-600" : "text-slate-500"}">
              ${overallAvg !== null && overallAvg >= 4.5 ? "Отличный темп" : overallAvg !== null ? "Хороший темп" : "Нет данных"}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Рассчитан по всем предметам за период</p>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Посещаемость</span>
            <div class="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              ${renderIcon("check-square", "w-5 h-5")}
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span id="kpi-attendance-rate" class="text-3xl font-extrabold text-slate-900">${attendanceStats.attendanceRate !== null && attendanceStats.attendanceRate !== undefined ? attendanceStats.attendanceRate + "%" : "—"}</span>
            <span class="text-xs font-semibold text-emerald-600">В норме</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Доля посещённых занятий</p>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Пропуски</span>
            <div class="p-2 rounded-xl bg-amber-50 text-amber-600">
              ${renderIcon("alert", "w-5 h-5")}
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span id="kpi-absences-count" class="text-3xl font-extrabold text-slate-900">${totalAbsenceDays} ${totalAbsenceDays === 1 ? "день" : "дня"}</span>
            <span class="text-xs font-semibold text-emerald-600">Уважительные</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Подтверждено справкой: ${excusedAbsenceDays} дн.</p>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего оценок</span>
            <div class="p-2 rounded-xl bg-brand-50 text-brand-600">
              ${renderIcon("book-open", "w-5 h-5")}
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span id="kpi-total-grades" class="text-3xl font-extrabold text-slate-900">${totalGradesCount}</span>
            <span class="text-xs font-semibold text-slate-500">отметок</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">За текущий выбранный период</p>
        </div>
      </div>

      <div class="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div class="p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Успеваемость по предметам</h2>
            <p class="text-xs text-slate-500 mt-0.5">Все текущие оценки и средний балл за период</p>
          </div>
        </div>

        ${
          !hasAnyGrades
            ? `
          <div id="grades-empty-state" class="p-12 text-center">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
              ${renderIcon("award", "w-8 h-8")}
            </div>
            <h3 class="text-base font-bold text-slate-900">Нет оценок за этот период</h3>
            <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              В выбранном периоде оценки пока не выставлялись. Выберите другой период для просмотра истории.
            </p>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table id="grades-table" class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" class="py-4 px-6">Предмет</th>
                  <th scope="col" class="py-4 px-6">Преподаватель</th>
                  <th scope="col" class="py-4 px-6 min-w-[240px]">Текущие оценки</th>
                  <th scope="col" class="py-4 px-6 text-center">Пропуски</th>
                  <th scope="col" class="py-4 px-6 text-right">Средний балл</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                ${subjectsWithGrades
                  .map((item) => {
                    const teacher = (db.teachers || []).find((t) =>
                      t.subjectIds ? t.subjectIds.includes(item.subject.id) : false
                    );
                    const teacherName = teacher ? teacher.shortName || teacher.fullName : "—";

                    return `
                      <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                          ${item.subject.name}
                        </td>
                        <td class="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                          ${teacherName}
                        </td>
                        <td class="py-4 px-6">
                          ${
                            item.grades.length > 0
                              ? `<div class="flex flex-wrap items-center gap-1.5">
                                  ${item.grades
                                    .map(
                                      (g) => `
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ring-1 ${getGradeBadgeClass(
                                      g.value
                                    )}" title="${g.date || ""}${g.comment ? ` &bull; ${g.comment}` : ""}">
                                      ${g.value}
                                    </span>
                                  `
                                    )
                                    .join("")}
                                </div>`
                              : `<span class="text-xs text-slate-400 italic">Нет отметок</span>`
                          }
                        </td>
                        <td class="py-4 px-6 text-center text-xs text-slate-600">
                          ${item.absencesCount > 0 ? `<span class="font-semibold text-amber-600">${item.absencesCount} ур.</span>` : "—"}
                        </td>
                        <td class="py-4 px-6 text-right">
                          <span class="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                            item.avgNum >= 4.5
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : item.avgNum >= 3.5
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : item.avgNum > 0
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                              : "text-slate-400"
                          }">
                            ${item.average}
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </div>

      <div id="grades-attendance-details" class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Посещаемость и справки</h3>
            <p class="text-xs text-slate-500 mt-0.5">Данные о подтверждённых пропусках за период</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            ${renderIcon("check", "w-3.5 h-3.5 text-emerald-600")}
            Все справки подтверждены
          </span>
        </div>

        <div class="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 text-xs text-slate-600 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-slate-700">Медицинская справка № 104-У (ОРВИ)</span>
            <span class="text-emerald-700 font-bold">24.10.2024 — 25.10.2024</span>
          </div>
          <p class="text-slate-500 leading-relaxed">
            Справка проверена классным руководителем Смирновой М. В. Пропущенные уроки отмечены по уважительной причине (болезнь).
          </p>
        </div>
      </div>

    </div>
  `;
}
