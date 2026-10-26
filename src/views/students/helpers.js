import { getDB, saveDB } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";
import {
  calculateStudentAttendance,
  calculateStudentAverage,
  getRiskZoneStudents,
} from "../../mock/calculations.js";

export const PERIODS = [
  { id: "q1_2024", name: "I четверть (02.09 - 25.10.2024)" },
  { id: "sept_2024", name: "Сентябрь 2024 (02.09 - 30.09.2024)" },
  { id: "oct_2024", name: "Октябрь 2024 (01.10 - 25.10.2024)" },
  { id: "q2_2024", name: "II четверть (05.11 - 27.12.2024)" },
  { id: "q3_2024", name: "III четверть (09.01 - 21.03.2025)" },
  { id: "q4_2024", name: "IV четверть (31.03 - 23.05.2025)" },
  { id: "year_2024_2025", name: "2024/2025 учебный год" },
];

export function prepareStudentRows(db, periodId, classId = "class-7b") {
  const periodDateRanges = {
    sept_2024: { dateFrom: "2024-09-01", dateTo: "2024-09-30" },
    oct_2024: { dateFrom: "2024-10-01", dateTo: "2024-10-31" },
  };
  const dateRange = periodDateRanges[periodId] || {};
  const queryPeriodId = periodDateRanges[periodId] ? "q1_2024" : periodId;
  const periodOptions = {
    periodId: queryPeriodId,
    ...dateRange,
    classId,
  };

  const rawStudents = (db.students || []).filter(
    (s) => (!s.classId || s.classId === classId) && s.status !== "archived",
  );
  const riskStudents = getRiskZoneStudents(
    db.students,
    db.lessons,
    db.attendance,
    db.grades,
    db.subjects,
    periodOptions,
  );
  const riskStudentIds = new Set(riskStudents.map((r) => r.studentId));

  return rawStudents.map((student) => {
    const studentOpts = { ...periodOptions, classId: student.classId || "class-7b" };
    const avg = calculateStudentAverage(db.grades, student.id, studentOpts);
    const att = calculateStudentAttendance(
      db.lessons,
      db.attendance,
      student.id,
      studentOpts,
    );
    const isRisk = riskStudentIds.has(student.id);

    const rels = (db.parentStudentRelations || []).filter(
      (r) => r.studentId === student.id,
    );
    const primaryRel =
      rels.find((r) => r.isPrimary || r.isPrimaryContact) || rels[0];
    const parent = primaryRel
      ? (db.parents || []).find((p) => p.id === primaryRel.parentId)
      : null;

    const parts = (student.fullName || "").trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`
        : student.fullName
          ? student.fullName.slice(0, 2)
          : "УЧ";

    return {
      student,
      initials: initials.toUpperCase(),
      averageGrade: avg,
      attendance: att,
      isRisk,
      parent,
      parentRelationRole: primaryRel?.relationRole || "Родитель",
    };
  });
}

export function filterAndSortRows(
  studentRows,
  { searchQuery, filterAbsencesOnly, sortBy, sortOrder },
) {
  const filtered = studentRows.filter((row) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ln = (row.student.lastName || "").toLowerCase();
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

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "grade") {
      const gA = a.averageGrade !== null ? a.averageGrade : -1;
      const gB = b.averageGrade !== null ? b.averageGrade : -1;
      cmp = gA - gB;
      if (cmp === 0) {
        cmp = (a.student.lastName || "").localeCompare(
          b.student.lastName || "",
          "ru",
        );
      }
    } else if (sortBy === "absences") {
      const absA = a.attendance?.absentCount ?? 0;
      const absB = b.attendance?.absentCount ?? 0;
      cmp = absA - absB;
      if (cmp === 0) {
        cmp = (a.student.lastName || "").localeCompare(
          b.student.lastName || "",
          "ru",
        );
      }
    } else {
      cmp = (a.student.lastName || "").localeCompare(
        b.student.lastName || "",
        "ru",
      );
    }

    return sortOrder === "desc" ? -cmp : cmp;
  });

  return filtered;
}

export function renderTableHtml({
  pageRows,
  totalFiltered,
  totalInClass,
  startShown,
  endShown,
  validPage,
  totalPages,
  sortBy,
  sortOrder,
  searchQuery,
}) {
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <th scope="col" class="py-3.5 pl-6 pr-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable" data-sort-by="name">
              <div class="flex items-center space-x-1.5">
                <span>ФИО УЧЕНИКА</span>
                ${sortBy === "name" ? renderIcon("chevron-down", "w-3 h-3 text-brand-600 " + (sortOrder === "asc" ? "" : "transform rotate-180")) : ""}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4 text-center">СТАТУС</th>
            <th scope="col" class="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable text-center" data-sort-by="grade">
              <div class="inline-flex items-center space-x-1.5">
                <span>СРЕДНИЙ БАЛЛ</span>
                ${sortBy === "grade" ? renderIcon("chevron-down", "w-3 h-3 text-brand-600 " + (sortOrder === "asc" ? "" : "transform rotate-180")) : ""}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors col-sortable text-center" data-sort-by="absences">
              <div class="inline-flex items-center space-x-1.5">
                <span>ПРОПУСКИ</span>
                ${sortBy === "absences" ? renderIcon("chevron-down", "w-3 h-3 text-brand-600 " + (sortOrder === "asc" ? "" : "transform rotate-180")) : ""}
              </div>
            </th>
            <th scope="col" class="py-3.5 px-4">РОДИТЕЛЬ ДЛЯ СВЯЗИ</th>
            <th scope="col" class="py-3.5 pl-4 pr-6 text-right">ДЕЙСТВИЯ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs">
          ${
            pageRows.length > 0
              ? pageRows
                  .map((row) => {
                    const s = row.student;
                    const isAbsentAlert =
                      row.attendance && row.attendance.absenceRate > 20;

                    let gradeColor = "text-slate-900";
                    if (row.averageGrade !== null) {
                      if (row.averageGrade >= 4.5)
                        gradeColor = "text-emerald-600";
                      else if (row.averageGrade < 3.5)
                        gradeColor = "text-rose-600";
                      else gradeColor = "text-amber-600";
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
                        ${
                          row.isRisk
                            ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                            В зоне риска
                          </span>
                        `
                            : ""
                        }
                      </div>
                      <div class="text-[11px] text-slate-400 mt-0.5">
                        Личное дело: ${s.id} · ${s.birthDate || "2011 г."}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${s.status === "active" ? "bg-brand-500 text-white shadow-2xs" : "bg-slate-100 text-slate-600"}">
                    ${s.status === "active" ? "Активен" : "В архиве"}
                  </span>
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="text-sm font-extrabold ${gradeColor}">
                    ${row.averageGrade !== null ? row.averageGrade.toFixed(1).replace(".", ",") : "—"}
                  </span>
                </td>

                <td class="py-4 px-4 text-center">
                  <div class="inline-flex flex-col items-center">
                    <span class="font-bold ${isAbsentAlert ? "text-amber-700" : "text-slate-800"} text-xs">
                      ${row.attendance.absentCount} из ${row.attendance.totalLessons}
                    </span>
                    <span class="text-[10px] text-slate-400 mt-0.5">
                      ${row.attendance.absentCount === 0 ? "0 дней" : row.attendance.absentCount + (row.attendance.absentCount === 1 ? " день" : row.attendance.absentCount < 5 ? " дня" : " дней")}
                    </span>
                  </div>
                </td>

                <td class="py-4 px-4">
                  ${
                    row.parent
                      ? `
                    <div>
                      <div class="font-semibold text-slate-900 text-xs">${row.parent.fullName}</div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${row.parent.phone || "Телефон не указан"}</div>
                    </div>
                  `
                      : `
                    <span class="text-slate-400 text-xs italic">Контакт не указан</span>
                  `
                  }
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
                  })
                  .join("")
              : `
            <tr>
              <td colspan="6" class="py-12 text-center text-slate-500">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    ${renderIcon("users", "w-6 h-6")}
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
          `
          }
        </tbody>
      </table>
    </div>

    <div class="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="text-xs text-slate-500 font-medium" id="students-counter-label">
        ${totalFiltered === 1 && searchQuery ? `Показано 1 из ${totalInClass} учеников 7Б класса` : `Показано ${startShown}–${endShown} из ${totalInClass} учеников 7Б класса`}
      </div>

      ${
        totalPages > 1
          ? `
        <div class="flex items-center space-x-1.5 select-none">
          <button type="button"
                  data-page="${validPage - 1}"
                  class="btn-pagination-nav w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  ${validPage <= 1 ? "disabled" : ""}>
            ${renderIcon("chevron-left", "w-4 h-4")}
          </button>

          ${Array.from({ length: totalPages }, (_, i) => i + 1)
            .map(
              (pageNum) => `
            <button type="button"
                    data-page="${pageNum}"
                    class="btn-pagination-page w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${pageNum === validPage ? "bg-brand-500 text-white shadow-xs" : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs"}">
              ${pageNum}
            </button>
          `,
            )
            .join("")}

          <button type="button"
                  data-page="${validPage + 1}"
                  class="btn-pagination-nav w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  ${validPage >= totalPages ? "disabled" : ""}>
            ${renderIcon("chevron-right", "w-4 h-4")}
          </button>
        </div>
      `
          : ""
      }
    </div>
  `;
}
