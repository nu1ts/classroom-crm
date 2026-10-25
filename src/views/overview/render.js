import { getDB, saveDB, getCurrentUser } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import {
  calculateAttendanceForDay,
  calculateClassAverage,
  getRiskZoneStudents,
  getUnconfirmedAbsences,
} from "../../mock/calculations.js";

export function renderOverviewView() {
  const db = getDB();
  const currentUser = getCurrentUser();
  const classId = (currentUser && currentUser.role === "teacher" && currentUser.classId) ? currentUser.classId : "class-7b";
  const currentClass = (db.classes || []).find((c) => c.id === classId);
  const className = currentClass ? currentClass.name : "7Б";

  const demoDate = db.meta?.demoToday || "2024-10-28";
  const periodId = "q1_2024";

  const classStudents = (db.students || []).filter((s) => s.classId === classId);
  const totalStudents = classStudents.length || 28;
  const boysCount = classStudents.filter((s) => s.gender === "male").length || 15;
  const girlsCount = classStudents.filter((s) => s.gender === "female").length || 13;

  const todayAtt = calculateAttendanceForDay(
    db.lessons,
    db.attendance,
    demoDate,
    { onlyFirstLesson: false, classId },
  );

  const todayAttendanceRate =
    todayAtt.totalMarks > 0 && todayAtt.attendanceRate !== null
      ? todayAtt.attendanceRate
      : 0;
  const todayPresent = todayAtt.totalMarks > 0 ? Math.round((todayAttendanceRate / 100) * totalStudents) : 0;
  const todayAbsent = todayAtt.totalMarks > 0 ? Math.max(0, totalStudents - todayPresent) : 0;
  const teacherName = currentUser?.personName || "Смирнова Марина Васильевна";
  const room = currentClass?.room || "Кабинет 302";

  const classAvg = calculateClassAverage(db.grades, { periodId }) || 4.2;

  const unconfirmedAbsences = getUnconfirmedAbsences(
    db.attendance,
    db.lessons,
    db.students,
    { periodId },
  );
  const unconfirmedCount = unconfirmedAbsences.length;

  const riskZoneList = getRiskZoneStudents(
    (db.students || []).filter((s) => s.classId === "class-7b"),
    db.lessons,
    db.attendance,
    db.grades,
    db.subjects,
    { periodId, classId: "class-7b", parentContacts: db.parentContacts, today: demoDate },
  );

  const pendingReminderStudents = new Set(
    (db.parentContacts || [])
      .filter((c) => (c.agreementReached === false || c.agreement === false) && c.nextContactDate && c.nextContactDate <= demoDate)
      .map((c) => c.studentId)
  );

  const todayContacts = new Set(
    (db.parentContacts || [])
      .filter((c) => (c.date === demoDate || c.date >= "2024-10-24") && c.agreementReached !== false && !pendingReminderStudents.has(c.studentId))
      .map((c) => c.studentId),
  );
  const studentNotes = new Set(
    (db.notes || [])
      .filter((n) => !n.isReminder || (n.reminderDate && n.reminderDate > demoDate))
      .filter((n) => !pendingReminderStudents.has(n.studentId))
      .map((n) => n.studentId)
  );

  const processedCount = riskZoneList.filter(
    (s) => todayContacts.has(s.studentId) || studentNotes.has(s.studentId),
  ).length;
  const allProcessed =
    riskZoneList.length > 0 && processedCount === riskZoneList.length;

  function formatReasons(st) {
    const parts = [];

    const reminderReason = st.reasons.find((r) => r.type === "reminder");
    if (reminderReason) {
      parts.push(`<strong class="text-amber-800">${reminderReason.description}</strong>`);
    }
    const absReason = st.reasons.find((r) => r.type === "absence");
    if (absReason) {
      const absentCount = st.absentCount !== undefined ? st.absentCount : Math.round((st.absenceRate / 100) * (st.totalLessons || 40));
      const totalLessons = st.totalLessons || 40;
      parts.push(
        `Пропуски: <strong class="text-slate-800">${st.absenceRate}%</strong> (${absentCount} из ${totalLessons} уроков)`,
      );
    }

    const overallReason = st.reasons.find((r) => r.type === "overall_grade");
    if (overallReason) {
      parts.push(
        `Средний балл: <strong class="text-slate-800">${st.overallAverage}</strong> (порог 3.5)`,
      );
    } else {
      const subjReasons = st.reasons.filter((r) => r.type === "subject_grade");
      if (subjReasons.length > 0) {
        const subjText = subjReasons
          .map(
            (sr) =>
              `${sr.subjectName} <strong class="text-slate-800">${sr.value}</strong>`,
          )
          .join(", ");
        parts.push(`Ниже порога 3.5: ${subjText}`);
      }
    }

    return parts.join(" · ");
  }

  const riskCardsHtml = riskZoneList
    .map((st, index) => {
      const isProcessed =
        todayContacts.has(st.studentId) || studentNotes.has(st.studentId);
      const isCritical = st.riskLevel === "critical";
      const reasonText = formatReasons(st);

      return `
      <div class="risk-card p-3.5 sm:p-4 rounded-xl border ${isProcessed ? "bg-slate-50/80 border-slate-200 opacity-90" : isCritical ? "bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/50" : "bg-amber-50/20 border-amber-200/70 hover:bg-amber-50/40"} transition-colors" data-student-name="${st.name}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-lg ${isProcessed ? "bg-slate-200 text-slate-600" : isCritical ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"} font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              ${index + 1}
            </div>
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-sm font-bold text-slate-900">${st.name}</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${isCritical ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-amber-100 text-amber-700 border border-amber-200"}">
                  ${isCritical ? "Критический риск" : "Умеренный риск"}
                </span>
                ${
                  isProcessed
                    ? `
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                    ${renderIcon("check", "w-3 h-3")}
                    <span>Обработан</span>
                  </span>
                `
                    : ""
                }
              </div>
              <div class="text-xs text-slate-600 mt-1 leading-relaxed">
                ${reasonText}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 self-end sm:self-center flex-shrink-0">
            <button type="button" data-action="open-summary" data-student-id="${st.studentId}"
                    title="Открыть детальную сводку ученика"
                    class="btn-open-summary px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1 shadow-2xs">
              ${renderIcon("user", "w-3.5 h-3.5 text-slate-500")}
              <span>Сводка</span>
            </button>
            <button type="button" data-action="contact-parent" data-student-id="${st.studentId}" data-student-name="${st.name}"
                    title="Зафиксировать звонок или встречу с родителем"
                    class="btn-contact-parent px-2.5 py-1.5 rounded-lg ${isProcessed ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200"} border font-semibold text-xs transition-colors flex items-center space-x-1 shadow-2xs">
              ${renderIcon("phone", "w-3.5 h-3.5")}
              <span>Контакт</span>
            </button>
            <button type="button" data-action="add-note" data-student-id="${st.studentId}" data-student-name="${st.name}"
                    title="Добавить заметку классрука"
                    class="btn-add-note px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1 shadow-2xs">
              ${renderIcon("message-square", "w-3.5 h-3.5 text-slate-500")}
              <span>Заметка</span>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="space-y-5 animate-fadeIn pb-10">
      <div class="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md relative overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-2.5 backdrop-blur-sm border border-white/10">
              <span>Учебный год 2024/2025</span>
              <span>•</span>
              <span>1 четверть</span>
              <span>•</span>
              <span>28 октября 2024</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ${className} класс (${totalStudents} учеников)
            </h1>
            <p class="text-slate-300 text-xs sm:text-sm mt-1">
              Классный руководитель: ${teacherName} · ${room}
            </p>
          </div>
          <div class="flex items-center space-x-3 self-start md:self-center flex-shrink-0">
            <div class="h-10 px-3.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white flex flex-col justify-center">
              <span class="text-slate-300 block text-[10px] leading-tight">Состав класса</span>
              <strong class="text-white font-semibold leading-tight">${boysCount} мал. / ${girlsCount} дев.</strong>
            </div>
            <a href="/students" class="h-10 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-sm shadow-brand-500/30 transition-all flex items-center space-x-1.5">
              <span>Список класса</span>
              ${renderIcon("arrow-right", "w-3.5 h-3.5 text-white/80")}
            </a>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Посещаемость сегодня</span>
              <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                ${renderIcon("check-square", "w-4 h-4")}
              </div>
            </div>
            <div class="mt-2.5 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">${todayAttendanceRate}%</span>
              <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">норма</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>${todayPresent} из ${totalStudents} присутствуют</span>
            <span class="text-rose-500 font-semibold">${todayAbsent} пропуск</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Средний балл класса</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                ${renderIcon("award", "w-4 h-4")}
              </div>
            </div>
            <div class="mt-2.5 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">${classAvg}</span>
              <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center">
                ↑ +0.1
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>За I четверть</span>
            <span class="text-slate-400">к прошлой неделе</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Без подтверждения</span>
              <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                ${renderIcon("alert", "w-4 h-4")}
              </div>
            </div>
            <div class="mt-2.5 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-extrabold ${unconfirmedCount > 0 ? "text-amber-600" : "text-slate-900"} tracking-tight">${unconfirmedCount}</span>
              <span class="text-xs font-medium text-slate-500">урока</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">Требуют справки</span>
            <a href="/attendance?filter=unconfirmed" class="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
              К журналу →
            </a>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Список внимания</span>
              <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                ${renderIcon("users", "w-4 h-4")}
              </div>
            </div>
            <div class="mt-2.5 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">${riskZoneList.length}</span>
              <span class="text-xs font-semibold text-slate-500">учеников</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Обработано: <strong class="text-slate-800">${processedCount} из ${riskZoneList.length}</strong></span>
            <span class="text-[11px] ${allProcessed ? "text-emerald-600 font-bold" : "text-brand-600 font-medium"}">${allProcessed ? "Готово к отчёту" : "В работе"}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-5">
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div class="flex items-center space-x-2">
                  <h2 class="text-base font-bold text-slate-900">Список внимания (Зона риска)</h2>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    ${riskZoneList.length}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Критерии: пропуски более 20.0% уроков за период или средний балл ниже 3.5
                </p>
              </div>

              ${
                allProcessed
                  ? `
                <a href="/analytics" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto">
                  ${renderIcon("file-text", "w-3.5 h-3.5")}
                  <span>Сформировать отчёт</span>
                </a>
              `
                  : `
                <div class="text-[11px] text-slate-400 self-start sm:self-auto">
                  Сортировка: критический риск → пропуски
                </div>
              `
              }
            </div>

            ${
              allProcessed
                ? `
              <div class="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <div class="w-7 h-7 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div class="font-bold text-slate-900">Все ${riskZoneList.length} учеников списка внимания обработаны!</div>
                    <div class="text-emerald-700 mt-0.5">Контакты и заметки зафиксированы. Можно переходить к формированию отчёта.</div>
                  </div>
                </div>
                <a href="/analytics" class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs whitespace-nowrap">
                  К отчёту →
                </a>
              </div>
            `
                : ""
            }

            ${
              riskZoneList.length === 0
                ? `
              <div id="empty-risk-zone" class="p-8 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div class="text-sm font-semibold text-slate-700">Учеников в зоне риска за данный период нет. Все показатели в пределах нормы.</div>
                <p class="text-xs text-slate-500">Работа по контролю рисков завершена. Вы можете сразу перейти к формированию сводного отчёта.</p>
                <a href="/analytics" id="btn-overview-go-to-report" class="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors">
                  ${renderIcon("file-text", "w-4 h-4")}
                  <span>Сформировать отчёт</span>
                </a>
              </div>
            `
                : `
              <div class="space-y-3">
                ${riskCardsHtml}
              </div>
            `
            }
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                ${renderIcon("calendar", "w-5 h-5 text-brand-600")}
                <h2 class="text-base font-bold text-slate-900">Расписание на сегодня (Пн, 28 окт)</h2>
              </div>
              <a href="/schedule" class="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                Расписание недели →
              </a>
            </div>

            <div class="space-y-2.5">
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="text-xs font-bold text-slate-500 w-28 flex-shrink-0">08:30 – 09:15</div>
                  <div>
                    <div class="text-sm font-bold text-slate-800">1. Разговоры о важном</div>
                    <div class="text-xs text-slate-500">Смирнова М. В. · Кабинет 302</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">Проведено</span>
              </div>

              <div class="p-3 rounded-xl bg-brand-50/70 border border-brand-200 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="text-xs font-bold text-brand-700 w-28 flex-shrink-0">09:30 – 10:15</div>
                  <div>
                    <div class="text-sm font-bold text-brand-900">2. Математика (Алгебра)</div>
                    <div class="text-xs text-brand-700">Козлов А. П. · Кабинет 204</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-500 text-white animate-pulse">Идёт урок</span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="text-xs font-bold text-slate-500 w-28 flex-shrink-0">10:30 – 11:15</div>
                  <div>
                    <div class="text-sm font-bold text-slate-800">3. Русский язык</div>
                    <div class="text-xs text-slate-500">Иванова Е. С. · Кабинет 302</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-600">Ожидается</span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="text-xs font-bold text-slate-500 w-28 flex-shrink-0">11:30 – 12:15</div>
                  <div>
                    <div class="text-sm font-bold text-slate-800">4. Физика</div>
                    <div class="text-xs text-slate-500">Дмитриев Д. К. · Кабинет 401</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-600">Ожидается</span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="text-xs font-bold text-slate-500 w-28 flex-shrink-0">12:35 – 13:20</div>
                  <div>
                    <div class="text-sm font-bold text-slate-800">5. Физкультура</div>
                    <div class="text-xs text-slate-500">Новиков С. А. · Спортзал</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-600">Ожидается</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
            <h2 class="text-base font-bold text-slate-900 mb-3 pb-2.5 border-b border-slate-100 flex items-center space-x-2">
              ${renderIcon("users-group", "w-4 h-4 text-brand-600")}
              <span>Родительское собрание</span>
            </h2>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div class="text-xs font-bold text-brand-700 mb-1.5 flex items-center space-x-1.5">
                ${renderIcon("calendar", "w-4 h-4")}
                <span>31.10.2024, 18:30</span>
              </div>
              <div class="text-sm font-bold text-slate-900 mb-1.5">
                Итоги первой четверти 7Б
              </div>
              <p class="text-xs text-slate-600 leading-relaxed mb-4">
                Повестка: Успеваемость, предстоящие каникулы, экскурсионная поездка в музей.
              </p>
              <a href="/meetings" class="block w-full py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs text-center shadow-sm shadow-brand-500/20 transition-colors">
                Список участников →
              </a>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
            <h2 class="text-base font-bold text-slate-900 mb-3 pb-2.5 border-b border-slate-100">
              Быстрые действия
            </h2>
            <div class="space-y-2.5">
              <a href="/announcements" class="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-700 text-xs font-semibold transition-colors">
                <span>Новое объявление родителям</span>
                ${renderIcon("arrow-right", "w-3.5 h-3.5 text-brand-500")}
              </a>
              <a href="/analytics" class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
                <span>Сформировать отчёт 7Б</span>
                ${renderIcon("arrow-right", "w-3.5 h-3.5 text-slate-400")}
              </a>
              <a href="/meetings" class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
                <span>Создать собрание</span>
                ${renderIcon("arrow-right", "w-3.5 h-3.5 text-slate-400")}
              </a>
              <a href="/attendance?filter=unconfirmed" class="flex items-center justify-between p-3 rounded-xl border border-amber-200/80 hover:bg-amber-50/40 text-amber-800 text-xs font-semibold transition-colors">
                <span>Неподтверждённые пропуски (${unconfirmedCount})</span>
                ${renderIcon("arrow-right", "w-3.5 h-3.5 text-amber-600")}
              </a>
            </div>
        </div>
      </div>
    </div>
  </div>

  <div id="modal-student-summary" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
    <div id="modal-student-summary-dialog" class="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
      <div id="student-summary-content">
      </div>
    </div>
  </div>

  <div id="modal-contact-parent" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
    <div id="modal-contact-dialog" class="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
        <div class="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              ${renderIcon("phone", "w-4 h-4 text-brand-600")}
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Фиксация контакта с родителем</h3>
              <p class="text-[11px] text-slate-500">Запись о звонке, встрече или сообщении</p>
            </div>
          </div>
          <button type="button" id="btn-close-contact-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <form id="form-contact-parent" class="space-y-3.5">
          <input type="hidden" id="contact-student-id" />

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Ученик</label>
            <div class="relative flex items-center">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("user", "w-4 h-4 text-slate-400")}
              </div>
              <input type="text" id="contact-student-name" readonly tabindex="-1"
                     class="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div>
            <label for="contact-parent-select" class="block text-xs font-semibold text-slate-700 mb-1.5">Родитель / представитель</label>
            <div class="relative">
              <select id="contact-parent-select" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="contact-channel" class="block text-xs font-semibold text-slate-700 mb-1.5">Канал связи</label>
              <div class="relative">
                <select id="contact-channel" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="phone">Телефонный звонок</option>
                  <option value="chat">Мессенджер (Сферум/TG)</option>
                  <option value="meeting">Личная встреча</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>
            <div>
              <label for="contact-topic" class="block text-xs font-semibold text-slate-700 mb-1.5">Тема</label>
              <div class="relative">
                <select id="contact-topic" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="absence">Пропуски уроков</option>
                  <option value="grades">Успеваемость по предмету</option>
                  <option value="behavior">Поведение и дисциплина</option>
                  <option value="org">Организационные вопросы</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label for="contact-summary" class="block text-xs font-semibold text-slate-700 mb-1.5">Итог разговора / комментарий</label>
            <textarea id="contact-summary" rows="3" required placeholder="Кратко опишите договорённости..."
                      class="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
          </div>

          <label for="contact-agreement" class="flex items-start p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 transition-colors cursor-pointer space-x-2.5 group">
            <input type="checkbox" id="contact-agreement" checked class="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 focus:ring-offset-0 cursor-pointer" />
            <div class="text-xs text-slate-700 select-none">
              <span class="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">Договорённость достигнута</span>
              <p class="text-[11px] text-slate-500">Причина подтверждена или намечен план действий</p>
            </div>
          </label>

          <div id="contact-reminder-container" class="hidden p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <label for="contact-reminder-date" class="block text-xs font-semibold text-amber-900">Напоминание о повторном контакте</label>
            <input type="date" id="contact-reminder-date" class="w-full h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
          </div>

          <div class="pt-2 flex items-center space-x-2.5">
            <button type="button" id="btn-cancel-contact" class="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors">
              Отмена
            </button>
            <button type="submit" class="flex-1 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>

  <div id="modal-add-note" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-note-dialog" class="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
        <div class="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              ${renderIcon("message-square", "w-4 h-4 text-brand-600")}
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Заметка классного руководителя</h3>
              <p class="text-[11px] text-slate-500">Педагогическое наблюдение</p>
            </div>
          </div>
          <button type="button" id="btn-close-note-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <form id="form-add-note" class="space-y-3.5">
          <input type="hidden" id="note-student-id" />

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Ученик</label>
            <div class="relative flex items-center">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("user", "w-4 h-4 text-slate-400")}
              </div>
              <input type="text" id="note-student-name" readonly tabindex="-1"
                     class="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div>
            <label for="note-text" class="block text-xs font-semibold text-slate-700 mb-1.5">Текст заметки</label>
            <textarea id="note-text" rows="3" required placeholder="Наблюдение за успеваемостью, поведением или контактом..."
                      class="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
          </div>

          <label for="note-private" class="flex items-start p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 transition-colors cursor-pointer space-x-2.5 group">
            <input type="checkbox" id="note-private" checked class="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 focus:ring-offset-0 cursor-pointer" />
            <div class="text-xs text-slate-700 select-none">
              <span class="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">Приватная заметка</span>
              <p class="text-[11px] text-slate-500">Заметка видна только классному руководителю</p>
            </div>
          </label>

          <div class="pt-2 flex items-center space-x-2.5">
            <button type="button" id="btn-cancel-note" class="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors">
              Отмена
            </button>
            <button type="submit" class="flex-1 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
