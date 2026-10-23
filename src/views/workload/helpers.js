import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";
import {
  addWorkloadRow,
  getDB,
  getWorkloadRows,
  removeWorkloadRow,
  updateWorkloadRow,
} from "../../services/storage.js";
import { getActiveAcademicYear } from "../../services/school-year.js";
import { getClassDirectory } from "../../services/directories.js";

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function pluralizeRows(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "строка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "строки";
  return "строк";
}

export function pluralizeClasses(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "классе";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "классах";
  return "классах";
}

export function pluralizeTeachers(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "учитель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "учителя";
  return "учителей";
}

export function pluralizeHours(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "час";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "часа";
  return "часов";
}

export function filterWorkloadRows(rows, state = {}) {
  const query = (state.searchQuery || "").trim().toLowerCase();
  return rows.filter((row) => {
    if (
      state.filterSubject &&
      state.filterSubject !== "all" &&
      row.subjectId !== state.filterSubject
    )
      return false;
    if (
      state.filterClass &&
      state.filterClass !== "all" &&
      row.classId !== state.filterClass
    )
      return false;
    if (!query) return true;
    return [
      row.teacherName,
      row.teacherShortName,
      row.subjectLabel,
      row.className,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(query),
    );
  });
}
