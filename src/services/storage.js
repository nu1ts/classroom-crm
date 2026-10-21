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
    const parsed = JSON.parse(raw);
    const kotova = (parsed.parents || []).find(p => p.id === 'pr-10');
    if (kotova && kotova.otherChildren && kotova.otherChildren.some(oc => oc.name === 'Котов Денис')) {
      kotova.otherChildren = [
        { name: 'Котова Дарья', class: '9В', role: 'Дочь' }
      ];
      storage.setItem(STORAGE_KEYS.DB, JSON.stringify(parsed));
    }
    return parsed;
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

  if (session.role && session.role !== user.role) {
    return {
      ...user,
      role: session.role,
      roleLabel: ROLE_LABELS[session.role] || user.roleLabel
    };
  }
  return user;
}

export const ROLE_LABELS = {
  teacher: 'Классный руководитель',
  subject_teacher: 'Учитель-предметник',
  parent: 'Родитель',
  student: 'Ученик',
  admin: 'Администратор'
};

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

  user.lastLoginAt = new Date().toISOString();
  saveDB(db);

  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString()
  };
  setSession(session);

  return {
    success: true,
    user,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
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

export function changePassword(userId, currentPassword, newPassword, confirmPassword, clearMustChange = false) {
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
  if (clearMustChange) {
    user.mustChangePassword = false;
  }
  saveDB(db);

  return { success: true, message: 'Пароль успешно изменён' };
}


export function updateAccountRole(userId, newRole) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'Учётная запись не найдена' };
  }
  if (!ROLE_LABELS[newRole]) {
    return { success: false, error: 'Неизвестная роль' };
  }
  if (user.role === 'admin' && newRole !== 'admin') {
    const activeAdmins = db.users.filter(u => u.role === 'admin').length;
    if (activeAdmins <= 1) {
      return { success: false, error: 'Нельзя снять роль администратора с последнего администратора' };
    }
  }

  user.role = newRole;
  user.roleLabel = ROLE_LABELS[newRole];
  saveDB(db);

  return { success: true, message: `Роль изменена. Изменение применится при следующем входе` };
}

/**
 * Привязка учётной записи к учётной карточке.
 *
 * binding = null  — отвязать;
 * binding = { cardId } — привязать к карточке (id зависит от роли):
 *   · student        → id карточки ученика (db.students);
 *   · parent         → id карточки ребёнка (db.students);
 *   · teacher,
 *     subject_teacher→ короткое имя учителя — карточка учителя (db.subjects).
 * Одна карточка может быть связана не более чем с одной учётной записью.
 */
export function getAccountCardRef(user) {
  if (!user) return null;
  switch (user.role) {
    case 'student':
      return user.studentId ? { type: 'student', id: user.studentId } : null;
    case 'parent':
      return user.childStudentId ? { type: 'parent', id: user.childStudentId } : null;
    case 'teacher':
    case 'subject_teacher':
      return user.cardName ? { type: 'teacher', id: user.cardName } : null;
    default:
      return null;
  }
}

export function setAccountBinding(userId, binding) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'Учётная запись не найдена' };
  }
  if (user.role === 'admin') {
    return { success: false, error: 'У учётной записи администратора нет учётной карточки' };
  }

  const className = (db.meta && db.meta.className) || '7Б';

  if (!binding || !binding.cardId) {
    if (user.role === 'student') {
      user.studentId = null;
      user.classId = null;
    } else if (user.role === 'parent') {
      user.childStudentId = null;
      user.childName = null;
    } else {
      user.cardName = null;
    }
    saveDB(db);
    return { success: true, message: 'Привязка к учётной карточке снята. Изменение применится при следующем входе.' };
  }

  let cardRef;
  if (user.role === 'student' || user.role === 'parent') {
    const card = (db.students || []).find(s => s.id === binding.cardId);
    if (!card) {
      return { success: false, error: 'Карточка не найдена' };
    }
    cardRef = { type: user.role === 'parent' ? 'parent' : 'student', id: card.id };

    const taken = (db.users || []).some(u =>
      u.id !== userId && JSON.stringify(getAccountCardRef(u)) === JSON.stringify(cardRef)
    );
    if (taken) {
      return { success: false, error: 'Эта учётная карточка уже привязана к другой учётной записи' };
    }

    if (user.role === 'student') {
      user.studentId = card.id;
      user.classId = card.classId;
    } else {
      user.childStudentId = card.id;
      user.childName = `${card.fullName} (${className})`;
    }
  } else {
    const teacherNames = [...new Set((db.subjects || []).map(s => s.teacher))];
    const card = teacherNames.find(name => name === binding.cardId) || (user.shortName === binding.cardId ? binding.cardId : null);
    if (!card) {
      return { success: false, error: 'Карточка учителя не найдена в справочнике' };
    }
    cardRef = { type: 'teacher', id: card };

    const taken = (db.users || []).some(u =>
      u.id !== userId && JSON.stringify(getAccountCardRef(u)) === JSON.stringify(cardRef)
    );
    if (taken) {
      return { success: false, error: 'Эта учётная карточка уже привязана к другой учётной записи' };
    }

    user.cardName = card;
  }

  saveDB(db);
  return { success: true, message: 'Привязка обновлена. Изменение применится при следующем входе.' };
}

/**
 * Блокировка / разблокировка учётной записи.
 * Блокировка действует при следующем входе: активная сессия не прерывается.
 * Разблокировка также сбрасывает счётчик неудачных попыток входа.
 */
export function setAccountStatus(userId, status) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'Учётная запись не найдена' };
  }
  if (status !== 'active' && status !== 'blocked') {
    return { success: false, error: 'Недопустимый статус' };
  }
  if (status === 'blocked' && user.role === 'admin') {
    const activeAdmins = db.users.filter(u => u.role === 'admin' && u.status === 'active').length;
    if (activeAdmins <= 1) {
      return { success: false, error: 'Нельзя заблокировать последнего активного администратора' };
    }
  }

  user.status = status;
  if (status === 'active') {
    resetFailedAttempts(user.username);
  }
  saveDB(db);

  return {
    success: true,
    message: status === 'blocked'
      ? 'Учётная запись заблокирована. Вход будет запрещён при следующей попытке.'
      : 'Учётная запись разблокирована. Вход снова доступен.'
  };
}

/**
 * Создание учётной записи с временным паролем
 * (пользователь обязан сменить его при первом входе — AUTH-15).
 */
export function createAccount({ personName, username, role, tempPassword }) {
  const db = getDB();
  const name = (personName || '').trim();
  const login = (username || '').trim().toLowerCase();
  const pwd = (tempPassword || '').trim();

  if (!name) {
    return { success: false, error: 'Укажите ФИО пользователя' };
  }
  if (!login) {
    return { success: false, error: 'Укажите логин (электронную почту)' };
  }
  if (!ROLE_LABELS[role]) {
    return { success: false, error: 'Выберите роль' };
  }
  if (db.users.some(u => u.username.toLowerCase() === login)) {
    return { success: false, error: 'Пользователь с таким логином уже существует' };
  }
  const pwdCheck = validateNewPassword(pwd);
  if (!pwdCheck.valid) {
    return { success: false, error: pwdCheck.error };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: login,
    password: pwd,
    role,
    roleLabel: ROLE_LABELS[role],
    personName: name,
    shortName: shortenName(name),
    status: 'active',
    mustChangePassword: true
  };
  db.users.push(newUser);
  saveDB(db);

  return { success: true, user: newUser, message: 'Учётная запись создана' };
}

/**
 * Сброс пароля администратором (AUTH-15, шаг 3):
 * выдаётся временный пароль, обязательный к смене при первом входе.
 */
export function resetAccountPassword(userId) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'Учётная запись не найдена' };
  }

  const tempPassword = `Temp#${Math.floor(1000 + Math.random() * 9000)}${new Date().getFullYear() % 100}`;
  user.password = tempPassword;
  user.mustChangePassword = true;
  resetFailedAttempts(user.username);
  saveDB(db);

  return { success: true, tempPassword, message: 'Пароль сброшен. Сообщите временный пароль пользователю.' };
}

function validateNewPassword(pwd) {
  if (!pwd || pwd.length < 8) {
    return { valid: false, error: 'Пароль должен содержать не менее 8 символов' };
  }
  const hasLower = /[a-zа-я]/.test(pwd);
  const hasUpper = /[A-ZА-Я]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  if (!hasLower || !hasUpper || !hasDigit) {
    return { valid: false, error: 'Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру' };
  }
  return { valid: true };
}

function shortenName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const initials = parts.slice(1).map(p => `${p[0]}.`).join(' ');
  return `${parts[0]} ${initials}`;
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

  if (data.relationRole || data.isPrimary !== undefined) {
    const rels = (db.parentStudentRelations || []).filter(r => r.parentId === parentId);
    rels.forEach(rel => {
      if (data.relationRole) rel.relationRole = data.relationRole;
      if (data.isPrimary !== undefined) {
        if (data.isPrimary) {
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
  const rels = (db.parentStudentRelations || []).filter(r => r.parentId === parentId);
  if (rels.length > 0) {
    return { success: false, error: 'Сначала снимите связь с учеником в карточке или сводке' };
  }

  db.parents = (db.parents || []).filter(p => p.id !== parentId);
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

/**
 * Снятие связи родителя с учеником (TC-PR-13)
 */
export function unlinkParentFromStudent(parentId, studentId) {
  if (!parentId) return { success: false, error: 'ID родителя не указан' };

  const db = getDB();
  if (!db.parentStudentRelations) db.parentStudentRelations = [];

  if (studentId) {
    db.parentStudentRelations = db.parentStudentRelations.filter(
      r => !(r.parentId === parentId && r.studentId === studentId)
    );
  } else {
    db.parentStudentRelations = db.parentStudentRelations.filter(
      r => r.parentId !== parentId
    );
  }

  saveDB(db);
  return { success: true };
}




