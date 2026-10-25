import { getDB, getCurrentUser } from "../../services/storage.js";
import { renderForbiddenView } from "../forbidden.js";
import { renderIcon } from "../../components/icons.js";
import {
  calculateClassAttendance,
  calculateClassAverage,
  calculateSubjectAverages,
  calculateWeeklyAbsences,
  generateClassReport,
  getRiskZoneStudents,
} from "../../mock/calculations.js";

export function renderAnalyticsView(options = {}) {
  const db = getDB();
  const currentUser = getCurrentUser();
  const searchParams = new URLSearchParams(window.location.search || "");
  const requestedClassId = options.classId || options.class || searchParams.get("classId") || searchParams.get("class");
  if (currentUser && currentUser.role === "teacher") {
    const allowedClassId = currentUser.classId || "class-7b";
    if (
      requestedClassId &&
      requestedClassId !== allowedClassId &&
      requestedClassId !== "class-7b" &&
      requestedClassId !== "7Б" &&
      requestedClassId !== "7б"
    ) {
      return renderForbiddenView();
    }
  }
  const periodId = options.periodId || "q1_2024";
  const showReport = options.showReport === true;

  const periodConfigs = {
    q1_2024: {
      id: "q1_2024",
      title: "I четверть (02.09–25.10.2024)",
      shortTitle: "I четверть 2024",
      dateFrom: null,
      dateTo: null,
    },
    sept_2024: {
      id: "sept_2024",
      title: "Сентябрь 2024 (02.09–30.09.2024)",
      shortTitle: "Сентябрь 2024",
      dateFrom: "2024-09-01",
      dateTo: "2024-09-30",
    },
    oct_2024: {
      id: "oct_2024",
      title: "Октябрь 2024 (01.10–25.10.2024)",
      shortTitle: "Октябрь 2024",
      dateFrom: "2024-10-01",
      dateTo: "2024-10-31",
    },
    week_21_25_10: {
      id: "week_21_25_10",
      title: "Неделя 21–25.10.2024",
      shortTitle: "Неделя 21–25.10.2024",
      dateFrom: "2024-10-21",
      dateTo: "2024-10-25",
    },
    holidays_nov_2024: {
      id: "holidays_nov_2024",
      title: "Осенние каникулы (28.10–03.11.2024)",
      shortTitle: "Каникулы (28.10–03.11.2024)",
      dateFrom: "2024-10-28",
      dateTo: "2024-11-03",
    },
  };

  const currentPeriod = periodConfigs[periodId] || periodConfigs.q1_2024;
  const isHolidayOrEmpty = periodId === "holidays_nov_2024" || periodId === "q2_2024";
  const periodOptions = {
    classId: "class-7b",
    periodId: isHolidayOrEmpty ? periodId : "q1_2024",
    dateFrom: currentPeriod.dateFrom,
    dateTo: currentPeriod.dateTo,
  };

  const classAvg = calculateClassAverage(db.grades, periodOptions);
  const classAtt = calculateClassAttendance(
    db.lessons,
    db.attendance,
    periodOptions,
  );
  const subjectAverages = calculateSubjectAverages(
    db.grades,
    db.subjects,
    periodOptions,
  );
  const riskStudents = getRiskZoneStudents(
    db.students,
    db.lessons,
    db.attendance,
    db.grades,
    db.subjects,
    periodOptions,
  );

  const criticalRisk = riskStudents.filter((r) => r.riskLevel === "critical");
  const moderateRisk = riskStudents.filter((r) => r.riskLevel !== "critical");
  const totalStudentsCount = (db.students || []).length || 28;
  const successCount = Math.max(0, totalStudentsCount - riskStudents.length);

  const weeklyGradePoints = [
    { label: "Сен (Нед 1)", value: 4.0, heightPercent: 65 },
    { label: "Сен (Нед 2)", value: 4.1, heightPercent: 72 },
    { label: "Сен (Нед 3)", value: 4.2, heightPercent: 80 },
    { label: "Окт (Нед 1)", value: 4.1, heightPercent: 72 },
    { label: "Окт (Нед 2)", value: 4.2, heightPercent: 80 },
  ];

  const report = generateClassReport(db, periodOptions);

  const weeklyAbsences = calculateWeeklyAbsences(db.lessons, db.attendance, {
    periodId: "q1_2024",
  });

  const lessonMap = new Map((db.lessons || []).map((l) => [l.id, l]));
  const studentMap = new Map((db.students || []).map((s) => [s.id, s]));
  let periodAbsences = (db.attendance || []).filter(
    (a) => a.value === "absent",
  );
  if (currentPeriod.dateFrom)
    periodAbsences = periodAbsences.filter(
      (a) => a.date >= currentPeriod.dateFrom,
    );
  if (currentPeriod.dateTo)
    periodAbsences = periodAbsences.filter(
      (a) => a.date <= currentPeriod.dateTo,
    );
  periodAbsences.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return `
    <div id="analytics-view" class="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">

      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            ${renderIcon("chart-bar", "w-5 h-5")}
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-900 leading-tight">Аналитика класса</h1>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-xs text-slate-500 font-medium">Период:</span>
              <div class="relative inline-block">
                <select id="select-analytics-period"
                        class="appearance-none pl-2.5 pr-8 py-1 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 cursor-pointer transition-all">
                  <option value="q1_2024" ${periodId === "q1_2024" ? "selected" : ""}>I четверть 2024 (02.09–25.10.2024)</option>
                  <option value="sept_2024" ${periodId === "sept_2024" ? "selected" : ""}>Сентябрь 2024 (02.09–30.09.2024)</option>
                  <option value="oct_2024" ${periodId === "oct_2024" ? "selected" : ""}>Октябрь 2024 (01.10–25.10.2024)</option>
                  <option value="week_21_25_10" ${periodId === "week_21_25_10" ? "selected" : ""}>Неделя 21–25.10.2024</option>
                  <option value="holidays_nov_2024" ${periodId === "holidays_nov_2024" ? "selected" : ""}>Осенние каникулы (28.10–03.11.2024)</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-3.5 h-3.5")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <a href="/students"
             id="btn-open-students-list"
             class="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center space-x-2">
            ${renderIcon("users", "w-4 h-4")}
            <span>Открыть список учеников</span>
          </a>
          <button type="button" id="btn-generate-report"
                  class="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer">
            ${renderIcon("file-text", "w-4 h-4")}
            <span>Сформировать отчёт</span>
          </button>
        </div>
      </div>

      <div id="report-container" class="${showReport ? "" : "hidden"} bg-white rounded-3xl p-6 sm:p-8 border border-brand-200/90 shadow-sm space-y-6 animate-fadeIn print:block">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/80 mb-2">
              ${renderIcon("check", "w-3.5 h-3.5 text-brand-600")}
              <span>Официальный отчёт по классу</span>
            </div>
            <h2 class="text-xl font-bold text-slate-900 leading-tight">Отчёт по успеваемости и посещаемости 7Б класса</h2>
            <p class="text-xs text-slate-500 mt-1">
              Период: <strong class="text-slate-800 font-semibold" id="report-period-title">${currentPeriod.title}</strong> · 
              Классный руководитель: <span class="text-slate-800 font-semibold">Смирнова М. В.</span> · 
              28 учеников (15 мальчиков, 13 девочек)
            </p>
          </div>

          <div class="flex items-center space-x-2 self-start print:hidden">
            <button type="button" id="btn-print-report"
                    class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer">
              ${renderIcon("printer", "w-3.5 h-3.5")}
              <span>Печать / Экспорт</span>
            </button>
            <button type="button" id="btn-close-report"
                    class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer">
              ${renderIcon("x", "w-3.5 h-3.5")}
              <span>Скрыть отчёт</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Средний балл класса</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" id="report-metric-avg">${report.metrics.classAverageGrade !== null ? report.metrics.classAverageGrade : "—"}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${report.metrics.totalGradesCount} оценок за период</div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Посещаемость класса</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1" id="report-metric-att">${report.metrics.attendanceRate !== null ? `${report.metrics.attendanceRate}%` : "—"}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${report.metrics.absenceRate !== null ? `Пропущено ${report.metrics.absenceRate}% уроков` : "Нет данных"}</div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Неподтверждённых пропусков</div>
            <div class="text-2xl sm:text-3xl font-extrabold ${report.metrics.unconfirmedAbsencesCount > 0 ? "text-amber-600" : "text-slate-900"} mt-1" id="report-metric-unconfirmed">${report.metrics.unconfirmedAbsencesCount}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Ожидают справок или заявлений</div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Учеников в зоне риска</div>
            <div class="text-2xl sm:text-3xl font-extrabold ${report.metrics.riskZoneCount > 0 ? "text-rose-600" : "text-slate-900"} mt-1" id="report-metric-risk">${report.metrics.riskZoneCount}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">По пропускам и успеваемости</div>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Динамика пропусков уроков по неделям</h3>
            <span class="text-xs text-slate-400">8 недель I четверти</span>
          </div>

          <div class="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            ${weeklyAbsences
              .map(
                (w) => `
              <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
                <div class="text-[11px] font-medium text-slate-400">${w.label}</div>
                <div class="text-base font-extrabold ${w.absencePercentage > 10 ? "text-rose-600" : "text-slate-900"}">
                  ${w.absencePercentage}%
                </div>
                <div class="text-[10px] text-slate-400">${w.absentCount} проп.</div>
              </div>
            `,
              )
              .join("")}
          </div>
          <p class="text-[11px] text-slate-400 italic">Доля пропущенных уроков от всех уроков недели. Заметен всплеск перед осенними каникулами (Нед 8 — 11.4%).</p>
        </div>

        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Средние баллы по предметам</h3>
            <span class="text-xs text-rose-600 font-medium">Порог зоны риска: 3.5</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${subjectAverages
              .filter((s) => s.average !== null)
              .map((s) => {
                const isBelow = s.average < 3.5;
                return `
                <div class="p-3.5 rounded-2xl border ${isBelow ? "border-rose-300 bg-rose-50/50" : "border-slate-200 bg-white"} space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-900">${s.name}</span>
                    <span class="text-sm font-extrabold ${isBelow ? "text-rose-600" : "text-slate-800"}">${s.average}</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                    <div class="h-2 rounded-full ${isBelow ? "bg-rose-500" : "bg-brand-500"}" style="width: ${(s.average / 5) * 100}%"></div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Учитель: ${s.teacher || "—"}</span>
                    <span>${s.gradesCount} ${s.gradesCount === 1 ? "оценка" : "оценок"}</span>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
          <p class="text-[11px] text-slate-400 italic">Средний балл всех учеников 7Б по предмету за период. Пунктирный порог внимания установлен на уровне 3.5.</p>
        </div>

        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Ученики в зоне риска (${riskStudents.length})</h3>
            <span class="text-[11px] text-slate-500">Пропуски > 20% или средний балл < 3.5</span>
          </div>

          ${
            riskStudents.length === 0
              ? `
            <div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/80">
              Учеников в зоне риска за данный период нет. Все показатели в пределах нормы.
            </div>
          `
              : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${riskStudents
                .map(
                  (st) => `
                <div class="p-4 rounded-2xl border ${st.riskLevel === "critical" ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/40"} space-y-2">
                  <div class="flex items-center justify-between">
                    <a href="/student?id=${st.studentId}" class="text-xs font-bold text-slate-900 hover:text-brand-600 hover:underline">
                      ${st.name}
                    </a>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${st.riskLevel === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}">
                      ${st.riskLevelLabel}
                    </span>
                  </div>
                  <div class="space-y-1">
                    ${st.reasons
                      .map(
                        (r) => `
                      <div class="text-[11px] text-slate-600 flex items-center space-x-1.5">
                        <span class="w-1.5 h-1.5 rounded-full ${st.riskLevel === "critical" ? "bg-rose-500" : "bg-amber-500"}"></span>
                        <span>${r.description}</span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          `
          }
        </div>

        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Сводный список пропусков занятий (${periodAbsences.length})</h3>
            <span class="text-xs text-slate-500">За период: ${currentPeriod.shortTitle}</span>
          </div>

          <div class="overflow-x-auto max-h-72 border border-slate-200 rounded-2xl scrollbar-thin">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3 font-semibold">Дата</th>
                  <th class="py-2.5 px-3 font-semibold">Ученик</th>
                  <th class="py-2.5 px-3 font-semibold">Урок / Предмет</th>
                  <th class="py-2.5 px-3 font-semibold">Причина</th>
                  <th class="py-2.5 px-3 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${periodAbsences
                  .slice(0, 50)
                  .map((a) => {
                    const lsn = lessonMap.get(a.lessonId);
                    const st = studentMap.get(a.studentId);
                    const isConfirmed =
                      a.status === "confirmed" || a.status === "excused";
                    return `
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="py-2 px-3 text-slate-600">${a.date || "—"}</td>
                      <td class="py-2 px-3 font-medium text-slate-900">
                        <a href="/student?id=${a.studentId}" class="hover:text-brand-600 hover:underline">
                          ${st ? st.fullName : a.studentId}
                        </a>
                      </td>
                      <td class="py-2 px-3 text-slate-600">${lsn ? `${lsn.subjectName || "Урок"} (${lsn.lessonNumber} ур.)` : "—"}</td>
                      <td class="py-2 px-3 text-slate-600">${a.reason || "Причина не указана"}</td>
                      <td class="py-2 px-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isConfirmed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}">
                          ${isConfirmed ? "Подтверждён" : "Ожидает"}
                        </span>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
          <div class="font-bold text-slate-700 flex items-center space-x-1.5">
            ${renderIcon("alert", "w-4 h-4 text-brand-600")}
            <span>Динамический расчёт показателей</span>
          </div>
          <p>
            Отчёт сформирован динамически на основе актуальных записей журнала в момент запроса.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
          <div class="flex items-center justify-between pb-2">
            <div class="flex items-center space-x-2.5">
              <span class="p-2 rounded-xl bg-brand-50 text-brand-600">
                ${renderIcon("chart-bar", "w-5 h-5")}
              </span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  Динамика средней успеваемости 7Б
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  средний балл всех учеников по всем предметам, по неделям
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400 font-medium">Текущий:</span>
              <div class="text-xl font-extrabold text-brand-600">${classAvg}</div>
            </div>
          </div>

          <div class="pt-6 pb-2 px-2">
            <div class="relative h-44">
              <div class="absolute inset-x-0 bottom-[35%] border-b border-dashed border-slate-200 z-10 pointer-events-none">
                <span class="absolute right-0 -top-3 text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-slate-100">
                  порог 3.5
                </span>
              </div>

              <div class="relative h-full flex items-end justify-between gap-2 sm:gap-6 pl-2 sm:pl-4 pr-16 sm:pr-20 z-0">
                ${weeklyGradePoints
                  .map(
                    (pt, idx) => `
                  <div class="relative flex-1 flex flex-col items-center group">
                    <div class="text-xs font-extrabold text-brand-600 mb-1.5 transition-transform group-hover:-translate-y-1">
                      ${pt.value.toFixed(1)}
                    </div>
                    <div class="w-8 sm:w-12 bg-gradient-to-t from-brand-500/20 to-brand-500/70 hover:from-brand-500/30 hover:to-brand-500 rounded-t-xl transition-all shadow-2xs cursor-pointer"
                         style="height: ${pt.heightPercent * 1.35}px;">
                    </div>
                    <div class="text-[11px] font-medium text-slate-500 mt-2 whitespace-nowrap text-center">
                      ${pt.label}
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 !mt-2">
            <span>Период данных: ${currentPeriod.shortTitle}</span>
            <span class="font-medium text-slate-600">Всего отметок: ${report.metrics.totalGradesCount}</span>
          </div>
        </div>

        <div class="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div class="pb-2">
            <h2 class="text-base font-bold text-slate-900 leading-snug">
              Группы риска (Успеваемость / Посещаемость)
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Мониторинг 28 учеников 7Б класса за период
            </p>
          </div>

          <div class="space-y-3" id="risk-groups-list">
            <div class="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-rose-950">
                  Критический риск (${criticalRisk.length})
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
                  Внимание!
                </span>
              </div>
              <div class="text-xs text-rose-900 leading-relaxed font-medium">
                ${
                  criticalRisk.length > 0
                    ? criticalRisk
                        .map((s, idx) => {
                          const reasonShort = s.reasons.some(
                            (r) => r.type === "absence",
                          )
                            ? "пропуски"
                            : "оценки";
                          return `<a href="/student?id=${s.studentId}" class="font-bold underline hover:text-rose-700">${s.shortName || s.name.split(" ")[0] + " " + (s.name.split(" ")[1] ? s.name.split(" ")[1][0] + "." : "")}</a> (${reasonShort})${idx < criticalRisk.length - 1 ? ", " : ""}`;
                        })
                        .join("")
                    : "Нет учеников в группе критического риска"
                }
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-amber-950">
                  Умеренный риск (${moderateRisk.length})
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                  Контроль
                </span>
              </div>
              <div class="text-xs text-amber-900 leading-relaxed font-medium">
                Ученики со средним баллом 3.2 - 3.5
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-emerald-950">
                  Успешная зона (${successCount})
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                  ОК
                </span>
              </div>
              <div class="text-xs text-emerald-900 leading-relaxed font-medium">
                Стабильная успеваемость выше 3.6
              </div>
            </div>
          </div>

          <div class="pt-2 text-[11px] text-slate-400">
            Нажмите на имя ученика, чтобы перейти в детальную сводку и зафиксировать контакт или заметку.
          </div>
        </div>

      </div>

    </div>
  `;
}
