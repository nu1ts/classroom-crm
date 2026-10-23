import { renderIcon } from "../../components/icons.js";

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateRu(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function getDurationText(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return "";
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return "";
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.round((diffDays / 7) * 10) / 10;
  return `${diffDays} дн. (${weeks} нед.)`;
}

export function findUpcomingVacation(vacations, todayStr = "2024-10-28") {
  if (!vacations || vacations.length === 0) return null;
  const sorted = [...vacations].sort((a, b) =>
    (a.startDate || "").localeCompare(b.startDate || ""),
  );
  const currentOrNext = sorted.find((v) => (v.endDate || "") >= todayStr);
  return currentOrNext || sorted[0];
}

export function renderYearTabsHtml(years, selectedYearId) {
  return years
    .map((y) => {
      const isSelected = y.id === selectedYearId;
      const isActive = y.isActive;
      return `
      <button type="button" data-year-tab="${escapeHtml(y.id)}"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${isSelected ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}">
        <span>${escapeHtml(y.name)}</span>
        ${
          isActive
            ? `
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Текущий учебный год"></span>
        `
            : ""
        }
      </button>
    `;
    })
    .join("");
}

export function renderQuartersTableHtml(quarters) {
  if (!quarters || quarters.length === 0) {
    return `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400">Четверти не настроены</td>
      </tr>
    `;
  }
  return quarters
    .map((q, idx) => {
      const isQActive = !!q.isActive;
      return `
      <tr class="hover:bg-slate-50/60 transition-colors ${isQActive ? "bg-emerald-50/20" : ""}" data-quarter-row="${escapeHtml(q.id)}">
        <td class="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
          <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">${idx + 1}</span>
          <span class="quarter-name">${escapeHtml(q.name)}</span>
        </td>
        <td class="py-3.5 px-4 font-medium text-slate-800 quarter-dates">
          ${formatDateRu(q.startDate)} – ${formatDateRu(q.endDate)}
        </td>
        <td class="py-3.5 px-4 text-slate-500">
          ${getDurationText(q.startDate, q.endDate)}
        </td>
        <td class="py-3.5 px-4 quarter-status">
          ${
            isQActive
              ? `
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ${renderIcon("check", "w-3 h-3 mr-1 text-emerald-600")}
              Текущая четверть
            </span>
          `
              : `
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Неактивна
            </span>
          `
          }
        </td>
        <td class="py-3.5 px-4 text-right space-x-1">
          ${
            !isQActive
              ? `
            <button type="button" data-action="set-active-quarter" data-quarter-id="${escapeHtml(q.id)}"
                    class="px-2.5 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs transition-colors cursor-pointer">
              Сделать текущей
            </button>
          `
              : ""
          }
          <button type="button" data-action="edit-quarter" data-quarter-id="${escapeHtml(q.id)}"
                  data-quarter-name="${escapeHtml(q.name)}" data-start-date="${escapeHtml(q.startDate)}" data-end-date="${escapeHtml(q.endDate)}"
                  class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center space-x-1">
            ${renderIcon("edit", "w-3.5 h-3.5")}
            <span>Изменить даты</span>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

export function renderVacationsGridHtml(vacations) {
  if (!vacations || vacations.length === 0) {
    return `<div class="col-span-3 py-4 text-center text-xs text-slate-400">Периоды каникул не добавлены</div>`;
  }
  return vacations
    .map(
      (v) => `
    <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between" data-vacation-card="${escapeHtml(v.id)}">
      <div>
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900 text-xs">${escapeHtml(v.name)}</span>
          <button type="button" data-action="delete-vacation" data-vacation-id="${escapeHtml(v.id)}" data-vacation-name="${escapeHtml(v.name)}"
                  class="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer" title="Удалить">
            ${renderIcon("x", "w-3.5 h-3.5")}
          </button>
        </div>
        <div class="text-xs font-semibold text-slate-700 mt-1.5">
          ${formatDateRu(v.startDate)} – ${formatDateRu(v.endDate)}
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5">
          ${getDurationText(v.startDate, v.endDate)}
        </div>
      </div>
      <div class="mt-3 text-right">
        <button type="button" data-action="edit-vacation" data-vacation-id="${escapeHtml(v.id)}"
                data-vacation-name="${escapeHtml(v.name)}" data-start-date="${escapeHtml(v.startDate)}" data-end-date="${escapeHtml(v.endDate)}"
                class="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
          Редактировать
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}
