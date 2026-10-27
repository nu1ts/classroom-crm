/**
 * Модуль: Матрица учебной нагрузки
 * CRUD строк нагрузки «учитель × предмет × класс» с валидацией: дубликаты, корректность часов, существование учителя и класса. Изменения влияют на разделы предметника и доступ к журналам.
 */

import { getDB, saveDB } from "./storage.js";
import {
  getKnownClassIds,
  getClassDirectory,
  getClassNameById,
} from "./directories.js";

/**
 * Плоский список строк нагрузки: учитель × предмет × класс, часов в неделю
 */
export function getWorkloadRows(db = getDB()) {
  const rows = [];
  (db.teachers || []).forEach((teacher) => {
    (teacher.workload || []).forEach((w) => {
      const subject = (db.subjects || []).find((s) => s.id === w.subjectId);
      const schoolClass = (db.classes || []).find((c) => c.id === w.classId);
      rows.push({
        id: w.id || `wl-${teacher.id}-${w.classId}-${w.subjectId}`,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        teacherShortName: teacher.shortName,
        subjectId: w.subjectId,
        subjectLabel: subject
          ? subject.shortName || subject.name
          : w.subjectLabel,
        classId: w.classId,
        className: schoolClass ? schoolClass.name : w.className,
        hours: w.hours || 0,
      });
    });
  });
  return rows;
}

function findWorkloadOwner(db, rowId) {
  for (const teacher of db.teachers || []) {
    const row = (teacher.workload || []).find(
      (w) => (w.id || `wl-${teacher.id}-${w.classId}-${w.subjectId}`) === rowId,
    );
    if (row) return { teacher, row };
  }
  return null;
}

function validateWorkloadValues(db, values, excludeRowId = null) {
  const teacher = (db.teachers || []).find((t) => t.id === values.teacherId);
  if (!teacher) {
    return { error: "Учитель не найден" };
  }
  const subject = (db.subjects || []).find((s) => s.id === values.subjectId);
  if (!subject) {
    return { error: "Предмет не найден в справочнике" };
  }
  const classId = values.classId;
  const classExists = getClassDirectory(db).some((c) => c.id === classId);
  if (!classExists) {
    return { error: "Класс не найден в справочнике" };
  }
  const hours = Number(values.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 40) {
    return { error: "Количество часов должно быть целым числом от 1 до 40" };
  }
  const duplicate = (db.teachers || []).some((t) =>
    (t.workload || []).some((w) => {
      const wId = w.id || `wl-${t.id}-${w.classId}-${w.subjectId}`;
      if (wId === excludeRowId) return false;
      return (
        t.id === values.teacherId &&
        w.subjectId === values.subjectId &&
        w.classId === classId
      );
    }),
  );
  if (duplicate) {
    return { error: "Такая нагрузка уже назначена" };
  }
  return { teacher, subject, classId, hours };
}

/**
 * Назначение нагрузки: строка матрицы учитель × предмет × класс
 */
export function addWorkloadRow(values = {}) {
  const db = getDB();
  const checked = validateWorkloadValues(db, values);
  if (checked.error) {
    return { success: false, error: checked.error };
  }

  const { teacher, subject, classId, hours } = checked;
  const id = `wl-${teacher.id}-${classId}-${subject.id}`;
  const row = {
    id,
    classId,
    className: getClassNameById(classId, db),
    subjectId: subject.id,
    subjectLabel: subject.shortName || subject.name,
    hours,
  };

  teacher.workload = teacher.workload || [];
  teacher.workload.push(row);

  if (!(teacher.subjectIds || []).includes(subject.id)) {
    teacher.subjectIds = [...(teacher.subjectIds || []), subject.id];
  }

  saveDB(db);
  return { success: true, row, message: "Нагрузка назначена" };
}

/**
 * Изменение строки нагрузки (предмет, класс, часы)
 */
export function updateWorkloadRow(rowId, values = {}) {
  const db = getDB();
  const owner = findWorkloadOwner(db, rowId);
  if (!owner) {
    return { success: false, error: "Строка нагрузки не найдена" };
  }

  const merged = {
    teacherId: values.teacherId || owner.teacher.id,
    subjectId: values.subjectId || owner.row.subjectId,
    classId: values.classId || owner.row.classId,
    hours: values.hours !== undefined ? values.hours : owner.row.hours,
  };

  const checked = validateWorkloadValues(db, merged, rowId);
  if (checked.error) {
    return { success: false, error: checked.error };
  }

  const { teacher, subject, classId, hours } = checked;
  if (teacher.id !== owner.teacher.id) {
    owner.teacher.workload = owner.teacher.workload.filter(
      (w) => w !== owner.row,
    );
    teacher.workload = teacher.workload || [];
    if (!(teacher.subjectIds || []).includes(subject.id)) {
      teacher.subjectIds = [...(teacher.subjectIds || []), subject.id];
    }
  } else if (!(teacher.subjectIds || []).includes(subject.id)) {
    teacher.subjectIds = [...(teacher.subjectIds || []), subject.id];
  }

  const updated = {
    id: `wl-${teacher.id}-${classId}-${subject.id}`,
    classId,
    className: getClassNameById(classId, db),
    subjectId: subject.id,
    subjectLabel: subject.shortName || subject.name,
    hours,
  };

  const list = teacher.workload || [];
  const index = list.indexOf(owner.row);
  if (index >= 0) {
    list[index] = updated;
  } else {
    list.push(updated);
  }
  teacher.workload = list;

  saveDB(db);
  return { success: true, row: updated, message: "Нагрузка обновлена" };
}

/**
 * Снятие нагрузки: строка удаляется, записи журнала и оценок сохраняются
 */
export function removeWorkloadRow(rowId) {
  const db = getDB();
  const owner = findWorkloadOwner(db, rowId);
  if (!owner) {
    return { success: false, error: "Строка нагрузки не найдена" };
  }
  owner.teacher.workload = owner.teacher.workload.filter(
    (w) => w !== owner.row,
  );
  saveDB(db);
  return { success: true, message: "Нагрузка снята" };
}
