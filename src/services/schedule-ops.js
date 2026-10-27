import { getDB, saveDB, getCurrentUser } from "./storage.js";
import { TIME_SLOTS } from "../views/schedule/helpers.js";

/**
 * Нормализация времени слота для сравнения
 * Поддерживает форматы "11:30", "11:30 - 12:15", "11:30-12:15"
 * @param {string} timeStr
 * @returns {string} например "11:30"
 */
export function normalizeLessonTime(timeStr) {
  if (!timeStr) return "";
  const match = String(timeStr).trim().match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : String(timeStr).trim();
}

/**
 * Определение номера урока и полного диапазона времени по времени
 * @param {string} timeStr
 * @returns {{ lessonNumber: number, fullTime: string }}
 */
export function resolveLessonSlot(timeStr) {
  const norm = normalizeLessonTime(timeStr);
  const found = TIME_SLOTS.find((s) => normalizeLessonTime(s.time) === norm);
  if (found) {
    return { lessonNumber: found.number, fullTime: found.time };
  }
  return { lessonNumber: 1, fullTime: timeStr || "08:30 - 09:15" };
}

/**
 * Проверка занятости аудитории на указанную дату и время
 * TC-SCH-08: Проверка конфликта кабинетов среди всех классов
 * @param {Object} params
 * @param {string} params.date ISO-дата 'YYYY-MM-DD'
 * @param {string} params.time Время или диапазон урока
 * @param {string} params.room Номер аудитории
 * @param {string} [params.excludeLessonId] ID урока, исключаемого из проверки (при редактировании)
 * @returns {{ hasConflict: boolean, conflictingLesson?: object, error?: string }}
 */
export function checkRoomConflict({
  date,
  time,
  room,
  classId = null,
  teacher = null,
  excludeLessonId = null,
}) {
  if (!date || !time) {
    return { hasConflict: false };
  }

  const db = getDB();
  const normRoom = room ? String(room).trim().toLowerCase() : "";
  const normTime = normalizeLessonTime(time);
  const targetClassId = classId || "class-7b";
  const normTeacher = teacher ? String(teacher).trim().toLowerCase() : "";

  function getClassLabel(rawClassId) {
    const cid = rawClassId || "class-7b";
    const foundClass = (db.classes || []).find(
      (c) => c.id === cid || c.name === cid
    );
    return (
      (foundClass && foundClass.name) ||
      (cid === "class-7b"
        ? "7Б"
        : cid === "class-8a"
        ? "8А"
        : cid === "class-9v"
        ? "9В"
        : cid === "class-6v"
        ? "6В"
        : cid === "class-7v"
        ? "7В"
        : cid.replace(/^class-/, "").toUpperCase())
    );
  }

  if (normRoom) {
    const roomConflict = (db.lessons || []).find((l) => {
      if (excludeLessonId && l.id === excludeLessonId) return false;
      if (l.date !== date) return false;
      if (normalizeLessonTime(l.time) !== normTime) return false;
      const lessonRoom = String(l.room || "").trim().toLowerCase();
      return lessonRoom === normRoom;
    });

    if (roomConflict) {
      const classLabel = getClassLabel(roomConflict.classId);
      return {
        hasConflict: true,
        conflictingLesson: roomConflict,
        error: `Аудитория ${room} уже занята в это время (${roomConflict.subjectName || "занятие"}, класс ${classLabel})`,
      };
    }
  }

  if (targetClassId) {
    const classConflict = (db.lessons || []).find((l) => {
      if (excludeLessonId && l.id === excludeLessonId) return false;
      if (l.date !== date) return false;
      if (normalizeLessonTime(l.time) !== normTime) return false;
      const lClassId = l.classId || "class-7b";
      return lClassId === targetClassId;
    });

    if (classConflict) {
      const classLabel = getClassLabel(targetClassId);
      return {
        hasConflict: true,
        conflictingLesson: classConflict,
        error: `У класса ${classLabel} в это время уже запланирован урок: ${classConflict.subjectName || "занятие"} (${classConflict.room || ""})`,
      };
    }
  }

  if (normTeacher) {
    const teacherConflict = (db.lessons || []).find((l) => {
      if (excludeLessonId && l.id === excludeLessonId) return false;
      if (l.date !== date) return false;
      if (normalizeLessonTime(l.time) !== normTime) return false;
      const lTeacher = String(l.teacher || "").trim().toLowerCase();
      if (!lTeacher) return false;
      return (
        lTeacher === normTeacher ||
        normTeacher.includes(lTeacher) ||
        lTeacher.includes(normTeacher)
      );
    });

    if (teacherConflict) {
      const classLabel = getClassLabel(teacherConflict.classId);
      return {
        hasConflict: true,
        conflictingLesson: teacherConflict,
        error: `Преподаватель ${teacher} уже ведёт урок в это время (класс ${classLabel}, ${teacherConflict.subjectName || "занятие"})`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Добавление нового занятия в расписание
 * @param {Object} lessonData
 * @returns {{ success: boolean, lesson?: object, error?: string }}
 */
export function addLesson(lessonData) {
  if (!lessonData || !lessonData.subjectName || !lessonData.date || !lessonData.time || !lessonData.room) {
    return {
      success: false,
      error: "Заполните все обязательные поля: предмет, дату, время и аудиторию",
    };
  }

  // Проверка конфликта аудитории
  const conflict = checkRoomConflict({
    date: lessonData.date,
    time: lessonData.time,
    room: lessonData.room,
    classId: lessonData.classId || "class-7b",
    teacher: lessonData.teacher || null,
  });

  if (conflict.hasConflict) {
    return {
      success: false,
      error: conflict.error,
      hasConflict: true,
      conflictingLesson: conflict.conflictingLesson,
    };
  }

  const db = getDB();
  const slot = resolveLessonSlot(lessonData.time);

  const newLesson = {
    id: lessonData.id || `lsn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lessonNumber: lessonData.lessonNumber || slot.lessonNumber,
    date: lessonData.date,
    time: slot.fullTime,
    weekIndex: lessonData.weekIndex || 8,
    dayOfWeek: lessonData.dayOfWeek !== undefined ? lessonData.dayOfWeek : new Date(lessonData.date).getDay() - 1,
    subjectId: lessonData.subjectId || "custom",
    subjectName: lessonData.subjectName.trim(),
    teacher: (lessonData.teacher || "Смирнова М. В.").trim(),
    room: lessonData.room.trim(),
    classId: lessonData.classId || "class-7b",
    status: lessonData.status || "planned",
    isMarked: Boolean(lessonData.isMarked),
    periodId: lessonData.periodId || "q1_2024",
  };

  if (!Array.isArray(db.lessons)) {
    db.lessons = [];
  }

  db.lessons.push(newLesson);
  saveDB(db);

  return { success: true, lesson: newLesson };
}

/**
 * Перенос/обновление занятия
 * TC-SCH-09: изменение времени и аудитории с сохранением записей журнала
 * @param {string} lessonId
 * @param {Object} updates
 * @returns {{ success: boolean, lesson?: object, error?: string }}
 */
export function updateLesson(lessonId, updates = {}) {
  if (!lessonId) {
    return { success: false, error: "Не указан идентификатор занятия" };
  }

  const db = getDB();
  const lesson = (db.lessons || []).find((l) => l.id === lessonId);
  if (!lesson) {
    return { success: false, error: "Занятие не найдено в расписании" };
  }

  const targetDate = updates.date || lesson.date;
  const targetTime = updates.time || lesson.time;
  const targetRoom = updates.room || lesson.room;
  const targetClassId = updates.classId || lesson.classId;
  const targetTeacher = updates.teacher || lesson.teacher;

  const conflict = checkRoomConflict({
    date: targetDate,
    time: targetTime,
    room: targetRoom,
    classId: targetClassId,
    teacher: targetTeacher,
    excludeLessonId: lessonId,
  });

  if (conflict.hasConflict) {
    return {
      success: false,
      error: conflict.error,
      hasConflict: true,
      conflictingLesson: conflict.conflictingLesson,
    };
  }

  const slot = resolveLessonSlot(targetTime);

  Object.assign(lesson, updates, {
    date: targetDate,
    time: slot.fullTime,
    lessonNumber: slot.lessonNumber,
    room: targetRoom.trim(),
  });

  if (updates.subjectName) lesson.subjectName = updates.subjectName.trim();
  if (updates.teacher) lesson.teacher = updates.teacher.trim();
  if (updates.classId) lesson.classId = updates.classId;

  saveDB(db);

  return { success: true, lesson };
}

/**
 * Отмена (удаление) занятия из расписания
 * TC-SCH-10: занятие исчезает из расписания, но записи в журнале (оценки и посещаемость) сохраняются
 * @param {string} lessonId
 * @returns {{ success: boolean, error?: string, warning?: string }}
 */
export function cancelLesson(lessonId) {
  if (!lessonId) {
    return { success: false, error: "Не указан идентификатор занятия" };
  }

  const db = getDB();
  const initialCount = (db.lessons || []).length;
  db.lessons = (db.lessons || []).filter((l) => l.id !== lessonId);

  if (db.lessons.length === initialCount) {
    return { success: false, error: "Занятие не найдено для отмены" };
  }

  saveDB(db);

  return {
    success: true,
    warning: "Занятие отменено. Записи журнала (оценки и посещаемость) сохранены.",
  };
}
