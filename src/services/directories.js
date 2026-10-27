/**
 * Модуль: Справочники классов и предметов
 * Служебные выборки справочных данных: классы с известной нагрузкой, директория классов, отображение id класса и предмета в человекочитаемые названия.
 * Администрирование справочников: добавление и переименование предметов, аудиторий и классов; деактивация и возврат записей; проверки использования записей в занятиях, нагрузке и карточках учителей.
 */

import { getDB, saveDB } from "./storage.js";

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

/**
 * Справочник предметов (с признаком активности).
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {Array} Список предметов
 */
export function getSubjectDirectory(db = getDB()) {
  return (db.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.shortName || s.name,
    room: s.room || "",
    isActive: s.isActive !== false,
  }));
}

/**
 * Справочник аудиторий школы.
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {Array} Список аудиторий { id, name, isActive }
 */
export function getRoomDirectory(db = getDB()) {
  return (db.rooms || []).map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive !== false,
  }));
}

/**
 * Проверка использования предмета: занятия, строки нагрузки и карточки учителей.
 * @param {string} subjectId ID предмета
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {boolean} true, если предмет используется в данных
 */
export function isSubjectInUse(subjectId, db = getDB()) {
  const inLessons = (db.lessons || []).some((l) => l.subjectId === subjectId);
  const inWorkload = (db.teachers || []).some((t) =>
    (t.workload || []).some((w) => w.subjectId === subjectId),
  );
  const inCards = (db.teachers || []).some((t) =>
    (t.subjectIds || []).includes(subjectId),
  );
  return inLessons || inWorkload || inCards;
}

/**
 * Проверка использования класса: ученики, занятия и нагрузка.
 * @param {string} classId ID класса
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {boolean} true, если класс используется в данных
 */
export function isClassInUse(classId, db = getDB()) {
  const inStudents = (db.students || []).some((s) => s.classId === classId);
  const inLessons = (db.lessons || []).some((l) => l.classId === classId);
  const inWorkload = (db.teachers || []).some((t) =>
    (t.workload || []).some((w) => w.classId === classId),
  );
  return inStudents || inLessons || inWorkload;
}

/**
 * Проверка использования аудитории в занятиях.
 * @param {string} roomName Название аудитории
 * @param {Object} [db] База данных (по умолчанию текущая)
 * @returns {boolean} true, если аудитория фигурирует в занятиях
 */
export function isRoomInUse(roomName, db = getDB()) {
  return (db.lessons || []).some((l) => l.room === roomName);
}

/**
 * Генерация нового ID записи справочника.
 * @param {string} prefix Префикс (например, «subj»)
 * @param {Array} items Существующие записи справочника
 * @returns {string} Новый уникальный ID
 */
function nextDirectoryId(prefix, items) {
  const used = new Set((items || []).map((i) => i.id));
  let index = 1;
  while (used.has(`${prefix}-new-${index}`)) index += 1;
  return `${prefix}-new-${index}`;
}

/**
 * Добавление предмета в справочник.
 * @param {Object} data { name, shortName }
 * @returns {Object} { success, error?, subject? }
 */
export function addSubject(data = {}) {
  const name = (data.name || "").trim();
  const shortName = (data.shortName || "").trim() || name;
  if (!name) return { success: false, error: "Укажите название предмета" };

  const db = getDB();
  db.subjects = db.subjects || [];
  const duplicate = db.subjects.some(
    (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Предмет с таким названием уже есть" };

  const subject = {
    id: nextDirectoryId("subj", db.subjects),
    name,
    shortName,
    teacher: "",
    room: "",
    targetAvg: null,
    isActive: true,
  };
  db.subjects.push(subject);
  saveDB(db);
  return { success: true, subject };
}

/**
 * Переименование предмета в справочнике.
 * @param {string} subjectId ID предмета
 * @param {Object} data { name, shortName }
 * @returns {Object} { success, error?, subject? }
 */
export function updateSubject(subjectId, data = {}) {
  const name = (data.name || "").trim();
  const shortName = (data.shortName || "").trim() || name;
  if (!name) return { success: false, error: "Укажите название предмета" };

  const db = getDB();
  const subject = (db.subjects || []).find((s) => s.id === subjectId);
  if (!subject) return { success: false, error: "Предмет не найден" };

  const duplicate = (db.subjects || []).some(
    (s) =>
      s.id !== subjectId && s.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Предмет с таким названием уже есть" };

  subject.name = name;
  subject.shortName = shortName;
  saveDB(db);
  return { success: true, subject };
}

/**
 * Деактивация или возврат предмета. Деактивация не удаляет занятия,
 * оценки и строки нагрузки — исторические данные сохраняются.
 * @param {string} subjectId ID предмета
 * @param {boolean} isActive Новое состояние активности
 * @returns {Object} { success, error?, subject? }
 */
export function setSubjectActive(subjectId, isActive) {
  const db = getDB();
  const subject = (db.subjects || []).find((s) => s.id === subjectId);
  if (!subject) return { success: false, error: "Предмет не найден" };
  subject.isActive = Boolean(isActive);
  saveDB(db);
  return { success: true, subject };
}

/**
 * Добавление аудитории в справочник.
 * @param {Object} data { name }
 * @returns {Object} { success, error?, room? }
 */
export function addRoom(data = {}) {
  const name = (data.name || "").trim();
  if (!name) return { success: false, error: "Укажите название аудитории" };

  const db = getDB();
  db.rooms = db.rooms || [];
  const duplicate = db.rooms.some(
    (r) => r.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Аудитория с таким названием уже есть" };

  const room = {
    id: nextDirectoryId("room", db.rooms),
    name,
    isActive: true,
  };
  db.rooms.push(room);
  saveDB(db);
  return { success: true, room };
}

/**
 * Переименование аудитории в справочнике.
 * @param {string} roomId ID аудитории
 * @param {Object} data { name }
 * @returns {Object} { success, error?, room? }
 */
export function updateRoom(roomId, data = {}) {
  const name = (data.name || "").trim();
  if (!name) return { success: false, error: "Укажите название аудитории" };

  const db = getDB();
  const room = (db.rooms || []).find((r) => r.id === roomId);
  if (!room) return { success: false, error: "Аудитория не найдена" };

  const duplicate = (db.rooms || []).some(
    (r) =>
      r.id !== roomId && r.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Аудитория с таким названием уже есть" };

  room.name = name;
  saveDB(db);
  return { success: true, room };
}

/**
 * Деактивация или возврат аудитории. Занятия, ссылающиеся на аудиторию
 * по названию, не изменяются.
 * @param {string} roomId ID аудитории
 * @param {boolean} isActive Новое состояние активности
 * @returns {Object} { success, error?, room? }
 */
export function setRoomActive(roomId, isActive) {
  const db = getDB();
  const room = (db.rooms || []).find((r) => r.id === roomId);
  if (!room) return { success: false, error: "Аудитория не найдена" };
  room.isActive = Boolean(isActive);
  saveDB(db);
  return { success: true, room };
}

/**
 * Добавление класса в справочник.
 * @param {Object} data { name }
 * @returns {Object} { success, error?, schoolClass? }
 */
export function addSchoolClass(data = {}) {
  const name = (data.name || "").trim();
  if (!name) return { success: false, error: "Укажите название класса" };

  const db = getDB();
  db.classes = db.classes || [];
  const duplicate = db.classes.some(
    (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Класс с таким названием уже есть" };

  const schoolClass = {
    id: nextDirectoryId("class", db.classes),
    name,
    isActive: true,
  };
  db.classes.push(schoolClass);
  saveDB(db);
  return { success: true, schoolClass };
}

/**
 * Переименование класса в справочнике.
 * @param {string} classId ID класса
 * @param {Object} data { name }
 * @returns {Object} { success, error?, schoolClass? }
 */
export function updateSchoolClass(classId, data = {}) {
  const name = (data.name || "").trim();
  if (!name) return { success: false, error: "Укажите название класса" };

  const db = getDB();
  const schoolClass = (db.classes || []).find((c) => c.id === classId);
  if (!schoolClass) return { success: false, error: "Класс не найден" };

  const duplicate = (db.classes || []).some(
    (c) =>
      c.id !== classId && c.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate)
    return { success: false, error: "Класс с таким названием уже есть" };

  schoolClass.name = name;
  saveDB(db);
  return { success: true, schoolClass };
}

/**
 * Деактивация или возврат класса. Ученики, занятия, оценки и нагрузка
 * класса сохраняются без изменений.
 * @param {string} classId ID класса
 * @param {boolean} isActive Новое состояние активности
 * @returns {Object} { success, error?, schoolClass? }
 */
export function setClassActive(classId, isActive) {
  const db = getDB();
  const schoolClass = (db.classes || []).find((c) => c.id === classId);
  if (!schoolClass) return { success: false, error: "Класс не найден" };
  schoolClass.isActive = Boolean(isActive);
  saveDB(db);
  return { success: true, schoolClass };
}
