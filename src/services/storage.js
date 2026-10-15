import { INITIAL_DATASET } from '../mock/dataset.js';

const STORAGE_KEYS = {
  DB: 'classroom_crm_db',
  SESSION: 'classroom_crm_session',
  FAILED_ATTEMPTS: 'classroom_crm_failed_attempts'
};

const memoryStore = new Map();
const storage = {
  getItem(key) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, String(value));
    }
  },
  removeItem(key) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    } else {
      memoryStore.clear();
    }
  }
};

export function getDB() {
  try {
    const raw = storage.getItem(STORAGE_KEYS.DB);
    if (!raw) {
      const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
      storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
      return clone;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Ошибка чтения БД из хранилища, сброс к начальному состоянию', e);
    const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
    storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
    return clone;
  }
}

export function saveDB(data) {
  try {
    storage.setItem(STORAGE_KEYS.DB, JSON.stringify(data));
  } catch (e) {
    console.error('Ошибка сохранения БД в хранилище', e);
  }
}

export function resetDB() {
  const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
  storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
  return clone;
}

export function getSession() {
  try {
    const raw = storage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(sessionData) {
  storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
}

export function clearSession() {
  storage.removeItem(STORAGE_KEYS.SESSION);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session || !session.userId) return null;

  const db = getDB();
  const user = db.users.find(u => u.id === session.userId || u.username === session.username);
  if (!user) {
    clearSession();
    return null;
  }
  return user;
}

function getFailedAttempts(username) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const map = raw ? JSON.parse(raw) : {};
    return map[username] || 0;
  } catch {
    return 0;
  }
}

function incrementFailedAttempts(username) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const map = raw ? JSON.parse(raw) : {};
    map[username] = (map[username] || 0) + 1;
    storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(map));
    return map[username];
  } catch {
    return 1;
  }
}

function resetFailedAttempts(username) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    if (raw) {
      const map = JSON.parse(raw);
      delete map[username];
      storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(map));
    }
  } catch {
    // noop
  }
}

export function login(rawUsername, password) {
  const username = (rawUsername || '').trim();
  const pwd = (password || '').trim();

  if (!username || !pwd) {
    return { success: false, error: 'Заполните все поля' };
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  const failedCount = getFailedAttempts(username);
  if (failedCount >= 5 || (user && user.status === 'blocked')) {
    if (user && user.status !== 'blocked') {
      user.status = 'blocked';
      saveDB(db);
    }
    return {
      success: false,
      error: 'Учётная запись заблокирована из-за 5 неудачных попыток входа. Обратитесь к администратору.'
    };
  }

  if (!user || user.password !== pwd) {
    const newCount = incrementFailedAttempts(username);
    if (newCount >= 5 && user) {
      user.status = 'blocked';
      saveDB(db);
      return {
        success: false,
        error: 'Учётная запись заблокирована из-за 5 неудачных попыток входа. Обратитесь к администратору.'
      };
    }
    return {
      success: false,
      error: 'Неверный логин или пароль'
    };
  }

  resetFailedAttempts(username);
  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString()
  };
  setSession(session);

  return { success: true, user };
}

export function logout() {
  clearSession();
}

export function quickLoginAsRole(roleKey) {
  const db = getDB();
  const user = db.users.find(u => u.role === roleKey && u.status !== 'blocked');
  if (!user) return null;

  resetFailedAttempts(user.username);
  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString()
  };
  setSession(session);
  return user;
}

export function changePassword(userId, currentPassword, newPassword, confirmPassword) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'Пользователь не найден' };
  }

  const curPwd = (currentPassword || '').trim();
  const newPwd = (newPassword || '').trim();
  const confPwd = (confirmPassword || '').trim();

  if (user.password !== curPwd) {
    return { success: false, error: 'Текущий пароль указан неверно' };
  }

  if (!newPwd || newPwd.length < 8) {
    return { success: false, error: 'Новый пароль должен содержать не менее 8 символов' };
  }

  const hasLower = /[a-zа-я]/.test(newPwd);
  const hasUpper = /[A-ZА-Я]/.test(newPwd);
  const hasDigit = /\d/.test(newPwd);

  if (!hasLower || !hasUpper || !hasDigit) {
    return { success: false, error: 'Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру' };
  }

  if (newPwd !== confPwd) {
    return { success: false, error: 'Пароли не совпадают' };
  }

  user.password = newPwd;
  saveDB(db);

  return { success: true, message: 'Пароль успешно изменён' };
}

/**
 * Подтверждение пропуска урока (БП «Посещаемость: подтверждение пропусков»)
 * @param {string} recordId ID записи посещаемости (или поиск по lessonId + studentId)
 * @param {Object} data { status: 'excused' | 'unexcused', reason, document, confirmedBy }
 */
export function confirmAbsenceRecord(recordId, data = {}) {
  const db = getDB();
  const record = (db.attendance || []).find(a => a.id === recordId);
  if (!record) {
    return { success: false, error: 'Запись посещаемости не найдена' };
  }

  const isExcused = data.status === 'excused' || data.isExcused === true;
  record.status = isExcused ? 'excused' : 'unexcused';
  record.code = isExcused ? 'УП' : 'Н';
  record.value = 'absent';
  record.reason = data.reason || (isExcused ? 'Уважительная причина (справка / заявление)' : 'Неуважительная причина');
  record.document = data.document || (isExcused ? 'Медицинская справка' : null);
  record.confirmedBy = data.confirmedBy || 'Смирнова М. В.';
  record.confirmedAt = new Date().toISOString();

  if (db.meta) {
    const q1LessonIds = new Set((db.lessons || []).filter(l => l.periodId === 'q1_2024').map(l => l.id));
    db.meta.unconfirmedAbsencesCount = (db.attendance || []).filter(
      a => a.status === 'unconfirmed' && a.value === 'absent' && q1LessonIds.has(a.lessonId)
    ).length;
  }

  saveDB(db);
  return { success: true, record };
}

/**
 * Массовое подтверждение пропусков (например, за несколько уроков по одной справке)
 */
export function batchConfirmAbsences(recordIds, data = {}) {
  const db = getDB();
  const idsSet = new Set(recordIds);
  let updatedCount = 0;

  const isExcused = data.status === 'excused' || data.isExcused === true;
  const reason = data.reason || (isExcused ? 'Уважительная причина (справка / заявление)' : 'Неуважительная причина');
  const document = data.document || (isExcused ? 'Медицинская справка' : null);
  const confirmedBy = data.confirmedBy || 'Смирнова М. В.';
  const confirmedAt = new Date().toISOString();

  (db.attendance || []).forEach(record => {
    if (idsSet.has(record.id)) {
      record.status = isExcused ? 'excused' : 'unexcused';
      record.code = isExcused ? 'УП' : 'Н';
      record.value = 'absent';
      record.reason = reason;
      record.document = document;
      record.confirmedBy = confirmedBy;
      record.confirmedAt = confirmedAt;
      updatedCount++;
    }
  });

  if (db.meta) {
    const q1LessonIds = new Set((db.lessons || []).filter(l => l.periodId === 'q1_2024').map(l => l.id));
    db.meta.unconfirmedAbsencesCount = (db.attendance || []).filter(
      a => a.status === 'unconfirmed' && a.value === 'absent' && q1LessonIds.has(a.lessonId)
    ).length;
  }

  saveDB(db);
  return { success: true, updatedCount };
}

/**
 * Получение комментариев к конкретной записи журнала (уроку и ученику)
 */
export function getJournalComments(lessonId, studentId) {
  const db = getDB();
  if (!db.journalComments) return [];
  return db.journalComments.filter(c => c.lessonId === lessonId && c.studentId === studentId);
}

/**
 * Добавление комментария к записи журнала (БП «Журнал класса»)
 * @param {Object} data { lessonId, studentId, text, author, role }
 */
export function addJournalComment(data = {}) {
  const text = (data.text || '').trim();
  if (!text || !data.lessonId || !data.studentId) {
    return { success: false, error: 'Заполните текст комментария' };
  }

  const db = getDB();
  if (!db.journalComments) {
    db.journalComments = [];
  }

  const newComment = {
    id: `jc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lessonId: data.lessonId,
    studentId: data.studentId,
    text,
    author: data.author || 'Смирнова М. В.',
    role: data.role || 'teacher',
    createdAt: data.createdAt || new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  };

  db.journalComments.push(newComment);
  saveDB(db);
  return { success: true, comment: newComment };
}

/**
 * Фиксация контакта с родителем (TC-BP-23..29)
 * @param {Object} data { studentId, parentId, author, date, time, channel, summary, agreementReached, nextContactDate }
 */
export function addParentContact(data = {}) {
  const summary = (data.summary || '').trim();
  const channel = (data.channel || '').trim();
  const studentId = (data.studentId || '').trim();
  const parentId = (data.parentId || '').trim();

  if (!summary) {
    return { success: false, error: 'Поле «Итог» обязательно для заполнения' };
  }
  if (!channel) {
    return { success: false, error: 'Выберите канал связи' };
  }
  if (!studentId) {
    return { success: false, error: 'Ученик не указан' };
  }

  const db = getDB();
  if (!db.parentContacts) db.parentContacts = [];

  const channelLabels = {
    phone: 'Звонок',
    chat: 'Мессенджер',
    personal: 'Личная беседа',
    meeting: 'Личная беседа',
    letter: 'Письмо'
  };

  const agreementReached = data.agreementReached !== false;
  const nextContactDate = (!agreementReached && data.nextContactDate) ? data.nextContactDate : null;

  const newContact = {
    id: `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    parentId: parentId || (db.parentStudentRelations?.find(r => r.studentId === studentId)?.parentId || 'pr-unknown'),
    author: data.author || 'Смирнова М. В.',
    date: data.date || new Date().toISOString().slice(0, 10),
    time: data.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    channel,
    channelLabel: channelLabels[channel] || data.channelLabel || 'Звонок',
    summary,
    agreementReached,
    nextContactDate
  };

  db.parentContacts.unshift(newContact);
  saveDB(db);

  return { success: true, contact: newContact };
}

/**
 * Добавление педагогической заметки классного руководителя (TC-BP-27..30)
 * @param {Object} data { studentId, author, text, isPrivate, date }
 */
export function addStudentNote(data = {}) {
  const text = (data.text || '').trim();
  const studentId = (data.studentId || '').trim();

  if (!text) {
    return { success: false, error: 'Поле «Текст заметки» обязательно для заполнения' };
  }
  if (!studentId) {
    return { success: false, error: 'Ученик не указан' };
  }

  const db = getDB();
  if (!db.notes) db.notes = [];

  const newNote = {
    id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    author: data.author || 'Смирнова М. В.',
    date: data.date || `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
    text,
    isPrivate: data.isPrivate !== false
  };

  db.notes.unshift(newNote);
  saveDB(db);

  return { success: true, note: newNote };
}

/**
 * Добавление нового родителя (TC-PR-04..05)
 */
export function addParent(data = {}) {
  const fullName = (data.fullName || '').trim();
  const phone = (data.phone || '').trim();
  const studentId = data.studentId || null;
  const relationRole = data.relationRole || 'Родитель';
  const isPrimary = Boolean(data.isPrimary);

  if (!fullName) {
    return { success: false, error: 'Укажите ФИО родителя' };
  }
  if (!phone) {
    return { success: false, error: 'Укажите телефон' };
  }

  const db = getDB();
  if (!db.parents) db.parents = [];
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  const parts = fullName.split(/\s+/);
  const lastName = parts[0] || 'Родитель';
  const firstName = parts[1] || '';
  const middleName = parts.slice(2).join(' ') || '';
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
    otherChildren: []
  };

  db.parents.push(newParent);

  if (studentId) {
    if (isPrimary) {
      db.parentStudentRelations.forEach(r => {
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
      isPrimary
    });
  }

  saveDB(db);
  return { success: true, parent: newParent };
}

/**
 * Обновление данных родителя (TC-PR-06..07)
 */
export function updateParent(parentId, data = {}) {
  if (!parentId) return { success: false, error: 'ID родителя не указан' };

  const db = getDB();
  const parent = (db.parents || []).find(p => p.id === parentId);
  if (!parent) return { success: false, error: 'Родитель не найден' };

  if (data.fullName) {
    const fullName = data.fullName.trim();
    const parts = fullName.split(/\s+/);
    parent.lastName = parts[0] || parent.lastName;
    parent.firstName = parts[1] || parent.firstName;
    parent.middleName = parts.slice(2).join(' ') || parent.middleName;
    parent.fullName = fullName;
    parent.shortName = parent.firstName ? `${parent.lastName} ${parent.firstName[0]}.` : parent.lastName;
  }

  if (data.phone !== undefined) {
    parent.phone = data.phone.trim();
  }

  // Обновление связи, если передана
  if (data.relationRole || data.isPrimary !== undefined) {
    const rels = (db.parentStudentRelations || []).filter(r => r.parentId === parentId);
    rels.forEach(rel => {
      if (data.relationRole) rel.relationRole = data.relationRole;
      if (data.isPrimary !== undefined) {
        if (data.isPrimary) {
          // сбрасываем у других родителей этого ученика
          (db.parentStudentRelations || []).forEach(otherRel => {
            if (otherRel.studentId === rel.studentId && otherRel.parentId !== parentId) {
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
 * Удаление родителя (TC-PR-12)
 */
export function deleteParent(parentId) {
  if (!parentId) return { success: false, error: 'ID родителя не указан' };

  const db = getDB();
  db.parents = (db.parents || []).filter(p => p.id !== parentId);
  db.parentStudentRelations = (db.parentStudentRelations || []).filter(r => r.parentId !== parentId);
  saveDB(db);

  return { success: true };
}

/**
 * Связывание родителя с учеником (TC-PR-08..09)
 */
export function linkParentToStudent(parentId, studentId, options = {}) {
  if (!parentId || !studentId) {
    return { success: false, error: 'Не указан родитель или ученик' };
  }

  const db = getDB();
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  const isPrimary = Boolean(options.isPrimary);
  const relationRole = options.relationRole || 'Родитель';

  if (isPrimary) {
    db.parentStudentRelations.forEach(r => {
      if (r.studentId === studentId) {
        r.isPrimary = false;
      }
    });
  }

  const existing = db.parentStudentRelations.find(r => r.parentId === parentId && r.studentId === studentId);
  if (existing) {
    existing.relationRole = relationRole;
    existing.isPrimary = isPrimary;
  } else {
    db.parentStudentRelations.push({
      id: `rel-${parentId}-${studentId}`,
      parentId,
      studentId,
      relationRole,
      isPrimary
    });
  }

  saveDB(db);
  return { success: true };
}



