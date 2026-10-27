import {
  generateDaysOfWeek,
  generateUnconfirmedBannerText,
} from "./helpers.js";
import {
  getDB,
  getCurrentUser,
  confirmAbsenceRecord,
  batchConfirmAbsences,
} from "../../services/storage.js";
import { getUnconfirmedAbsences } from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";
import { navigate } from "../../services/navigation.js";

export function renderAttendanceView(options = {}) {
  const db = getDB();
  const currentUser = getCurrentUser();
  const isSubjectTeacher = currentUser && currentUser.role === "subject_teacher";
  const periodId = "q1_2024";

  let teacherWorkload = [];
  if (isSubjectTeacher) {
    const teacherProfile = (db.teachers || []).find(
      (t) =>
        t.accountUserId === currentUser.id ||
        t.fullName === currentUser.name ||
        t.fullName === currentUser.personName,
    );
    teacherWorkload = (teacherProfile && teacherProfile.workload) || [];
  }

  const queryString = window.location.search || "";
  const urlParams = new URLSearchParams(queryString);
  let selectedClassId = options.classId || urlParams.get("class") || (isSubjectTeacher ? "class-7b" : "class-7b");
  if (currentUser && currentUser.role === "teacher" && currentUser.classId) {
    selectedClassId = currentUser.classId;
  }

  const currentClassObj = (db.classes || []).find(
    (c) => c.id === selectedClassId || c.name.toLowerCase() === selectedClassId.toLowerCase(),
  );
  const classNameDisplay = currentClassObj ? currentClassObj.name : "7Б";

  const allStudents = db.students || [];
  const students = allStudents.filter(
    (st) => !st.classId || st.classId === selectedClassId || selectedClassId === "class-7b",
  );

  const unconfirmedList = getUnconfirmedAbsences(
    db.attendance,
    db.lessons,
    students,
    { periodId },
  );
  const unconfirmedCount = unconfirmedList.length;
  const bannerDynamicText = generateUnconfirmedBannerText(unconfirmedList);

  const weeks = [
    {
      id: "w8",
      label: "21.10.2024 – 25.10.2024 (Текущая неделя)",
      from: "2024-10-21",
      to: "2024-10-25",
    },
    {
      id: "w7",
      label: "14.10.2024 – 18.10.2024",
      from: "2024-10-14",
      to: "2024-10-18",
    },
    {
      id: "w6",
      label: "07.10.2024 – 11.10.2024",
      from: "2024-10-07",
      to: "2024-10-11",
    },
    {
      id: "w5",
      label: "30.09.2024 – 04.10.2024",
      from: "2024-09-30",
      to: "2024-10-04",
    },
    {
      id: "w4",
      label: "23.09.2024 – 27.09.2024",
      from: "2024-09-23",
      to: "2024-09-27",
    },
    {
      id: "w3",
      label: "16.09.2024 – 20.09.2024",
      from: "2024-09-16",
      to: "2024-09-20",
    },
    {
      id: "w2",
      label: "09.09.2024 – 13.09.2024",
      from: "2024-09-09",
      to: "2024-09-13",
    },
    {
      id: "w1",
      label: "02.09.2024 – 06.09.2024",
      from: "2024-09-02",
      to: "2024-09-06",
    },
  ];

  const highlightedStudentId = urlParams.get("studentId");
  const activeWeekId = options.weekId || urlParams.get("week") || "w8";
  const selectedWeek = weeks.find((w) => w.id === activeWeekId) || weeks[0];

  const daysOfWeek = generateDaysOfWeek(selectedWeek.from);
  const weekDateSet = new Set(daysOfWeek.map((d) => d.date));
  let weekLessons = (db.lessons || []).filter((l) => weekDateSet.has(l.date));

  if (isSubjectTeacher) {
    const workloadClasses = new Set(teacherWorkload.map((w) => w.classId));
    weekLessons = weekLessons.filter(
      (l) =>
        (!l.classId || l.classId === selectedClassId) &&
        (l.teacher === currentUser.personName ||
          l.teacher === currentUser.shortName ||
          l.subjectId === "math"),
    );
  }
  const weekLessonsCount = weekLessons.length > 0 ? weekLessons.length : isSubjectTeacher ? 5 : 20;

  const attendanceByStudentDay = new Map();
  const weekLessonIds = new Set(weekLessons.map((l) => l.id));
  (db.attendance || []).forEach((att) => {
    if (isSubjectTeacher && !weekLessonIds.has(att.lessonId)) {
      return;
    }
    const key = `${att.studentId}_${att.date}`;
    const existing = attendanceByStudentDay.get(key) || [];
    existing.push(att);
    attendanceByStudentDay.set(key, existing);
  });

  const studentRows = students.map((st, index) => {
    let weekAbsenceLessons = 0;
    let hasUnconfirmed = false;

    const dayCells = daysOfWeek
      .map((day) => {
        const records =
          attendanceByStudentDay.get(`${st.id}_${day.date}`) || [];
        if (records.length === 0) {
          return `
          <td class="py-3 px-3 text-center">
            <span class="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400">
              —
            </span>
          </td>
        `;
        }

        const unconfirmedRec = records.find(
          (r) =>
            (r.status === "unconfirmed" || r.code === "Н (без)") &&
            r.value === "absent",
        );
        const excusedRec = records.find(
          (r) =>
            (r.status === "excused" ||
              r.status === "confirmed" ||
              r.code === "УП") &&
            r.value === "absent",
        );
        const unexcusedRec = records.find(
          (r) =>
            (r.status === "unexcused" ||
              (r.code === "Н" &&
                r.status !== "unconfirmed" &&
                r.code !== "Н (без)")) &&
            r.value === "absent",
        );
        const allPresent =
          records.length > 0 && records.every((r) => r.value === "present");

        const dayAbsenceRecords = records.filter((r) => r.value === "absent");
        weekAbsenceLessons += dayAbsenceRecords.length;

        if (unconfirmedRec) {
          hasUnconfirmed = true;
          const countBadge =
            dayAbsenceRecords.length > 1
              ? ` (${dayAbsenceRecords.length})`
              : "";
          if (isSubjectTeacher) {
            return `
            <td class="py-3 px-3 text-center">
              <span title="Пропущено уроков: ${dayAbsenceRecords.length}. Не подтверждено"
                    class="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-rose-500 text-white shadow-2xs">
                Н (без)${countBadge}
              </span>
            </td>
          `;
          }
          return `
          <td class="py-3 px-3 text-center">
            <button type="button"
                    data-action="open-confirm"
                    data-att-id="${unconfirmedRec.id}"
                    data-student-id="${st.id}"
                    data-student-name="${st.fullName}"
                    data-date="${day.date}"
                    data-lesson-id="${unconfirmedRec.lessonId}"
                    title="Пропущено уроков: ${dayAbsenceRecords.length}. Кликните для подтверждения уважительной причины"
                    class="btn-open-confirm-cell inline-block px-3 py-1 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-2xs hover:scale-105 transition-transform cursor-pointer">
              Н (без)${countBadge}
            </button>
          </td>
        `;
        } else if (excusedRec) {
          const countBadge =
            dayAbsenceRecords.length > 1
              ? ` (${dayAbsenceRecords.length})`
              : "";
          return `
          <td class="py-3 px-3 text-center">
            <span title="${excusedRec.reason || "Уважительная причина"} · ${excusedRec.document || "Справка предоставлена"} (пропущено уроков: ${dayAbsenceRecords.length})"
                  class="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-2xs">
              УП${countBadge}
            </span>
          </td>
        `;
        } else if (unexcusedRec) {
          const countBadge =
            dayAbsenceRecords.length > 1
              ? ` (${dayAbsenceRecords.length})`
              : "";
          return `
          <td class="py-3 px-3 text-center">
            <span title="Неуважительная причина (пропущено уроков: ${dayAbsenceRecords.length})"
                  class="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 text-white shadow-2xs">
              Н${countBadge}
            </span>
          </td>
        `;
        } else if (allPresent) {
          return `
          <td class="py-3 px-3 text-center">
            <span class="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-2xs">
              Был
            </span>
          </td>
        `;
        }

        return `
        <td class="py-3 px-3 text-center">
          <span class="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-700">
            —
          </span>
        </td>
      `;
      })
      .join("");

    return {
      student: st,
      index: index + 1,
      hasAbsences: weekAbsenceLessons > 0,
      hasUnconfirmed,
      weekAbsenceLessons,
      html: `
        <tr class="student-row hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${hasUnconfirmed ? "bg-rose-50/20" : ""} ${st.id === highlightedStudentId ? "ring-2 ring-brand-500 bg-brand-50/40" : ""}" data-student-id="${st.id}" data-has-absences="${weekAbsenceLessons > 0}">
          <td class="py-3.5 px-4 font-semibold text-xs text-slate-400 text-center w-12">
            ${index + 1}
          </td>
          <td class="py-3.5 px-4 font-bold text-xs text-slate-900">
            <div class="flex items-center space-x-2">
              <span>${st.fullName}</span>
              ${
                !isSubjectTeacher && hasUnconfirmed
                  ? `
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  Требует справку
                </span>
              `
                  : ""
              }
            </div>
          </td>
          ${dayCells}
          <td class="py-3.5 px-4 text-center font-bold text-xs ${weekAbsenceLessons > 0 ? "text-rose-600" : "text-slate-500"}">
            ${weekAbsenceLessons > 0 ? `${weekAbsenceLessons} ур.` : "0"}
          </td>
        </tr>
      `,
    };
  });

  return `
    <div class="space-y-5 animate-fadeIn pb-12">
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          ${
            isSubjectTeacher && teacherWorkload.length > 0
              ? `
            <div>
              <label for="select-attendance-class" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Класс
              </label>
              <div class="relative">
                <select id="select-attendance-class"
                        class="appearance-none pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  ${teacherWorkload
                    .map(
                      (w) => `
                    <option value="${w.classId}" ${w.classId === selectedClassId ? "selected" : ""}>
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
            <label for="select-attendance-week" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Учебная неделя
            </label>
            <div class="relative">
              <select id="select-attendance-week"
                      class="appearance-none pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                ${weeks
                  .map(
                    (w) => `
                  <option value="${w.id}" ${w.id === activeWeekId ? "selected" : ""}>
                    ${w.label}
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

          <label for="filter-only-absences" class="flex items-center space-x-2 pt-0 sm:pt-5 cursor-pointer select-none group">
            <input type="checkbox" id="filter-only-absences" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
            <span class="text-xs font-semibold text-slate-700 group-hover:text-brand-600 transition-colors flex items-center space-x-1.5">
              ${renderIcon("filter", "w-3.5 h-3.5 text-slate-400")}
              <span>Показать только пропуски</span>
            </span>
          </label>
        </div>

        ${
          !isSubjectTeacher
            ? `
        <div class="flex items-center space-x-2.5">
          <button type="button" id="btn-open-batch-confirm"
                  class="py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center space-x-2">
            ${renderIcon("check-square", "w-4 h-4")}
            <span>Подтвердить уваж. причину</span>
          </button>
        </div>
        `
            : ""
        }
      </div>

      ${
        !isSubjectTeacher && unconfirmedCount > 0
          ? `
        <div id="banner-unconfirmed" class="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div class="flex items-start space-x-3">
            <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-rose-200">
              ${renderIcon("alert", "w-5 h-5")}
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Неподтверждённые пропуски</span>
                <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white">
                  ${unconfirmedCount}
                </span>
              </h3>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed" id="banner-unconfirmed-text">
                ${bannerDynamicText}
              </p>
            </div>
          </div>
          <button type="button" id="btn-banner-confirm"
                  class="self-start sm:self-center py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors whitespace-nowrap">
            Подтвердить причину
          </button>
        </div>
      `
          : ""
      }

      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Журнал посещаемости ${classNameDisplay}</h2>
            <p class="text-xs text-slate-500 mt-0.5">${students.length} учеников · Учебная неделя ${selectedWeek.label.replace(" (Текущая неделя)", "")}</p>
          </div>
          <span class="text-xs font-semibold text-slate-500">
            Уроков в журнале: ${weekLessonsCount}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse" id="table-attendance">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th class="py-3 px-4 text-center w-12">№</th>
                <th class="py-3 px-4">ФИО ученика</th>
                ${daysOfWeek.map((d) => `<th class="py-3 px-3 text-center">${d.dayLabel}</th>`).join("")}
                <th class="py-3 px-4 text-center">Итого</th>
              </tr>
            </thead>
            <tbody id="tbody-attendance">
              ${studentRows.map((r) => r.html).join("")}
            </tbody>
          </table>
        </div>

        <div class="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-600">
          <span class="font-bold text-slate-800">Условные обозначения:</span>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-2xs">Был</span>
            <span>Присутствовал</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-500 text-white shadow-2xs">Н (без)</span>
            <span>Неуважительная причина (Неподтверждено)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-2xs">УП</span>
            <span>Уважительная причина (Справка / Заявление)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-700 text-white shadow-2xs">Н</span>
            <span>Неуважительная причина (Прогул)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200">—</span>
            <span>Нет уроков по расписанию</span>
          </div>
          ${
            !isSubjectTeacher
              ? `
          <div class="flex items-center space-x-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Требует справку</span>
            <span>Ожидает подтверждения от родителей</span>
          </div>
          `
              : ""
          }
        </div>
      </div>
    </div>

    ${
      !isSubjectTeacher
        ? `
    <div id="modal-confirm-absence" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-confirm-dialog" class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
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
          <button type="button" id="btn-close-confirm-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <form id="form-confirm-absence" class="space-y-4">
          <input type="hidden" id="confirm-attendance-id" />

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Ученик</label>
            <div class="relative flex items-center">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("user", "w-4 h-4 text-slate-400")}
              </div>
              <input type="text" id="confirm-student-name" readonly tabindex="-1"
                     class="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Дата пропуска</label>
              <input type="text" id="confirm-absence-date" readonly tabindex="-1"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Урок / Предмет</label>
              <input type="text" id="confirm-absence-lesson" readonly tabindex="-1"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-800 cursor-default select-none focus:outline-none" />
            </div>
          </div>

          <div>
            <label for="confirm-reason-type" class="block text-xs font-semibold text-slate-700 mb-1.5">Тип причины</label>
            <div class="relative">
              <select id="confirm-reason-type" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                <option value="excused">Уважительная (по справке от врача / заявлению родителей)</option>
                <option value="unexcused">Неуважительная (прогул / причина не подтверждена)</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>

          <div id="block-document-fields" class="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <label for="confirm-has-certificate" class="flex items-center space-x-2 cursor-pointer select-none">
              <input type="checkbox" id="confirm-has-certificate" checked class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
              <span class="text-xs font-semibold text-slate-800">Предоставлен подтверждающий документ (справка / заявление)</span>
            </label>

            <div>
              <label for="confirm-document-text" class="block text-xs font-semibold text-slate-700 mb-1">
                Реквизиты документа (номер, дата, медучреждение)
              </label>
              <input type="text" id="confirm-document-text"
                     placeholder="Справка № 142 от 25.10.2024 (ДГП № 1)"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
            </div>
          </div>

          <div>
            <label for="confirm-notes" class="block text-xs font-semibold text-slate-700 mb-1.5">Комментарий классного руководителя</label>
            <textarea id="confirm-notes" rows="2" placeholder="Дополнительное примечание к пропуску..."
                      class="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
          </div>

          <div class="pt-2 flex items-center space-x-2.5">
            <button type="button" id="btn-cancel-confirm" class="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="submit" class="flex-1 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer">
              Подтвердить пропуск
            </button>
          </div>
        </form>
      </div>
    </div>
    `
        : ""
    }
  `;
}
