import {
  getDB,
  createAccount,
  updateAccountRole,
  setAccountStatus,
  setAccountBinding,
  getAccountCardRef,
  resetAccountPassword,
  ROLE_LABELS,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";

export const PAGE_SIZE = 10;
export const ROLE_OPTIONS = [
  "admin",
  "teacher",
  "subject_teacher",
  "parent",
  "student",
];

export const ACCOUNT_ROLE_LABELS = {
  ...ROLE_LABELS,
  subject_teacher: "Учитель",
};

export const ROLE_BADGE_CLASSES = {
  admin: "bg-rose-100 text-rose-700",
  teacher: "bg-violet-100 text-violet-700",
  subject_teacher: "bg-sky-100 text-sky-700",
  parent: "bg-emerald-100 text-emerald-700",
  student: "bg-slate-200 text-slate-700",
};

export function getBindingLabel(user, db) {
  switch (user.role) {
    case "teacher":
      return user.cardName
        ? `Учитель: ${user.cardName}`
        : user.className || "Классный руководитель";
    case "subject_teacher":
      return user.cardName
        ? `Учитель: ${user.cardName}`
        : user.subject || "Без нагрузки";
    case "parent":
      return user.childName || "Без привязки";
    case "student": {
      const student = (db.students || []).find((s) => s.id === user.studentId);
      if (student) {
        return `Ученик: ${student.shortName || student.fullName}`;
      }
      return user.className || "Без привязки";
    }
    case "admin":
      return "Все классы школы";
    default:
      return "—";
  }
}

/**
 * Список учётных карточек, доступных для привязки по роли
 */
export function getCardOptions(db, role, user = null) {
  if (role === "student" || role === "parent") {
    return (db.students || []).map((s) => ({ id: s.id, label: s.fullName }));
  }
  if (role === "teacher" || role === "subject_teacher") {
    const names = [...new Set((db.subjects || []).map((s) => s.teacher))];
    if (user && user.shortName && !names.includes(user.shortName)) {
      names.push(user.shortName);
    }
    return names.map((name) => ({ id: name, label: name }));
  }
  return [];
}

export function formatLastLogin(isoValue, demoToday) {
  if (!isoValue) return "—";
  const dateStr = isoValue.slice(0, 10);
  const timeStr = isoValue.slice(11, 16);

  if (dateStr === demoToday) {
    return timeStr ? `Сегодня, ${timeStr}` : "Сегодня";
  }

  const demoDate = new Date(`${demoToday}T00:00:00`);
  const prevDate = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((demoDate - prevDate) / 86400000);
  if (diffDays === 1) {
    return timeStr ? `Вчера, ${timeStr}` : "Вчера";
  }

  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}${timeStr ? `, ${timeStr}` : ""}`;
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function statusBadgeHtml(isActive) {
  return isActive
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Активен</span>`
    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">Заблокирован</span>`;
}

export function roleBadgeHtml(user) {
  const label = ACCOUNT_ROLE_LABELS[user.role] || user.roleLabel || user.role;
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE_CLASSES[user.role] || "bg-slate-100 text-slate-600"}">${escapeHtml(label)}</span>`;
}

export function toggleStatusButtonHtml(user, isSelf) {
  const isActive = user.status === "active";
  if (isActive) {
    return `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="blocked"
              ${isSelf ? 'disabled title="Нельзя заблокировать собственную учётную запись"' : 'title="Заблокировать учётную запись"'}
              class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                isSelf
                  ? "border-slate-200 text-slate-300 cursor-not-allowed"
                  : "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer"
              }">Блок</button>`;
  }
  return `<button type="button" data-action="toggle-status" data-user-id="${user.id}" data-next-status="active" title="Разблокировать учётную запись"
            class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer">Разблок</button>`;
}
