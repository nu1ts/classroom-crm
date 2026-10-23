/**
 * Ядро мок-хранилища приложения
 *
 * Отвечает за физическое хранение данных и состояние сессии:
 * - Ключи localStorage (БД, сессия, счётчик неудачных попыток входа)
 * - Чтение и запись БД с сидированием из INITIAL_DATASET при первом обращении
 *   и лёгкими миграциями устаревших версий датасета
 * - Сессия пользователя (вход, выход, быстрый вход под ролью для демо)
 * - Вход с блокировкой учётной записи после серии неудачных попыток
 * - Смена пароля текущим пользователем
 * - Общие хелперы (валидация нового пароля, сокращение ФИО)
 *
 * Доменные операции (учётные записи, учителя, нагрузка, посещаемость,
 * родители, учебный год) вынесены в отдельные модули services/ и
 * реэкспортируются отсюда для совместимости существующих импортов.
 */

import { INITIAL_DATASET } from "../mock/dataset.js";

/** Ключи localStorage: БД приложения, текущая сессия, счётчик неудачных попыток входа. */
const STORAGE_KEYS = {
  DB: "classroom_crm_db",
  SESSION: "classroom_crm_session",
  FAILED_ATTEMPTS: "classroom_crm_failed_attempts",
};

/**
 * Дефолтное состояние учебных годов (2024/2025 активный с I четвертью).
 * Используется при миграции датасета, в котором отсутствует массив academicYears.
 */
export const DEFAULT_ACADEMIC_YEARS = [
  {
    id: "ay-2024-2025",
    name: "2024/2025",
    startDate: "2024-09-01",
    endDate: "2025-05-30",
    isActive: true,
    quarters: [
      {
        id: "q1_2024",
        name: "I четверть",
        startDate: "2024-09-02",
        endDate: "2024-10-25",
        isActive: true,
      },
      {
        id: "q2_2024",
        name: "II четверть",
        startDate: "2024-11-05",
        endDate: "2024-12-27",
        isActive: false,
      },
      {
        id: "q3_2025",
        name: "III четверть",
        startDate: "2025-01-09",
        endDate: "2025-03-21",
        isActive: false,
      },
      {
        id: "q4_2025",
        name: "IV четверть",
        startDate: "2025-03-31",
        endDate: "2025-05-23",
        isActive: false,
      },
    ],
    vacations: [
      {
        id: "vac-1",
        name: "Осенние каникулы",
        startDate: "2024-10-26",
        endDate: "2024-11-04",
      },
      {
        id: "vac-2",
        name: "Зимние каникулы",
        startDate: "2024-12-28",
        endDate: "2025-01-08",
      },
      {
        id: "vac-3",
        name: "Весенние каникулы",
        startDate: "2025-03-22",
        endDate: "2025-03-30",
      },
    ],
  },
  {
    id: "ay-2023-2024",
    name: "2023/2024",
    startDate: "2023-09-01",
    endDate: "2024-05-25",
    isActive: false,
    quarters: [
      {
        id: "q1_2023",
        name: "I четверть",
        startDate: "2023-09-01",
        endDate: "2023-10-27",
        isActive: false,
      },
      {
        id: "q2_2023",
        name: "II четверть",
        startDate: "2023-11-07",
        endDate: "2023-12-29",
        isActive: false,
      },
      {
        id: "q3_2024",
        name: "III четверть",
        startDate: "2024-01-09",
        endDate: "2024-03-22",
        isActive: false,
      },
      {
        id: "q4_2024",
        name: "IV четверть",
        startDate: "2024-04-01",
        endDate: "2024-05-24",
        isActive: false,
      },
    ],
    vacations: [
      {
        id: "vac-prev-1",
        name: "Осенние каникулы",
        startDate: "2023-10-28",
        endDate: "2023-11-06",
      },
      {
        id: "vac-prev-2",
        name: "Зимние каникулы",
        startDate: "2023-12-30",
        endDate: "2024-01-08",
      },
      {
        id: "vac-prev-3",
        name: "Весенние каникулы",
        startDate: "2024-03-23",
        endDate: "2024-03-31",
      },
    ],
  },
];

/**
 * Адаптер хранилища: localStorage в браузере, Map в не-браузерном окружении.
 * Единая точка доступа к ключам STORAGE_KEYS.
 */
const memoryStore = new Map();
const storage = {
  getItem(key) {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, String(value));
    }
  },
  removeItem(key) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
  clear() {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    } else {
      memoryStore.clear();
    }
  },
};

/**
 * Возвращает текущую БД из хранилища. При пустом или повреждённом хранилище
 * сидирует INITIAL_DATASET и возвращает его копию. Выполняет миграции старых
 * версий датасета (учебные годы, карточки учителей, имена карточек).
 * @returns {Object} БД мока (полная копия, изменение безопасно)
 */
export function getDB() {
  try {
    const raw = storage.getItem(STORAGE_KEYS.DB);
    if (!raw) {
      const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
      storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
      return clone;
    }
    const parsed = JSON.parse(raw);
    const kotova = (parsed.parents || []).find((p) => p.id === "pr-10");
    if (
      kotova &&
      kotova.otherChildren &&
      kotova.otherChildren.some((oc) => oc.name === "Котов Денис")
    ) {
      kotova.otherChildren = [
        { name: "Котова Дарья", class: "9В", role: "Дочь" },
      ];
      storage.setItem(STORAGE_KEYS.DB, JSON.stringify(parsed));
    }

    let migrated = false;
    if (
      !Array.isArray(parsed.academicYears) ||
      parsed.academicYears.length === 0
    ) {
      parsed.academicYears = JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_YEARS));
      migrated = true;
    }

    if (
      !Array.isArray(parsed.teachers) &&
      Array.isArray(INITIAL_DATASET.teachers)
    ) {
      parsed.teachers = JSON.parse(JSON.stringify(INITIAL_DATASET.teachers));
      migrated = true;
    }
    (parsed.users || []).forEach((u) => {
      if (
        !u.cardName &&
        (u.role === "teacher" || u.role === "subject_teacher")
      ) {
        u.cardName = u.shortName;
        migrated = true;
      }
    });
    if (migrated) {
      storage.setItem(STORAGE_KEYS.DB, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error(
      "Ошибка чтения БД из хранилища, сброс к начальному состоянию",
      e,
    );
    const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
    storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
    return clone;
  }
}

/**
 * Сохраняет БД в хранилище (полная сериализация).
 * @param {Object} data БД мока
 */
export function saveDB(data) {
  try {
    storage.setItem(STORAGE_KEYS.DB, JSON.stringify(data));
  } catch (e) {
    console.error("Ошибка сохранения БД в хранилище", e);
  }
}

/**
 * Полный сброс БД к INITIAL_DATASET (без сессии и счётчика попыток).
 * @returns {Object} свежая копия начального датасета
 */
export function resetDB() {
  const clone = JSON.parse(JSON.stringify(INITIAL_DATASET));
  storage.setItem(STORAGE_KEYS.DB, JSON.stringify(clone));
  return clone;
}

/**
 * Возвращает текущую сессию или null, если пользователь не авторизован.
 * @returns {Object|null} { userId, username, role, loginAt }
 */
export function getSession() {
  try {
    const raw = storage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Сохраняет сессию в хранилище.
 * @param {Object} sessionData { userId, username, role, loginAt }
 */
export function setSession(sessionData) {
  storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
}

/** Удаляет сессию (выход из системы). */
export function clearSession() {
  storage.removeItem(STORAGE_KEYS.SESSION);
}

/**
 * Возвращает объект текущего пользователя по сессии. Очищает сессию,
 * если пользователь из сессии отсутствует в БД.
 * @returns {Object|null} пользователь с ролью и подписью роли
 */
export function getCurrentUser() {
  const session = getSession();
  if (!session || !session.userId) return null;

  const db = getDB();
  const user = db.users.find(
    (u) => u.id === session.userId || u.username === session.username,
  );
  if (!user) {
    clearSession();
    return null;
  }

  if (session.role && session.role !== user.role) {
    return {
      ...user,
      role: session.role,
      roleLabel: ROLE_LABELS[session.role] || user.roleLabel,
    };
  }
  return user;
}

/** Подписи ролей для отображения в интерфейсе. */
export const ROLE_LABELS = {
  teacher: "Классный руководитель",
  subject_teacher: "Учитель-предметник",
  parent: "Родитель",
  student: "Ученик",
  admin: "Администратор",
};

/**
 * Количество неудачных попыток входа для учётной записи.
 * @param {string} username
 * @returns {number}
 */
function getFailedAttempts(username) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const map = raw ? JSON.parse(raw) : {};
    return map[username] || 0;
  } catch {
    return 0;
  }
}

/**
 * Увеличивает счётчик неудачных попыток входа и возвращает новое значение.
 * @param {string} username
 * @returns {number}
 */
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

/**
 * Сбрасывает счётчик неудачных попыток входа (при успешном входе).
 * @param {string} username
 */
export function resetFailedAttempts(username) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    if (raw) {
      const map = JSON.parse(raw);
      delete map[username];
      storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Вход в систему: проверка логина и пароля, блокировка учётной записи
 * после 5 неудачных попыток, создание сессии при успехе.
 * @param {string} rawUsername Логин (электронная почта)
 * @param {string} password Пароль
 * @returns {Object} { success, user?, mustChangePassword?, error? }
 */
export function login(rawUsername, password) {
  const username = (rawUsername || "").trim();
  const pwd = (password || "").trim();

  if (!username || !pwd) {
    return { success: false, error: "Заполните все поля" };
  }

  const db = getDB();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );

  const failedCount = getFailedAttempts(username);
  if (failedCount >= 5 || (user && user.status === "blocked")) {
    if (user && user.status !== "blocked") {
      user.status = "blocked";
      saveDB(db);
    }
    return {
      success: false,
      error:
        "Учётная запись заблокирована из-за 5 неудачных попыток входа. Обратитесь к администратору.",
    };
  }

  if (!user || user.password !== pwd) {
    const newCount = incrementFailedAttempts(username);
    if (newCount >= 5 && user) {
      user.status = "blocked";
      saveDB(db);
      return {
        success: false,
        error:
          "Учётная запись заблокирована из-за 5 неудачных попыток входа. Обратитесь к администратору.",
      };
    }
    return {
      success: false,
      error: "Неверный логин или пароль",
    };
  }

  resetFailedAttempts(username);

  user.lastLoginAt = new Date().toISOString();
  saveDB(db);

  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString(),
  };
  setSession(session);

  return {
    success: true,
    user,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

/** Выход из системы: удаление сессии. */
export function logout() {
  clearSession();
}

/**
 * Демо-вход под первой активной учётной записью роли (переключатель ролей).
 * @param {string} roleKey Ключ роли (teacher, subject_teacher, parent, student, admin)
 * @returns {Object|null} пользователь или null, если активной учётки роли нет
 */
export function quickLoginAsRole(roleKey) {
  const db = getDB();
  const user = db.users.find(
    (u) => u.role === roleKey && u.status !== "blocked",
  );
  if (!user) return null;

  resetFailedAttempts(user.username);
  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString(),
  };
  setSession(session);
  return user;
}

/**
 * Смена пароля пользователем: проверка текущего пароля и требований к новому
 * (8+ символов, оба регистра, цифра, совпадение в поле подтверждения).
 * @param {string} userId ID пользователя
 * @param {string} currentPassword Текущий пароль
 * @param {string} newPassword Новый пароль
 * @param {string} confirmPassword Подтверждение нового пароля
 * @param {boolean} clearMustChange Сбросить флаг обязательной смены пароля
 * @returns {Object} { success, message?, error? }
 */
export function changePassword(
  userId,
  currentPassword,
  newPassword,
  confirmPassword,
  clearMustChange = false,
) {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: "Пользователь не найден" };
  }

  const curPwd = (currentPassword || "").trim();
  const newPwd = (newPassword || "").trim();
  const confPwd = (confirmPassword || "").trim();

  if (user.password !== curPwd) {
    return { success: false, error: "Текущий пароль указан неверно" };
  }

  if (!newPwd || newPwd.length < 8) {
    return {
      success: false,
      error: "Новый пароль должен содержать не менее 8 символов",
    };
  }

  const hasLower = /[a-zа-я]/.test(newPwd);
  const hasUpper = /[A-ZА-Я]/.test(newPwd);
  const hasDigit = /\d/.test(newPwd);

  if (!hasLower || !hasUpper || !hasDigit) {
    return {
      success: false,
      error:
        "Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру",
    };
  }

  if (newPwd !== confPwd) {
    return { success: false, error: "Пароли не совпадают" };
  }

  user.password = newPwd;
  if (clearMustChange) {
    user.mustChangePassword = false;
  }
  saveDB(db);

  return { success: true, message: "Пароль успешно изменён" };
}

/**
 * Проверка нового пароля на требования (длина, регистры, цифра).
 * @param {string} pwd
 * @returns {Object} { valid, error? }
 */
export function validateNewPassword(pwd) {
  if (!pwd || pwd.length < 8) {
    return {
      valid: false,
      error: "Пароль должен содержать не менее 8 символов",
    };
  }
  const hasLower = /[a-zа-я]/.test(pwd);
  const hasUpper = /[A-ZА-Я]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  if (!hasLower || !hasUpper || !hasDigit) {
    return {
      valid: false,
      error:
        "Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру",
    };
  }
  return { valid: true };
}

/**
 * Сокращение ФИО до формата «Фамилия И. О.».
 * @param {string} fullName Полное ФИО
 * @returns {string}
 */
export function shortenName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const initials = parts
    .slice(1)
    .map((p) => `${p[0]}.`)
    .join(" ");
  return `${parts[0]} ${initials}`;
}

export {
  updateAccountRole,
  getAccountCardRef,
  setAccountBinding,
  setAccountStatus,
  createAccount,
  resetAccountPassword,
} from "./accounts.js";
export {
  createTeacherCard,
  updateTeacherCard,
  deleteTeacherCard,
} from "./teachers.js";
export { getKnownClassIds, getClassDirectory } from "./directories.js";
export {
  getWorkloadRows,
  addWorkloadRow,
  updateWorkloadRow,
  removeWorkloadRow,
} from "./workload.js";
export {
  confirmAbsenceRecord,
  batchConfirmAbsences,
  getJournalComments,
  addJournalComment,
} from "./attendance-ops.js";
export {
  addParentContact,
  addStudentNote,
  addParent,
  updateParent,
  deleteParent,
  linkParentToStudent,
  unlinkParentFromStudent,
} from "./parents-ops.js";
export {
  getAcademicYears,
  getActiveAcademicYear,
  setActiveAcademicYear,
  addAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveQuarter,
  updateQuarter,
  setDemoToday,
  resetSchoolYearToP3,
  updateVacation,
  addVacation,
  deleteVacation,
} from "./school-year.js";
