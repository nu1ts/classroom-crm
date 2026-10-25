import { getDB, saveDB, getCurrentUser } from "./storage.js";

export const DEMO_ANNOUNCEMENT_DATE = "2024-10-28";

export function formatDateRu(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}.${mm}.${yyyy}`;
  }
  return isoDate;
}

export function validateAnnouncementData({ title, content }) {
  const errors = {};
  const trimmedTitle = (title || "").trim();
  const trimmedContent = (content || "").trim();

  if (!trimmedTitle) {
    errors.title = "Заголовок объявления обязателен для заполнения";
  } else if (trimmedTitle.length < 3) {
    errors.title = "Заголовок должен содержать не менее 3 символов";
  }

  if (!trimmedContent) {
    errors.content = "Текст объявления обязателен для заполнения";
  } else if (trimmedContent.length < 5) {
    errors.content = "Текст должен содержать не менее 5 символов";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getAnnouncements(targetClassId = "class-7b") {
  const db = getDB();
  const list = (db.announcements || []).filter(
    (a) =>
      (!a.classId || a.classId === targetClassId || a.target === "all") &&
      a.status !== "deleted"
  );
  return list;
}

export function createAnnouncement({
  title,
  content,
  classId = "class-7b",
  date = DEMO_ANNOUNCEMENT_DATE,
  author,
}) {
  const validation = validateAnnouncementData({ title, content });
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const db = getDB();
  const currentUser = getCurrentUser();
  const authorName =
    author || (currentUser && currentUser.name) || "Смирнова М. В.";

  const totalCount =
    (db.students || []).filter((s) => s.classId === classId).length || 28;

  const newAnnouncement = {
    id: `anc-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    date: date || DEMO_ANNOUNCEMENT_DATE,
    author: authorName,
    classId: classId,
    target: "all",
    readBy: [],
    readCount: 0,
    totalCount: totalCount,
    status: "published",
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.announcements)) {
    db.announcements = [];
  }

  db.announcements.unshift(newAnnouncement);
  saveDB(db);

  return { success: true, item: newAnnouncement };
}

export function updateAnnouncement(id, { title, content }) {
  const validation = validateAnnouncementData({ title, content });
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const db = getDB();
  const item = (db.announcements || []).find((a) => a.id === id);
  if (!item) {
    return { success: false, errors: { general: "Объявление не найдено" } };
  }

  item.title = title.trim();
  item.content = content.trim();
  item.updatedAt = new Date().toISOString();

  saveDB(db);
  return { success: true, item };
}

export function deleteAnnouncement(id) {
  const db = getDB();
  const initialLength = (db.announcements || []).length;
  db.announcements = (db.announcements || []).filter((a) => a.id !== id);
  saveDB(db);
  return db.announcements.length < initialLength;
}

export function markAnnouncementRead(id, userIdentifier) {
  if (!userIdentifier) return false;
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.role !== "parent" && currentUser.role !== "student") {
    return false;
  }
  const db = getDB();
  const item = (db.announcements || []).find((a) => a.id === id);
  if (!item) return false;

  if (!Array.isArray(item.readBy)) {
    item.readBy = [];
  }

  let familyKey = userIdentifier;
  if (currentUser) {
    if (currentUser.role === "parent" && currentUser.childStudentId) {
      familyKey = currentUser.childStudentId;
    } else if (currentUser.role === "student" && currentUser.studentId) {
      familyKey = currentUser.studentId;
    }
  }

  if (!item.readBy.includes(familyKey) && !item.readBy.includes(userIdentifier)) {
    item.readBy.push(familyKey);
    item.readCount = Math.min(item.totalCount || 28, item.readBy.length);
    saveDB(db);
    return true;
  }

  return false;
}
