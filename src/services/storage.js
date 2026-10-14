import { INITIAL_DATASET } from '../mock/dataset.js';

const STORAGE_KEYS = {
  DB: 'classroom_crm_db',
  SESSION: 'classroom_crm_session',
  FAILED_ATTEMPTS: 'classroom_crm_failed_attempts'
};

export function getDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DB);
    if (!raw) {
      const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
      localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
      return clone;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Ошибка чтения БД из localStorage, сброс к начальному состоянию', e);
    const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
    localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
    return clone;
  }
}

export function saveDB(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(data));
  } catch (e) {
    console.error('Ошибка сохранения БД в localStorage', e);
  }
}

export function resetDB() {
  const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
  localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
  return clone;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(sessionData) {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
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
    const raw = localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const map = raw ? JSON.parse(raw) : {};
    return map[username] || 0;
  } catch {
    return 0;
  }
}

function incrementFailedAttempts(username) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const map = raw ? JSON.parse(raw) : {};
    map[username] = (map[username] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(map));
    return map[username];
  } catch {
    return 1;
  }
}

function resetFailedAttempts(username) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    if (raw) {
      const map = JSON.parse(raw);
      delete map[username];
      localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(map));
    }
  } catch {
    // noop
  }
}

export function login(rawUsername, password) {
  const username = (rawUsername || '').trim();
  const pwd = password || '';

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

  if (user.password !== currentPassword) {
    return { success: false, error: 'Текущий пароль указан неверно' };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Новый пароль должен содержать не менее 8 символов' };
  }

  const hasLower = /[a-zа-я]/.test(newPassword);
  const hasUpper = /[A-ZА-Я]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);

  if (!hasLower || !hasUpper || !hasDigit) {
    return { success: false, error: 'Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Пароли не совпадают' };
  }

  user.password = newPassword;
  saveDB(db);

  return { success: true, message: 'Пароль успешно изменён' };
}
