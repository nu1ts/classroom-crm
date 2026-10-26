/**
 * Модуль: Родители, контакты и заметки
 * База родителей: добавление, изменение, удаление (запрещено при наличии связей), связывание с учеником и снятие связи с управлением основными контактами. Фиксация контактов с родителями и заметки классрука об ученике.
 */

import { getDB, saveDB } from "./storage.js";

/**
 * Фиксация контакта с родителем
 * @param {Object} data { studentId?, parentId, author, date, time, channel, summary, agreementReached, nextContactDate }
 */
export function addParentContact(data = {}) {
  const summary = (data.summary || "").trim();
  const channel = (data.channel || "").trim();
  const studentId = (data.studentId || "").trim() || null;
  const parentId = (data.parentId || "").trim();

  if (!summary) {
    return { success: false, error: "Поле «Итог» обязательно для заполнения" };
  }
  if (!channel) {
    return { success: false, error: "Выберите канал связи" };
  }
  if (!parentId) {
    return { success: false, error: "Родитель не указан" };
  }

  const db = getDB();
  if (!db.parentContacts) db.parentContacts = [];

  if (
    studentId &&
    !(db.parentStudentRelations || []).some(
      (relation) =>
        relation.parentId === parentId && relation.studentId === studentId,
    )
  ) {
    return {
      success: false,
      error: "Родитель не связан с указанным учеником",
    };
  }

  const channelLabels = {
    phone: "Звонок",
    chat: "Мессенджер",
    personal: "Личная беседа",
    meeting: "Личная беседа",
    letter: "Письмо",
  };

  const agreementReached = data.agreementReached !== false;
  const nextContactDate =
    !agreementReached && data.nextContactDate ? data.nextContactDate : null;

  const newContact = {
    id: `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    parentId,
    author: data.author || "Смирнова М. В.",
    date: data.date || new Date().toISOString().slice(0, 10),
    time:
      data.time ||
      new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    channel,
    channelLabel: channelLabels[channel] || data.channelLabel || "Звонок",
    summary,
    agreementReached,
    nextContactDate,
  };

  db.parentContacts.unshift(newContact);
  saveDB(db);

  return { success: true, contact: newContact };
}

/**
 * Добавление педагогической заметки классного руководителя
 * @param {Object} data { studentId, author, text, isPrivate, date }
 */
export function addStudentNote(data = {}) {
  const text = (data.text || "").trim();
  const studentId = (data.studentId || "").trim();

  if (!text) {
    return {
      success: false,
      error: "Поле «Текст заметки» обязательно для заполнения",
    };
  }
  if (!studentId) {
    return { success: false, error: "Ученик не указан" };
  }

  const db = getDB();
  if (!db.notes) db.notes = [];

  const newNote = {
    id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    author: data.author || "Смирнова М. В.",
    date:
      data.date ||
      `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`,
    text,
    isPrivate: data.isPrivate !== false,
  };

  db.notes.unshift(newNote);
  saveDB(db);

  return { success: true, note: newNote };
}

/**
 * Добавление нового родителя
 */
export function addParent(data = {}) {
  const fullName = (data.fullName || "").trim();
  const phone = (data.phone || "").trim();
  const studentId = data.studentId || null;
  const relationRole = data.relationRole || "Родитель";
  const isPrimary = Boolean(data.isPrimary);

  if (!fullName) {
    return { success: false, error: "Укажите ФИО родителя" };
  }
  if (!phone) {
    return { success: false, error: "Укажите телефон" };
  }

  const db = getDB();
  if (!db.parents) db.parents = [];
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  const parts = fullName.split(/\s+/);
  const lastName = parts[0] || "Родитель";
  const firstName = parts[1] || "";
  const middleName = parts.slice(2).join(" ") || "";
  const shortName = firstName ? `${lastName} ${firstName[0]}.` : lastName;

  const parentId = `pr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newParent = {
    id: parentId,
    lastName,
    firstName,
    middleName,
    fullName,
    shortName,
    phone,
    otherChildren: [],
  };

  db.parents.push(newParent);

  if (studentId) {
    if (isPrimary) {
      db.parentStudentRelations.forEach((r) => {
        if (r.studentId === studentId) {
          r.isPrimary = false;
        }
      });
    }

    db.parentStudentRelations.push({
      id: `rel-${parentId}-${studentId}`,
      parentId,
      studentId,
      relationRole,
      isPrimary,
    });
  }

  saveDB(db);
  return { success: true, parent: newParent };
}

/**
 * Обновление данных родителя
 */
export function updateParent(parentId, data = {}) {
  if (!parentId) return { success: false, error: "ID родителя не указан" };

  const db = getDB();
  const parent = (db.parents || []).find((p) => p.id === parentId);
  if (!parent) return { success: false, error: "Родитель не найден" };

  if (data.fullName) {
    const fullName = data.fullName.trim();
    const parts = fullName.split(/\s+/);
    parent.lastName = parts[0] || parent.lastName;
    parent.firstName = parts[1] || parent.firstName;
    parent.middleName = parts.slice(2).join(" ") || parent.middleName;
    parent.fullName = fullName;
    parent.shortName = parent.firstName
      ? `${parent.lastName} ${parent.firstName[0]}.`
      : parent.lastName;
  }

  if (data.phone !== undefined) {
    parent.phone = data.phone.trim();
  }

  if (data.relationRole || data.isPrimary !== undefined) {
    const rels = (db.parentStudentRelations || []).filter(
      (r) => r.parentId === parentId,
    );
    rels.forEach((rel) => {
      if (data.relationRole) rel.relationRole = data.relationRole;
      if (data.isPrimary !== undefined) {
        if (data.isPrimary) {
          (db.parentStudentRelations || []).forEach((otherRel) => {
            if (
              otherRel.studentId === rel.studentId &&
              otherRel.parentId !== parentId
            ) {
              otherRel.isPrimary = false;
            }
          });
        }
        rel.isPrimary = Boolean(data.isPrimary);
      }
    });
  }

  saveDB(db);
  return { success: true, parent };
}

/**
 * Удаление родителя
 */
export function deleteParent(parentId) {
  if (!parentId) return { success: false, error: "ID родителя не указан" };

  const db = getDB();
  const rels = (db.parentStudentRelations || []).filter(
    (r) => r.parentId === parentId,
  );
  if (rels.length > 0) {
    return {
      success: false,
      error: "Сначала снимите связь с учеником в карточке или сводке",
    };
  }

  db.parents = (db.parents || []).filter((p) => p.id !== parentId);
  saveDB(db);

  return { success: true };
}

/**
 * Связывание родителя с учеником
 */
export function linkParentToStudent(parentId, studentId, options = {}) {
  if (!parentId || !studentId) {
    return { success: false, error: "Не указан родитель или ученик" };
  }

  const db = getDB();
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  const isPrimary = Boolean(options.isPrimary);
  const relationRole = options.relationRole || "Родитель";

  if (isPrimary) {
    db.parentStudentRelations.forEach((r) => {
      if (r.studentId === studentId) {
        r.isPrimary = false;
      }
    });
  }

  const existing = db.parentStudentRelations.find(
    (r) => r.parentId === parentId && r.studentId === studentId,
  );
  if (existing) {
    existing.relationRole = relationRole;
    existing.isPrimary = isPrimary;
  } else {
    db.parentStudentRelations.push({
      id: `rel-${parentId}-${studentId}`,
      parentId,
      studentId,
      relationRole,
      isPrimary,
    });
  }

  saveDB(db);
  return { success: true };
}

/**
 * Снятие связи родителя с учеником
 */
export function unlinkParentFromStudent(parentId, studentId) {
  if (!parentId) return { success: false, error: "ID родителя не указан" };

  const db = getDB();
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  if (studentId) {
    db.parentStudentRelations = db.parentStudentRelations.filter(
      (r) => !(r.parentId === parentId && r.studentId === studentId),
    );
  } else {
    db.parentStudentRelations = db.parentStudentRelations.filter(
      (r) => r.parentId !== parentId,
    );
  }

  saveDB(db);
  return { success: true };
}
