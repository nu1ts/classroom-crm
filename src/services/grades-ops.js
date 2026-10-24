import { getDB, saveDB, getCurrentUser } from "./storage.js";

/**
 * Валидация значения оценки
 * Допустимы строго числа 2, 3, 4, 5
 * @param {any} val
 * @returns {number|null} число от 2 до 5 или null, если невалидно
 */
export function validateGradeValue(val) {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseInt(String(val).trim(), 10);
  if (!Number.isInteger(num)) return null;
  if (num >= 2 && num <= 5) return num;
  return null;
}

/**
 * Сохранение (выставление или изменение) одной оценки
 * @param {Object} params { lessonId, studentId, value, teacher }
 */
export function saveGradeRecord({ lessonId, studentId, value, teacher }) {
  if (!lessonId || !studentId) {
    return { success: false, error: "Не указан урок или ученик" };
  }

  const db = getDB();
  const lesson = (db.lessons || []).find((l) => l.id === lessonId);
  if (!lesson) {
    return { success: false, error: "Урок не найден" };
  }

  if (lesson.status === "closed") {
    return {
      success: false,
      error: "Урок закрыт. Изменение и удаление оценок недоступно.",
      isClosed: true,
    };
  }

  const att = (db.attendance || []).find(
    (a) => a.lessonId === lessonId && a.studentId === studentId,
  );
  if (att && att.value === "absent") {
    return {
      success: false,
      error: "Ученик отсутствовал",
      isAbsent: true,
    };
  }

  if (value === "" || value === null || value === undefined) {
    return deleteGradeRecord({ lessonId, studentId, teacher });
  }

  const validValue = validateGradeValue(value);
  if (validValue === null) {
    return {
      success: false,
      error: "Недопустимое значение оценки. Разрешены только 2, 3, 4, 5.",
    };
  }

  if (!db.grades) db.grades = [];

  const currentUser = getCurrentUser();
  const teacherName =
    teacher ||
    (currentUser && (currentUser.shortName || currentUser.personName)) ||
    lesson.teacher ||
    "Учитель";

  const existingGradeIndex = db.grades.findIndex(
    (g) => g.lessonId === lessonId && g.studentId === studentId,
  );

  const timestamp = new Date().toISOString();

  if (existingGradeIndex >= 0) {
    db.grades[existingGradeIndex].value = validValue;
    db.grades[existingGradeIndex].teacher = teacherName;
    db.grades[existingGradeIndex].updatedAt = timestamp;
  } else {
    const newGrade = {
      id: `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      lessonId,
      studentId,
      subjectId: lesson.subjectId,
      date: lesson.date,
      teacher: teacherName,
      value: validValue,
      periodId: lesson.periodId || "q1_2024",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.grades.push(newGrade);
  }

  saveDB(db);
  return { success: true };
}

/**
 * Удаление оценки (TC-TCH-05)
 * @param {Object} params { lessonId, studentId, teacher }
 */
export function deleteGradeRecord({ lessonId, studentId, teacher }) {
  if (!lessonId || !studentId) {
    return { success: false, error: "Не указан урок или ученик" };
  }

  const db = getDB();
  const lesson = (db.lessons || []).find((l) => l.id === lessonId);
  if (lesson && lesson.status === "closed") {
    return {
      success: false,
      error: "Урок закрыт. Удаление оценки недоступно.",
      isClosed: true,
    };
  }

  if (!db.grades) return { success: true };

  const initialCount = db.grades.length;
  db.grades = db.grades.filter(
    (g) => !(g.lessonId === lessonId && g.studentId === studentId),
  );

  if (db.grades.length !== initialCount) {
    saveDB(db);
  }

  return { success: true };
}

/**
 * Управление отметкой отсутствия на уроке (TC-TCH-07, 08, 10)
 * @param {Object} params { lessonId, studentId, isAbsent }
 */
export function setLessonAttendance({ lessonId, studentId, isAbsent }) {
  if (!lessonId || !studentId) {
    return { success: false, error: "Не указан урок или ученик" };
  }

  const db = getDB();
  const lesson = (db.lessons || []).find((l) => l.id === lessonId);
  if (!lesson) {
    return { success: false, error: "Урок не найден" };
  }

  if (!db.attendance) db.attendance = [];

  const existing = db.attendance.find(
    (a) => a.lessonId === lessonId && a.studentId === studentId,
  );

  if (
    existing &&
    existing.value === "absent" &&
    (existing.status === "confirmed" || existing.status === "excused" || existing.code === "УП" || existing.code === "Б")
  ) {
    return {
      success: false,
      error: "Причина подтверждена классным руководителем. Изменение отметки заблокировано.",
      isLockedByHomeroom: true,
    };
  }

  if (isAbsent) {
    if (db.grades) {
      db.grades = db.grades.filter(
        (g) => !(g.lessonId === lessonId && g.studentId === studentId),
      );
    }

    if (existing) {
      existing.value = "absent";
      existing.status = "unconfirmed";
      existing.code = "Н";
      existing.reason = null;
    } else {
      db.attendance.push({
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        lessonId,
        studentId,
        date: lesson.date,
        value: "absent",
        status: "unconfirmed",
        code: "Н",
        reason: null,
      });
    }
  } else {
    if (existing) {
      existing.value = "present";
      existing.status = "present";
      existing.code = "Был";
      existing.reason = null;
    }
  }

  if (db.meta) {
    const q1LessonIds = new Set(
      (db.lessons || [])
        .filter((l) => l.periodId === "q1_2024")
        .map((l) => l.id),
    );
    db.meta.unconfirmedAbsencesCount = db.attendance.filter(
      (a) =>
        a.status === "unconfirmed" &&
        a.value === "absent" &&
        q1LessonIds.has(a.lessonId),
    ).length;
  }

  saveDB(db);
  return { success: true };
}

/**
 * Пакетное сохранение журнала урока (TC-TCH-01, 02, 04, 05, 10)
 * Без дубликатов и без потерь.
 * @param {Object} params { lessonId, entries: [{ studentId, grade, isAbsent }] }
 */
export function batchSaveLessonJournal({ lessonId, entries }) {
  if (!lessonId || !Array.isArray(entries)) {
    return { success: false, error: "Некорректные параметры" };
  }

  const errors = [];
  entries.forEach((item) => {
    if (item.isAbsent !== undefined) {
      const attRes = setLessonAttendance({
        lessonId,
        studentId: item.studentId,
        isAbsent: Boolean(item.isAbsent),
      });
      if (!attRes.success && attRes.error) {
        errors.push(`${item.studentId}: ${attRes.error}`);
      }
    }

    if (!item.isAbsent) {
      const gradeRes = saveGradeRecord({
        lessonId,
        studentId: item.studentId,
        value: item.grade,
      });
      if (!gradeRes.success && gradeRes.error) {
        errors.push(`${item.studentId}: ${gradeRes.error}`);
      }
    }
  });

  return { success: errors.length === 0, errors };
}
