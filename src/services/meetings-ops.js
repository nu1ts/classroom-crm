import { getDB, saveDB } from "./storage.js";

/** Демо-дата «сегодня» стенда по ТЗ (П3): 28 октября 2024 г. */
export const DEMO_TODAY = "2024-10-28";

/** Допустимые статусы явки на родительское собрание (TC-MG-07) */
export const ATTENDANCE_STATUSES = {
  PRESENT: "present",
  ABSENT: "absent",
  EXCUSED: "excused",
};

export const ATTENDANCE_LABELS = {
  present: "Пришёл",
  absent: "Не пришёл",
  excused: "Уважительная причина",
};

/**
 * Получить список собраний для указанного класса
 * @param {string} [classId="class-7b"]
 * @returns {{
 *   nextMeeting: object|null,
 *   otherUpcoming: object[],
 *   pastMeetings: object[],
 *   allMeetings: object[]
 * }}
 */
export function getMeetings(classId = "class-7b") {
  const db = getDB();
  const meetings = (db.meetings || []).filter(
    (m) => (!m.classId || m.classId === classId) && m.status !== "cancelled"
  );

  const sorted = [...meetings].sort((a, b) => {
    const da = `${a.date || ""} ${a.time || ""}`;
    const dbTime = `${b.date || ""} ${b.time || ""}`;
    return da.localeCompare(dbTime);
  });

  const upcoming = [];
  const past = [];

  for (const m of sorted) {
    if (m.status === "completed" || m.date < DEMO_TODAY) {
      past.push(m);
    } else {
      upcoming.push(m);
    }
  }

  past.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  const nextMeeting = upcoming.length > 0 ? upcoming[0] : null;
  const otherUpcoming = upcoming.slice(1);

  return {
    nextMeeting,
    otherUpcoming,
    pastMeetings: past,
    allMeetings: sorted,
  };
}

/**
 * Получить данные одного собрания
 * @param {string} meetingId
 * @returns {object|null}
 */
export function getMeetingById(meetingId) {
  const db = getDB();
  return (db.meetings || []).find((m) => m.id === meetingId) || null;
}

/**
 * Валидация полей собрания (TC-MG-03)
 * Обязательны: тема, дата, время. Повестка необязательна.
 * @param {object} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateMeetingData(data) {
  const errors = {};
  if (!data.title || !String(data.title).trim()) {
    errors.title = "Тема собрания обязательна для заполнения";
  }
  if (!data.date || !String(data.date).trim()) {
    errors.date = "Дата проведения обязательна для заполнения";
  }
  if (!data.time || !String(data.time).trim()) {
    errors.time = "Время проведения обязательно для заполнения";
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Создать новое собрание (TC-MG-02, TC-MG-03)
 * @param {object} data
 * @returns {{ success: boolean, meeting?: object, errors?: Record<string, string> }}
 */
export function createMeeting(data) {
  const validation = validateMeetingData(data);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const db = getDB();
  db.meetings = db.meetings || [];

  const agendaItems = Array.isArray(data.agendaItems)
    ? data.agendaItems.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const agendaString = agendaItems.length > 0
    ? agendaItems.map((item, idx) => `${idx + 1}) ${item}`).join(" ")
    : (data.agenda || "");

  const newMeeting = {
    id: `mtg-${Date.now()}`,
    title: String(data.title).trim(),
    date: String(data.date).trim(),
    time: String(data.time).trim(),
    room: String(data.room || "Каб. 302").trim(),
    status: "scheduled",
    agenda: agendaString,
    agendaItems,
    classId: data.classId || "class-7b",
    createdAt: new Date().toISOString(),
  };

  db.meetings.push(newMeeting);
  saveDB(db);

  return { success: true, meeting: newMeeting };
}

/**
 * Изменить / перенести собрание (TC-MG-04, TC-MG-05)
 * @param {string} meetingId
 * @param {object} data
 * @returns {{ success: boolean, meeting?: object, errors?: Record<string, string> }}
 */
export function updateMeeting(meetingId, data) {
  const validation = validateMeetingData(data);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const db = getDB();
  db.meetings = db.meetings || [];
  const index = db.meetings.findIndex((m) => m.id === meetingId);
  if (index === -1) {
    return { success: false, errors: { general: "Собрание не найдено" } };
  }

  const existing = db.meetings[index];

  let agendaItems = existing.agendaItems || [];
  if (Array.isArray(data.agendaItems)) {
    agendaItems = data.agendaItems.map((item) => String(item).trim()).filter(Boolean);
  }

  let agendaString = existing.agenda || "";
  if (agendaItems.length > 0) {
    agendaString = agendaItems.map((item, idx) => `${idx + 1}) ${item}`).join(" ");
  } else if (data.agenda !== undefined) {
    agendaString = String(data.agenda).trim();
  }

  const updated = {
    ...existing,
    title: String(data.title).trim(),
    date: String(data.date).trim(),
    time: String(data.time).trim(),
    room: String(data.room || existing.room || "Каб. 302").trim(),
    agenda: agendaString,
    agendaItems,
    updatedAt: new Date().toISOString(),
  };

  db.meetings[index] = updated;
  saveDB(db);

  return { success: true, meeting: updated };
}

/**
 * Отменить собрание (TC-MG-06)
 * Переводит в статус cancelled, не затрагивая объявления
 * @param {string} meetingId
 * @returns {{ success: boolean, error?: string }}
 */
export function cancelMeeting(meetingId) {
  const db = getDB();
  const meeting = (db.meetings || []).find((m) => m.id === meetingId);
  if (!meeting) {
    return { success: false, error: "Собрание не найдено" };
  }

  meeting.status = "cancelled";
  meeting.cancelledAt = new Date().toISOString();
  saveDB(db);

  return { success: true };
}

/**
 * Проверка возможности отметки явки для собрания (TC-MG-09)
 * Отметить явку до собрания нельзя
 * @param {object} meeting
 * @returns {boolean}
 */
export function canMarkAttendance(meeting) {
  if (!meeting) return false;
  if (meeting.status === "completed") return true;
  // Собрание прошло или идёт сегодня (date <= DEMO_TODAY)
  return meeting.date <= DEMO_TODAY;
}

/**
 * Получить записи явки для собрания (28 учеников / родителей 7Б)
 * @param {string} meetingId
 * @returns {object[]}
 */
export function getMeetingAttendance(meetingId) {
  const db = getDB();
  let list = (db.meetingAttendance || []).filter((a) => a.meetingId === meetingId);

  if (list.length > 0) {
    return list;
  }

  const students = (db.students || []).filter((s) => s.classId === "class-7b");
  const parents = db.parents || [];

  list = students.map((st, idx) => {
    const parent = parents.find((p) => (p.children || []).some((c) => c.studentId === st.id)) || null;
    return {
      id: `ma-${meetingId}-${st.id}`,
      meetingId,
      studentId: st.id,
      studentName: st.name,
      parentId: parent ? parent.id : `pr-gen-${idx + 1}`,
      parentName: parent ? parent.name : "Родитель не указан",
      parentRole: parent ? (parent.gender === "female" ? "Мать" : "Отец") : "Законный представитель",
      phone: parent ? parent.phone : "",
      status: ATTENDANCE_STATUSES.PRESENT,
      statusLabel: ATTENDANCE_LABELS.present,
      note: "",
      responded: true,
      updatedAt: null,
    };
  });

  return list;
}

/**
 * Сохранить отметки явки с валидацией (TC-MG-07, TC-MG-08, TC-MG-09)
 * @param {string} meetingId
 * @param {Array<{ id?: string, studentId: string, status: string, note?: string }>} items
 * @returns {{ success: boolean, errors?: Record<string, string>, message?: string }}
 */
export function saveMeetingAttendance(meetingId, items) {
  const meeting = getMeetingById(meetingId);
  if (!meeting) {
    return { success: false, message: "Собрание не найдено" };
  }

  if (!canMarkAttendance(meeting)) {
    return {
      success: false,
      message: "Отметить явку до проведения собрания нельзя. Собрание ещё не состоялось.",
    };
  }

  const errors = {};
  for (const item of items) {
    const status = item.status;
    const note = (item.note || "").trim();

    if (
      (status === ATTENDANCE_STATUSES.ABSENT || status === ATTENDANCE_STATUSES.EXCUSED) &&
      !note
    ) {
      errors[item.studentId || item.id] =
        "Укажите причину неявки (для значений «Не пришёл» и «Уважительная причина» примечание обязательно)";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const db = getDB();
  db.meetingAttendance = db.meetingAttendance || [];

  const existingMap = new Map();
  for (const a of db.meetingAttendance) {
    if (a.meetingId === meetingId) {
      existingMap.set(a.studentId || a.id, a);
    }
  }

  const now = new Date().toISOString();
  const updatedList = items.map((item) => {
    const prev = existingMap.get(item.studentId || item.id) || {};
    return {
      ...prev,
      ...item,
      meetingId,
      status: item.status,
      statusLabel: ATTENDANCE_LABELS[item.status] || "Пришёл",
      note: (item.note || "").trim(),
      updatedAt: now,
    };
  });

  db.meetingAttendance = [
    ...db.meetingAttendance.filter((a) => a.meetingId !== meetingId),
    ...updatedList,
  ];

  if (meeting.status === "scheduled") {
    meeting.status = "completed";
  }

  saveDB(db);

  return { success: true };
}

/**
 * Расчет итогов собрания по явке (TC-MG-10)
 * Счётчик считается динамически по отметкам явки
 * @param {string} meetingId
 * @returns {{
 *   total: number,
 *   presentCount: number,
 *   absentCount: number,
 *   excusedCount: number,
 *   ratioText: string,
 *   absentList: object[]
 * }}
 */
export function getMeetingSummary(meetingId) {
  const attendance = getMeetingAttendance(meetingId);
  const total = attendance.length;
  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  const absentList = [];

  for (const item of attendance) {
    if (item.status === ATTENDANCE_STATUSES.PRESENT) {
      presentCount++;
    } else {
      if (item.status === ATTENDANCE_STATUSES.EXCUSED) {
        excusedCount++;
      } else {
        absentCount++;
      }
      absentList.push(item);
    }
  }

  return {
    total,
    presentCount,
    absentCount,
    excusedCount,
    ratioText: `${presentCount} из ${total}`,
    absentList,
  };
}
