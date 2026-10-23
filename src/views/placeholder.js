import { getDB, getCurrentUser } from "../services/storage.js";

export function renderPlaceholderView(title, description, path) {
  const db = getDB();
  const user = getCurrentUser();
  const meta = db.meta || {};

  return `
    <div class="space-y-6 animate-fadeIn">
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-7">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2.5">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                ${user ? user.roleLabel : "Раздел"}
              </span>
              <span class="text-xs text-slate-400">Маршрут: ${path}</span>
            </div>
            <h2 class="text-xl font-bold text-slate-900 mt-2">${title}</h2>
            <p class="text-xs text-slate-500 mt-1">${description}</p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Класс 7Б · ${meta.studentsCount || 28} учеников
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div class="text-sm font-bold text-slate-800 mb-3">Состояние модуля в БП</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-slate-500">Учебный период</div>
            <div class="font-bold text-slate-800 mt-1">${meta.period?.name || "I четверть"}</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-slate-500">Классный руководитель</div>
            <div class="font-bold text-slate-800 mt-1">${meta.teacher || "Смирнова М. В."}</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-slate-500">Средний балл / Посещаемость</div>
            <div class="font-bold text-slate-800 mt-1">${meta.classAverageGrade || "4.2"} / ${meta.attendancePercentage || "93.6"}%</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
