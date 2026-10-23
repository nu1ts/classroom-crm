import {
  getDB,
  saveDB,
  confirmAbsenceRecord,
  addParentContact,
  addStudentNote,
} from "../../services/storage.js";
import {
  calculateStudentAverage,
  calculateStudentAttendance,
  getRiskZoneStudents,
} from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";

export function formatDateRu(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoDate;
}

export function calculateAge(birthDateStr) {
  if (!birthDateStr) return 13;
  const birth = new Date(birthDateStr);
  const now = new Date(2024, 9, 28);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function daysWordRu(count) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "дней";
  if (n1 > 1 && n1 < 5) return "дня";
  if (n1 === 1) return "день";
  return "дней";
}

export function getChannelBadge(channel) {
  switch (channel) {
    case "phone":
      return { label: "Звонок", color: "bg-slate-100 text-slate-700" };
    case "chat":
      return { label: "Мессенджер", color: "bg-sky-50 text-sky-700" };
    case "personal":
    case "meeting":
      return { label: "Личная беседа", color: "bg-indigo-50 text-indigo-700" };
    case "letter":
      return { label: "Письмо", color: "bg-emerald-50 text-emerald-700" };
    default:
      return { label: "Контакт", color: "bg-slate-100 text-slate-700" };
  }
}

export function formatAbsenceDisplayText(record) {
  const isConfirmed =
    record.status === "confirmed" || record.status === "excused";
  const r = (record.reason || "").trim();
  const d = (record.document || "").trim();

  if (!isConfirmed) {
    return r || "Причина не подтверждена";
  }

  if (!r && !d) {
    return "Уважительная причина (подтверждено)";
  }

  const isIllness =
    r.toLowerCase().includes("болезн") ||
    d.toLowerCase().includes("болезн") ||
    r.toLowerCase().includes("орви") ||
    d.toLowerCase().includes("орви") ||
    r.toLowerCase() === "справка" ||
    d.toLowerCase().includes("справка") ||
    d.toLowerCase().includes("мед");

  if (isIllness) {
    const hasSpecificDoc =
      d &&
      !d.toLowerCase().includes("справка орви") &&
      d.toLowerCase() !== "справка" &&
      d.toLowerCase() !== "медицинская справка";
    let diag = "";
    const cleanR = r
      .replace(/^по болезни\s*/i, "")
      .replace(/^\(|\)$/g, "")
      .trim();
    if (
      cleanR &&
      !["справка", "болезнь", "болезнь / справка", "по болезни"].includes(
        cleanR.toLowerCase(),
      )
    ) {
      diag = cleanR;
    }

    if (diag) {
      if (hasSpecificDoc) {
        return `По болезни (${diag}, ${d})`;
      }
      return `По болезни (${diag}, справка предоставлена)`;
    } else {
      if (hasSpecificDoc) {
        return `По болезни (${d})`;
      }
      return "По болезни (справка предоставлена)";
    }
  }

  if (
    r.toLowerCase().includes("заявление") ||
    d.toLowerCase().includes("заявление")
  ) {
    const details =
      r && !r.toLowerCase().includes("заявление")
        ? r
        : "по семейным обстоятельствам";
    return `Заявление родителей (${details})`;
  }

  if (r && d) {
    if (r.toLowerCase() === d.toLowerCase()) return r;
    return `${r} (${d})`;
  }

  return r || d || "Уважительная причина (подтверждено)";
}
