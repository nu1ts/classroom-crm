import { INITIAL_DATASET } from '../mock/dataset.js';

const STORAGE_KEYS = {
  DB: 'classroom_crm_db',
  SESSION: 'classroom_crm_session',
  FAILED_ATTEMPTS: 'classroom_crm_failed_attempts'
};

export const DEFAULT_ACADEMIC_YEARS = [
  {
    id: 'ay-2024-2025',
    name: '2024/2025',
    startDate: '2024-09-01',
    endDate: '2025-05-30',
    isActive: true,
    quarters: [
      {
        id: 'q1_2024',
        name: 'I четверть',
        startDate: '2024-09-02',
        endDate: '2024-10-25',
        isActive: true
      },
      {
        id: 'q2_2024',
        name: 'II четверть',
        startDate: '2024-11-05',
        endDate: '2024-12-27',
        isActive: false
      },
      {
        id: 'q3_2025',
        name: 'III четверть',
        startDate: '2025-01-09',
        endDate: '2025-03-21',
        isActive: false
      },
      {
        id: 'q4_2025',
        name: 'IV четверть',
        startDate: '2025-03-31',
        endDate: '2025-05-23',
        isActive: false
      }
    ],
    vacations: [
      { id: 'vac-1', name: 'Осенние каникулы', startDate: '2024-10-26', endDate: '2024-11-04' },
      { id: 'vac-2', name: 'Зимние каникулы', startDate: '2024-12-28', endDate: '2025-01-08' },
      { id: 'vac-3', name: 'Весенние каникулы', startDate: '2025-03-22', endDate: '2025-03-30' }
    ]
  },
  {
    id: 'ay-2023-2024',
    name: '2023/2024',
    startDate: '2023-09-01',
    endDate: '2024-05-25',
    isActive: false,
    quarters: [
      { id: 'q1_2023', name: 'I четверть', startDate: '2023-09-01', endDate: '2023-10-27', isActive: false },
      { id: 'q2_2023', name: 'II четверть', startDate: '2023-11-07', endDate: '2023-12-29', isActive: false },
      { id: 'q3_2024', name: 'III четверть', startDate: '2024-01-09', endDate: '2024-03-22', isActive: false },
      { id: 'q4_2024', name: 'IV четверть', startDate: '2024-04-01', endDate: '2024-05-24', isActive: false }
    ],
    vacations: [
      { id: 'vac-prev-1', name: 'Осенние каникулы', startDate: '2023-10-28', endDate: '2023-11-06' },
      { id: 'vac-prev-2', name: 'Зимние каникулы', startDate: '2023-12-30', endDate: '2024-01-08' },
      { id: 'vac-prev-3', name: 'Весенние каникулы', startDate: '2024-03-23', endDate: '2024-03-31' }
    ]
  }
];


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

    let migrated = false;
    if (!Array.isArray(parsed.academicYears) || parsed.academicYears.length === 0) {
      parsed.academicYears = JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_YEARS));
      migrated = true;
    }

    if (!Array.isArray(parsed.teachers) && Array.isArray(INITIAL_DATASET.teachers)) {
      parsed.teachers = JSON.parse(JSON.stringify(INITIAL_DATASET.teachers));
      migrated = true;
    }
    (parsed.users || []).forEach(u => {
      if (!u.cardName && (u.role === 'teacher' || u.role === 'subject_teacher')) {
        u.cardName = u.shortName;
        migrated = true;
      }
    });
    if (migrated) {
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
 * Карточки учителей (UC «CRUD карточки учителя»).
 * Удаление карточки возможно только без нагрузки и без привязанной учётной записи.
 */
export function createTeacherCard(data = {}) {
  const db = getDB();
  if (!Array.isArray(db.teachers)) db.teachers = [];

  const fullName = (data.fullName || '').trim();
  const subjectIds = Array.isArray(data.subjectIds) ? data.subjectIds.filter(Boolean) : [];

  if (!fullName) {
    return { success: false, error: 'Укажите ФИО учителя' };
  }
  if (!subjectIds.length) {
    return { success: false, error: 'Выберите хотя бы один предмет' };
  }
  if (db.teachers.some(t => (t.fullName || '').toLowerCase() === fullName.toLowerCase())) {
    return { success: false, error: 'Карточка с таким ФИО уже существует' };
  }

  const account = data.accountUserId
    ? (db.users || []).find(u => u.id === data.accountUserId)
    : null;
  if (data.accountUserId && !account) {
    return { success: false, error: 'Учётная запись не найдена' };
  }
  if (account) {
    if (account.role !== 'teacher' && account.role !== 'subject_teacher') {
      return { success: false, error: 'Привязать можно только учётную запись с ролью учителя' };
    }
    if (db.teachers.some(t => t.accountUserId === account.id)) {
      return { success: false, error: 'Эта учётная запись уже привязана к другому учителю' };
    }
  }

  const teacher = {
    id: `t-${Date.now()}`,
    fullName,
    shortName: shortenName(fullName),
    subjectIds,
    status: data.status === 'archived' ? 'archived' : 'active',
    homeroomClassId: data.homeroomClassId || null,
    accountUserId: account ? account.id : null,
    workload: []
  };

  db.teachers.push(teacher);
  if (account) {
    account.cardName = teacher.shortName;
  }
  saveDB(db);

  return { success: true, teacher, message: 'Карточка учителя создана' };
}

export function updateTeacherCard(teacherId, data = {}) {
  const db = getDB();
  const teacher = (db.teachers || []).find(t => t.id === teacherId);
  if (!teacher) {
    return { success: false, error: 'Карточка учителя не найдена' };
  }

  if (data.fullName !== undefined) {
    const fullName = String(data.fullName).trim();
    if (!fullName) {
      return { success: false, error: 'Укажите ФИО учителя' };
    }
    if (db.teachers.some(t => t.id !== teacherId && (t.fullName || '').toLowerCase() === fullName.toLowerCase())) {
      return { success: false, error: 'Карточка с таким ФИО уже существует' };
    }
    teacher.fullName = fullName;
    teacher.shortName = shortenName(fullName);
  }

  if (data.subjectIds !== undefined) {
    const subjectIds = Array.isArray(data.subjectIds) ? data.subjectIds.filter(Boolean) : [];
    if (!subjectIds.length) {
      return { success: false, error: 'Выберите хотя бы один предмет' };
    }
    teacher.subjectIds = subjectIds;
  }

  if (data.status !== undefined) {
    teacher.status = data.status === 'archived' ? 'archived' : 'active';
  }

  if (data.homeroomClassId !== undefined) {
    teacher.homeroomClassId = data.homeroomClassId || null;
  }

  if (data.accountUserId !== undefined) {
    const account = data.accountUserId
      ? (db.users || []).find(u => u.id === data.accountUserId)
      : null;
    if (data.accountUserId && !account) {
      return { success: false, error: 'Учётная запись не найдена' };
    }
    if (account) {
      if (account.role !== 'teacher' && account.role !== 'subject_teacher') {
        return { success: false, error: 'Привязать можно только учётную запись с ролью учителя' };
      }
      if (db.teachers.some(t => t.id !== teacherId && t.accountUserId === account.id)) {
        return { success: false, error: 'Эта учётная запись уже привязана к другому учителю' };
      }
    }
    (db.users || []).forEach(u => {
      if (u.cardName === teacher.shortName && (!account || u.id !== account.id)) {
        delete u.cardName;
      }
    });
    teacher.accountUserId = account ? account.id : null;
    if (account) {
      account.cardName = teacher.shortName;
    }
  }

  saveDB(db);
  return { success: true, teacher, message: 'Карточка учителя обновлена' };
}

export function deleteTeacherCard(teacherId) {
  const db = getDB();
  const teacher = (db.teachers || []).find(t => t.id === teacherId);
  if (!teacher) {
    return { success: false, error: 'Карточка учителя не найдена' };
  }
  if ((teacher.workload || []).length) {
    return { success: false, error: 'Сначала снимите учебную нагрузку учителя' };
  }
  if (teacher.accountUserId) {
    return { success: false, error: 'Сначала отвяжите учётную запись учителя' };
  }

  db.teachers = (db.teachers || []).filter(t => t.id !== teacherId);
  saveDB(db);
  return { success: true, message: 'Карточка учителя удалена' };
}

/**
 * Классы, для которых в системе есть нагрузка (для назначения классного руководителя)
 */
export function getKnownClassIds(db = getDB()) {
  const ids = new Set();
  (db.teachers || []).forEach(t => {
    if (t.homeroomClassId) ids.add(t.homeroomClassId);
    (t.workload || []).forEach(w => { if (w.classId) ids.add(w.classId); });
  });
  if (db.meta && db.meta.classId) ids.add(db.meta.classId);
  return [...ids];
}

/**
 * Справочник классов школы (для матрицы нагрузки)
 */
export function getClassDirectory(db = getDB()) {
  const list = Array.isArray(db.classes) ? db.classes.map(c => ({ id: c.id, name: c.name })) : [];
  if (list.length) return list;
  const names = new Map();
  (db.teachers || []).forEach(t => {
    (t.workload || []).forEach(w => { if (w.classId) names.set(w.classId, w.className); });
  });
  if (db.meta && db.meta.classId) names.set(db.meta.classId, db.meta.className);
  return [...names].map(([id, name]) => ({ id, name }));
}

function getClassNameById(classId, db) {
  const dir = getClassDirectory(db);
  const found = dir.find(c => c.id === classId);
  return found ? found.name : (db.meta && db.meta.classId === classId ? db.meta.className : classId);
}

function getSubjectShortName(subjectId, db) {
  const subject = (db.subjects || []).find(s => s.id === subjectId);
  return subject ? (subject.shortName || subject.name) : subjectId;
}

/**
 * Плоский список строк нагрузки: учитель × предмет × класс, часов в неделю
 */
export function getWorkloadRows(db = getDB()) {
  const rows = [];
  (db.teachers || []).forEach(teacher => {
    (teacher.workload || []).forEach(w => {
      rows.push({
        id: w.id || `wl-${teacher.id}-${w.classId}-${w.subjectId}`,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        teacherShortName: teacher.shortName,
        subjectId: w.subjectId,
        subjectLabel: w.subjectLabel || getSubjectShortName(w.subjectId, db),
        classId: w.classId,
        className: w.className || getClassNameById(w.classId, db),
        hours: w.hours || 0
      });
    });
  });
  return rows;
}

function findWorkloadOwner(db, rowId) {
  for (const teacher of db.teachers || []) {
    const row = (teacher.workload || []).find(w => (w.id || `wl-${teacher.id}-${w.classId}-${w.subjectId}`) === rowId);
    if (row) return { teacher, row };
  }
  return null;
}

function validateWorkloadValues(db, values, excludeRowId = null) {
  const teacher = (db.teachers || []).find(t => t.id === values.teacherId);
  if (!teacher) {
    return { error: 'Учитель не найден' };
  }
  const subject = (db.subjects || []).find(s => s.id === values.subjectId);
  if (!subject) {
    return { error: 'Предмет не найден в справочнике' };
  }
  const classId = values.classId;
  const classExists = getClassDirectory(db).some(c => c.id === classId);
  if (!classExists) {
    return { error: 'Класс не найден в справочнике' };
  }
  const hours = Number(values.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 40) {
    return { error: 'Количество часов должно быть целым числом от 1 до 40' };
  }
  const duplicate = (db.teachers || []).some(t => (t.workload || []).some(w => {
    const wId = w.id || `wl-${t.id}-${w.classId}-${w.subjectId}`;
    if (wId === excludeRowId) return false;
    return t.id === values.teacherId && w.subjectId === values.subjectId && w.classId === classId;
  }));
  if (duplicate) {
    return { error: 'Такая нагрузка уже назначена' };
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
    hours
  };

  teacher.workload = teacher.workload || [];
  teacher.workload.push(row);

  if (!(teacher.subjectIds || []).includes(subject.id)) {
    teacher.subjectIds = [...(teacher.subjectIds || []), subject.id];
  }

  saveDB(db);
  return { success: true, row, message: 'Нагрузка назначена' };
}

/**
 * Изменение строки нагрузки (предмет, класс, часы)
 */
export function updateWorkloadRow(rowId, values = {}) {
  const db = getDB();
  const owner = findWorkloadOwner(db, rowId);
  if (!owner) {
    return { success: false, error: 'Строка нагрузки не найдена' };
  }

  const merged = {
    teacherId: values.teacherId || owner.teacher.id,
    subjectId: values.subjectId || owner.row.subjectId,
    classId: values.classId || owner.row.classId,
    hours: values.hours !== undefined ? values.hours : owner.row.hours
  };

  const checked = validateWorkloadValues(db, merged, rowId);
  if (checked.error) {
    return { success: false, error: checked.error };
  }

  const { teacher, subject, classId, hours } = checked;
  if (teacher.id !== owner.teacher.id) {
    owner.teacher.workload = owner.teacher.workload.filter(w => w !== owner.row);
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
    hours
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
  return { success: true, row: updated, message: 'Нагрузка обновлена' };
}

/**
 * Снятие нагрузки: строка удаляется, записи журнала и оценок сохраняются
 */
export function removeWorkloadRow(rowId) {
  const db = getDB();
  const owner = findWorkloadOwner(db, rowId);
  if (!owner) {
    return { success: false, error: 'Строка нагрузки не найдена' };
  }
  owner.teacher.workload = owner.teacher.workload.filter(w => w !== owner.row);
  saveDB(db);
  return { success: true, message: 'Нагрузка снята' };
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






/**
 * Получение списка учебных годов
 */
export function getAcademicYears(db = getDB()) {
  return db.academicYears || [];
}

/**
 * Получение текущего активного учебного года
 */
export function getActiveAcademicYear(db = getDB()) {
  const years = getAcademicYears(db);
  return years.find(y => y.isActive) || years[0] || null;
}

/**
 * Смена активного учебного года
 */
export function setActiveAcademicYear(yearId) {
  if (!yearId) return { success: false, error: 'Укажите ID учебного года' };
  const db = getDB();
  const years = getAcademicYears(db);
  const targetYear = years.find(y => y.id === yearId);
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  years.forEach(y => {
    y.isActive = (y.id === yearId);
  });

  db.meta = db.meta || {};
  db.meta.academicYear = targetYear.name;

  let activeQuarter = (targetYear.quarters || []).find(q => q.isActive);
  if (!activeQuarter && (targetYear.quarters || []).length > 0) {
    activeQuarter = targetYear.quarters[0];
    activeQuarter.isActive = true;
  }
  if (activeQuarter) {
    db.meta.period = {
      id: activeQuarter.id,
      name: activeQuarter.name,
      startDate: activeQuarter.startDate,
      endDate: activeQuarter.endDate
    };
  }

  saveDB(db);
  return { success: true, year: targetYear, period: db.meta.period };
}

/**
 * Добавление нового учебного года
 */
export function addAcademicYear(data = {}) {
  const name = (data.name || '').trim();
  const startDate = (data.startDate || '').trim();
  const endDate = (data.endDate || '').trim();

  if (!name) return { success: false, error: 'Укажите название учебного года' };
  if (!/^\d{4}[\/\-]\d{4}$/.test(name)) {
    return { success: false, error: 'Формат года должен быть ГГГГ/ГГГГ (например, 2025/2026)' };
  }
  if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания учебного года' };
  if (startDate >= endDate) return { success: false, error: 'Дата начала года должна быть раньше даты окончания' };

  const db = getDB();
  if (!db.academicYears) db.academicYears = [];

  const formattedName = name.replace('-', '/');
  const exists = db.academicYears.some(y => y.name === formattedName || y.id === `ay-${formattedName.replace('/', '-')}`);
  if (exists) return { success: false, error: `Учебный год «${formattedName}» уже существует` };

  const [startYearStr, endYearStr] = formattedName.split('/');
  const startYearNum = parseInt(startYearStr, 10);
  const endYearNum = parseInt(endYearStr, 10);

  const defaultQuarters = [
    {
      id: `q1_${startYearNum}`,
      name: 'I четверть',
      startDate: `${startYearNum}-09-01`,
      endDate: `${startYearNum}-10-25`,
      isActive: false
    },
    {
      id: `q2_${startYearNum}`,
      name: 'II четверть',
      startDate: `${startYearNum}-11-05`,
      endDate: `${startYearNum}-12-28`,
      isActive: false
    },
    {
      id: `q3_${endYearNum}`,
      name: 'III четверть',
      startDate: `${endYearNum}-01-10`,
      endDate: `${endYearNum}-03-21`,
      isActive: false
    },
    {
      id: `q4_${endYearNum}`,
      name: 'IV четверть',
      startDate: `${endYearNum}-03-31`,
      endDate: `${endYearNum}-05-23`,
      isActive: false
    }
  ];

  const newYear = {
    id: `ay-${formattedName.replace('/', '-')}`,
    name: formattedName,
    startDate,
    endDate,
    isActive: false,
    quarters: Array.isArray(data.quarters) && data.quarters.length > 0 ? data.quarters : defaultQuarters,
    vacations: Array.isArray(data.vacations) ? data.vacations : [
      { id: `vac-${Date.now()}-1`, name: 'Осенние каникулы', startDate: `${startYearNum}-10-26`, endDate: `${startYearNum}-11-04` },
      { id: `vac-${Date.now()}-2`, name: 'Зимние каникулы', startDate: `${startYearNum}-12-29`, endDate: `${endYearNum}-01-09` },
      { id: `vac-${Date.now()}-3`, name: 'Весенние каникулы', startDate: `${endYearNum}-03-22`, endDate: `${endYearNum}-03-30` }
    ]
  };

  db.academicYears.push(newYear);
  saveDB(db);
  return { success: true, year: newYear };
}

/**
 * Удаление учебного года
 */
export function deleteAcademicYear(yearId) {
  if (!yearId) return { success: false, error: 'Укажите ID учебного года' };
  const db = getDB();
  const year = (db.academicYears || []).find(y => y.id === yearId);
  if (!year) return { success: false, error: 'Учебный год не найден' };
  if (year.isActive) return { success: false, error: 'Нельзя удалить активный учебный год' };

  db.academicYears = db.academicYears.filter(y => y.id !== yearId);
  saveDB(db);
  return { success: true };
}

/**
 * Смена активной четверти учебного года
 */
export function setActiveQuarter(yearId, quarterId) {
  if (!quarterId) return { success: false, error: 'Укажите ID четверти' };
  const db = getDB();
  const years = getAcademicYears(db);
  let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
  if (!targetYear) targetYear = years.find(y => (y.quarters || []).some(q => q.id === quarterId));
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  const targetQuarter = (targetYear.quarters || []).find(q => q.id === quarterId);
  if (!targetQuarter) return { success: false, error: 'Четверть не найдена' };

  years.forEach(y => {
    y.isActive = (y.id === targetYear.id);
    (y.quarters || []).forEach(q => {
      q.isActive = (y.id === targetYear.id && q.id === quarterId);
    });
  });

  db.meta = db.meta || {};
  db.meta.academicYear = targetYear.name;
  db.meta.period = {
    id: targetQuarter.id,
    name: targetQuarter.name,
    startDate: targetQuarter.startDate,
    endDate: targetQuarter.endDate
  };

  saveDB(db);
  return { success: true, quarter: targetQuarter, period: db.meta.period };
}

/**
 * Обновление четверти (название, даты)
 */
export function updateQuarter(yearId, quarterId, data = {}) {
  if (!quarterId) return { success: false, error: 'Укажите ID четверти' };
  const startDate = (data.startDate || '').trim();
  const endDate = (data.endDate || '').trim();
  const name = (data.name || '').trim();

  if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания четверти' };
  if (startDate > endDate) return { success: false, error: 'Дата начала четверти не может быть позже даты окончания' };

  const db = getDB();
  const years = getAcademicYears(db);
  let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
  if (!targetYear) targetYear = years.find(y => (y.quarters || []).some(q => q.id === quarterId));
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  const targetQuarter = (targetYear.quarters || []).find(q => q.id === quarterId);
  if (!targetQuarter) return { success: false, error: 'Четверть не найдена' };

  if (name) targetQuarter.name = name;
  targetQuarter.startDate = startDate;
  targetQuarter.endDate = endDate;

  if (targetQuarter.isActive) {
    db.meta = db.meta || {};
    db.meta.period = {
      id: targetQuarter.id,
      name: targetQuarter.name,
      startDate: targetQuarter.startDate,
      endDate: targetQuarter.endDate
    };
  }

  saveDB(db);
  return { success: true, quarter: targetQuarter };
}

/**
 * Установка системной демо-даты «сегодня»
 */
export function setDemoToday(dateStr) {
  const trimmed = (dateStr || '').trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { success: false, error: 'Укажите корректную дату в формате ГГГГ-ММ-ДД' };
  }

  const db = getDB();
  db.meta = db.meta || {};
  db.meta.demoToday = trimmed;

  saveDB(db);
  return { success: true, demoToday: trimmed };
}

/**
 * Сброс параметров учебного года к эталонному предусловию П3
 */
export function resetSchoolYearToP3() {
  const db = getDB();
  db.academicYears = JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_YEARS));
  db.meta = db.meta || {};
  db.meta.demoToday = '2024-10-28';
  db.meta.academicYear = '2024/2025';
  db.meta.period = {
    id: 'q1_2024',
    name: 'I четверть',
    startDate: '2024-09-02',
    endDate: '2024-10-25'
  };
  saveDB(db);
  return {
    success: true,
    academicYear: '2024/2025',
    period: db.meta.period,
    demoToday: '2024-10-28'
  };
}

/**
 * Обновление периода каникул
 */
export function updateVacation(yearId, vacationId, data = {}) {
  if (!vacationId) return { success: false, error: 'Укажите ID каникул' };
  const name = (data.name || '').trim();
  const startDate = (data.startDate || '').trim();
  const endDate = (data.endDate || '').trim();

  if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания каникул' };
  if (startDate > endDate) return { success: false, error: 'Дата начала каникул не может быть позже окончания' };

  const db = getDB();
  const years = getAcademicYears(db);
  let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  if (!Array.isArray(targetYear.vacations)) targetYear.vacations = [];
  const vac = targetYear.vacations.find(v => v.id === vacationId);
  if (!vac) return { success: false, error: 'Период каникул не найден' };

  if (name) vac.name = name;
  vac.startDate = startDate;
  vac.endDate = endDate;

  saveDB(db);
  return { success: true, vacation: vac };
}

/**
 * Добавление периода каникул
 */
export function addVacation(yearId, data = {}) {
  const name = (data.name || '').trim();
  const startDate = (data.startDate || '').trim();
  const endDate = (data.endDate || '').trim();

  if (!name) return { success: false, error: 'Укажите название каникул' };
  if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания каникул' };
  if (startDate > endDate) return { success: false, error: 'Дата начала каникул не может быть позже окончания' };

  const db = getDB();
  const years = getAcademicYears(db);
  let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  if (!Array.isArray(targetYear.vacations)) targetYear.vacations = [];
  const newVac = {
    id: `vac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    startDate,
    endDate
  };
  targetYear.vacations.push(newVac);

  saveDB(db);
  return { success: true, vacation: newVac };
}

/**
 * Удаление периода каникул
 */
export function deleteVacation(yearId, vacationId) {
  if (!vacationId) return { success: false, error: 'Укажите ID каникул' };
  const db = getDB();
  const years = getAcademicYears(db);
  let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
  if (!targetYear) return { success: false, error: 'Учебный год не найден' };

  if (!Array.isArray(targetYear.vacations)) return { success: true };
  targetYear.vacations = targetYear.vacations.filter(v => v.id !== vacationId);

  saveDB(db);
  return { success: true };
}
