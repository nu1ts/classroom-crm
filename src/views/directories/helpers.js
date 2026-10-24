import {
  getDB,
  getSubjectDirectory,
  getRoomDirectory,
  isSubjectInUse,
  isClassInUse,
  isRoomInUse,
} from "../../services/storage.js";

/**
 * Экранирование HTML-спецсимволов в тексте.
 * @param {*} text Исходный текст
 * @returns {string} Экранированный текст
 */
export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Русское склонение существительного для счётчиков (1 запись / 2 записи / 5 записей).
 * @param {number} count Количество
 * @param {string[]} forms Формы вида [«запись», «записи», «записей»]
 * @returns {string} Нужная форма слова
 */
export function pluralize(count, forms) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return forms[1];
  return forms[2];
}

/**
 * Данные страницы «Справочники»: записи трёх справочников с признаками использования.
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {Object} { subjects, rooms, classes }
 */
export function getDirectoriesData(db = getDB()) {
  const subjects = getSubjectDirectory(db).map((s) => ({
    ...s,
    inUse: isSubjectInUse(s.id, db),
  }));
  const rooms = getRoomDirectory(db).map((r) => ({
    ...r,
    inUse: isRoomInUse(r.name, db),
  }));
  const classes = (db.classes || [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive !== false,
    }))
    .map((c) => ({
      ...c,
      inUse: isClassInUse(c.id, db),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return { subjects, rooms, classes };
}

/**
 * Количество записей по вкладкам справочников.
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {Object} { subjects, rooms, classes }
 */
export function getDirectoryCounts(db = getDB()) {
  return {
    subjects: (db.subjects || []).length,
    rooms: (db.rooms || []).length,
    classes: (db.classes || []).length,
  };
}

/**
 * Валидная вкладка страницы (для URL-параметра tab).
 * @param {*} tab Значение вкладки из параметров
 * @returns {string} «subjects» | «rooms» | «classes»
 */
export function normalizeTab(tab) {
  return ["subjects", "rooms", "classes"].includes(tab) ? tab : "subjects";
}
