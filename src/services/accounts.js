/**
 * Модуль: Учётные записи пользователей
 *
 * Операции администратора над учётными записями:
 * - Смена роли (вступает в силу при следующем входе)
 * - Привязка учётной записи к карточке (ученик, ребёнок родителя, учитель)
 * - Блокировка и разблокировка учётной записи
 * - Создание учётной записи с временным паролем
 * - Сброс пароля с выдачей временного пароля
 */

import {
  getDB,
  saveDB,
  validateNewPassword,
  shortenName,
  resetFailedAttempts,
  ROLE_LABELS,
} from "./storage.js";

/**
 * Смена роли учётной записи администратором.
 * Изменение вступает в силу при следующем входе (активная сессия не прерывается).
 * @param {string} userId ID пользователя
 * @param {string} newRole Ключ новой роли
 * @returns {Object} { success, message?, error? }
 */
export function updateAccountRole(userId, newRole) {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: "Учётная запись не найдена" };
  }
  if (!ROLE_LABELS[newRole]) {
    return { success: false, error: "Неизвестная роль" };
  }
  if (user.role === "admin" && newRole !== "admin") {
    const activeAdmins = db.users.filter((u) => u.role === "admin").length;
    if (activeAdmins <= 1) {
      return {
        success: false,
        error: "Нельзя снять роль администратора с последнего администратора",
      };
    }
  }

  user.role = newRole;
  user.roleLabel = ROLE_LABELS[newRole];
  saveDB(db);

  return {
    success: true,
    message: `Роль изменена. Изменение применится при следующем входе`,
  };
}

/**
 * Привязка учётной записи к учётной карточке.
 *
 * binding = null — отвязать;
 * binding = { cardId } — привязать к карточке (id зависит от роли):
 * · student → id карточки ученика (db.students);
 * · parent → id карточки ребёнка (db.students);
 * · teacher,
 * subject_teacher→ короткое имя учителя — карточка учителя (db.subjects).
 * Одна карточка может быть связана не более чем с одной учётной записью.
 */
export function getAccountCardRef(user) {
  if (!user) return null;
  switch (user.role) {
    case "student":
      return user.studentId ? { type: "student", id: user.studentId } : null;
    case "parent":
      return user.childStudentId
        ? { type: "parent", id: user.childStudentId }
        : null;
    case "teacher":
    case "subject_teacher":
      return user.cardName ? { type: "teacher", id: user.cardName } : null;
    default:
      return null;
  }
}

/**
 * Привязка учётной записи к карточке.
 *
 * binding = null — отвязать;
 * binding = { cardId } — привязать к карточке (тип зависит от роли):
 * · student → карточка ученика (db.students);
 * · parent → карточка ребёнка (db.students);
 * · teacher, subject_teacher → короткое имя учителя (db.subjects).
 * Одна карточка может быть привязана не более чем к одной учётной записи.
 * Изменение применяется при следующем входе.
 * @param {string} userId ID пользователя
 * @param {Object|null} binding { cardId } или null для отвязки
 * @returns {Object} { success, message?, error? }
 */
export function setAccountBinding(userId, binding) {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: "Учётная запись не найдена" };
  }
  if (user.role === "admin") {
    return {
      success: false,
      error: "У учётной записи администратора нет учётной карточки",
    };
  }

  const className = (db.meta && db.meta.className) || "7Б";

  if (!binding || !binding.cardId) {
    if (user.role === "student") {
      user.studentId = null;
      user.classId = null;
    } else if (user.role === "parent") {
      user.childStudentId = null;
      user.childName = null;
    } else {
      user.cardName = null;
    }
    saveDB(db);
    return {
      success: true,
      message:
        "Привязка к учётной карточке снята. Изменение применится при следующем входе.",
    };
  }

  let cardRef;
  if (user.role === "student" || user.role === "parent") {
    const card = (db.students || []).find((s) => s.id === binding.cardId);
    if (!card) {
      return { success: false, error: "Карточка не найдена" };
    }
    cardRef = {
      type: user.role === "parent" ? "parent" : "student",
      id: card.id,
    };

    const taken = (db.users || []).some(
      (u) =>
        u.id !== userId &&
        JSON.stringify(getAccountCardRef(u)) === JSON.stringify(cardRef),
    );
    if (taken) {
      return {
        success: false,
        error: "Эта учётная карточка уже привязана к другой учётной записи",
      };
    }

    if (user.role === "student") {
      user.studentId = card.id;
      user.classId = card.classId;
    } else {
      user.childStudentId = card.id;
      user.childName = `${card.fullName} (${className})`;
    }
  } else {
    const teacherNames = [
      ...new Set((db.subjects || []).map((s) => s.teacher)),
    ];
    const card =
      teacherNames.find((name) => name === binding.cardId) ||
      (user.shortName === binding.cardId ? binding.cardId : null);
    if (!card) {
      return {
        success: false,
        error: "Карточка учителя не найдена в справочнике",
      };
    }
    cardRef = { type: "teacher", id: card };

    const taken = (db.users || []).some(
      (u) =>
        u.id !== userId &&
        JSON.stringify(getAccountCardRef(u)) === JSON.stringify(cardRef),
    );
    if (taken) {
      return {
        success: false,
        error: "Эта учётная карточка уже привязана к другой учётной записи",
      };
    }

    user.cardName = card;
  }

  saveDB(db);
  return {
    success: true,
    message: "Привязка обновлена. Изменение применится при следующем входе.",
  };
}

/**
 * Блокировка / разблокировка учётной записи.
 * Блокировка действует при следующем входе: активная сессия не прерывается.
 * Разблокировка также сбрасывает счётчик неудачных попыток входа.
 */
export function setAccountStatus(userId, status) {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: "Учётная запись не найдена" };
  }
  if (status !== "active" && status !== "blocked") {
    return { success: false, error: "Недопустимый статус" };
  }
  if (status === "blocked" && user.role === "admin") {
    const activeAdmins = db.users.filter(
      (u) => u.role === "admin" && u.status === "active",
    ).length;
    if (activeAdmins <= 1) {
      return {
        success: false,
        error: "Нельзя заблокировать последнего активного администратора",
      };
    }
  }

  user.status = status;
  if (status === "active") {
    resetFailedAttempts(user.username);
  }
  saveDB(db);

  return {
    success: true,
    message:
      status === "blocked"
        ? "Учётная запись заблокирована. Вход будет запрещён при следующей попытке."
        : "Учётная запись разблокирована. Вход снова доступен.",
  };
}

/**
 * Создание учётной записи с временным паролем:
 * пользователь обязан сменить его при первом входе.
 */
export function createAccount({ personName, username, role, tempPassword }) {
  const db = getDB();
  const name = (personName || "").trim();
  const login = (username || "").trim().toLowerCase();
  const pwd = (tempPassword || "").trim();

  if (!name) {
    return { success: false, error: "Укажите ФИО пользователя" };
  }
  if (!login) {
    return { success: false, error: "Укажите логин (электронную почту)" };
  }
  if (!ROLE_LABELS[role]) {
    return { success: false, error: "Выберите роль" };
  }
  if (db.users.some((u) => u.username.toLowerCase() === login)) {
    return {
      success: false,
      error: "Пользователь с таким логином уже существует",
    };
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
    status: "active",
    mustChangePassword: true,
  };
  db.users.push(newUser);
  saveDB(db);

  return { success: true, user: newUser, message: "Учётная запись создана" };
}

/**
 * Сброс пароля администратором: выдаётся временный пароль,
 * обязательный к смене при первом входе.
 */
export function resetAccountPassword(userId) {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: "Учётная запись не найдена" };
  }

  const tempPassword = `Temp#${Math.floor(1000 + Math.random() * 9000)}${new Date().getFullYear() % 100}`;
  user.password = tempPassword;
  user.mustChangePassword = true;
  resetFailedAttempts(user.username);
  saveDB(db);

  return {
    success: true,
    tempPassword,
    message: "Пароль сброшен. Сообщите временный пароль пользователю.",
  };
}
