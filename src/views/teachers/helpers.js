import {
  getDB,
  createTeacherCard,
  updateTeacherCard,
  deleteTeacherCard,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getInitials(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/);
  if (parts.length < 2) return (fullName || "УЧ").slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getTeacherCards(db = getDB()) {
  const users = db.users || [];
  const teachers = db.teachers || [];

  return teachers.map((teacher) => {
    const account = teacher.accountUserId
      ? users.find((u) => u.id === teacher.accountUserId)
      : users.find((u) => (u.cardName || u.shortName) === teacher.shortName);

    const workload = (teacher.workload || []).map((w) => ({
      className: w.className,
      subjectLabel: w.subjectLabel,
      hours: w.hours,
    }));

    const totalHours = workload.reduce((sum, w) => sum + (w.hours || 0), 0);
    const classNames = [...new Set(workload.map((w) => w.className))];

    return {
      teacher,
      account: account || null,
      accountLogin: account ? account.username : null,
      accountStatus: account ? account.status : null,
      workload,
      totalHours,
      classNames,
      subjectLabels: [
        ...new Set(
          (teacher.subjectIds || []).map((id) => {
            const subject = (db.subjects || []).find((s) => s.id === id);
            return subject ? subject.shortName : id;
          }),
        ),
      ],
    };
  });
}
