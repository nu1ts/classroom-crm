/**
 * Модуль: Справочники классов и предметов
 * Служебные выборки справочных данных: классы с известной нагрузкой, директория классов, отображение id класса и предмета в человекочитаемые названия.
 */

import { getDB } from "./storage.js";

/**
 * Классы, для которых в системе есть нагрузка (для назначения классного руководителя)
 */
export function getKnownClassIds(db = getDB()) {
  const ids = new Set();
  (db.teachers || []).forEach((t) => {
    if (t.homeroomClassId) ids.add(t.homeroomClassId);
    (t.workload || []).forEach((w) => {
      if (w.classId) ids.add(w.classId);
    });
  });
  if (db.meta && db.meta.classId) ids.add(db.meta.classId);
  return [...ids];
}

/**
 * Справочник классов школы (для матрицы нагрузки)
 */
export function getClassDirectory(db = getDB()) {
  const list = Array.isArray(db.classes)
    ? db.classes.map((c) => ({ id: c.id, name: c.name }))
    : [];
  if (list.length) return list;
  const names = new Map();
  (db.teachers || []).forEach((t) => {
    (t.workload || []).forEach((w) => {
      if (w.classId) names.set(w.classId, w.className);
    });
  });
  if (db.meta && db.meta.classId) names.set(db.meta.classId, db.meta.className);
  return [...names].map(([id, name]) => ({ id, name }));
}

/**
 * Полное название класса по ID (например, «7Б»).
 * @param {string} classId ID класса
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {string} Название класса или пустая строка
 */
export function getClassNameById(classId, db) {
  const dir = getClassDirectory(db);
  const found = dir.find((c) => c.id === classId);
  return found
    ? found.name
    : db.meta && db.meta.classId === classId
      ? db.meta.className
      : classId;
}

/**
 * Короткое имя предмета по ID (например, «Математика»).
 * @param {string} subjectId ID предмета
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {string} Короткое имя предмета или пустая строка
 */
export function getSubjectShortName(subjectId, db) {
  const subject = (db.subjects || []).find((s) => s.id === subjectId);
  return subject ? subject.shortName || subject.name : subjectId;
}
