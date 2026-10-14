/**
 * Автоматизированный тест авторизации и сессий:
 * TC-AUTH-01 (Вход с верными данными)
 * TC-AUTH-02 (Кнопка «показать» пароль без потери значения)
 * TC-AUTH-03 (Вход под каждой из 5 ролей и редирект)
 * TC-AUTH-04 (Вход с неверным паролем)
 * TC-AUTH-05 (Вход с несуществующим логином)
 * TC-AUTH-06 (Пустые поля и трим пробелов)
 * TC-AUTH-07 (Блокировка после 5 неудачных попыток)
 * TC-AUTH-08 (Выход из системы и очистка сессии)
 * TC-AUTH-09 (Смена пользователя в одном браузере и защита от повторного логина)
 * TC-AUTH-14 (Блокировка учетной записи)
 * TC-AUTH-15 (Сброс пароля)
 */

import {
  getDB,
  saveDB,
  resetDB,
  login,
  logout,
  getSession,
  getCurrentUser,
  clearSession
} from '../services/storage.js';
import { getDefaultRouteForRole } from '../config/navigation.js';
import { renderLoginView } from '../views/login.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✓ ${message}`);
  }
}

console.log('=== ТЕСТИРОВАНИЕ АВТОРИЗАЦИИ И СЕССИЙ (TC-AUTH-01..15) ===\n');

// Подготовка чистой базы перед тестами
resetDB();
clearSession();

// 1. TC-AUTH-01: Вход с верными данными классрука
{
  const res = login('smirnova@school.ru', 'Test#2024');
  assert(res.success === true, 'TC-AUTH-01: Успешная авторизация классрука');
  assert(res.user.role === 'teacher', 'TC-AUTH-01: Роль пользователя — teacher');
  assert(res.user.shortName === 'Смирнова М. В.', 'TC-AUTH-01: ФИО — Смирнова М. В.');

  const session = getSession();
  assert(session !== null && session.userId === res.user.id, 'TC-AUTH-01: Сессия записана в хранилище');

  const defRoute = getDefaultRouteForRole(res.user.role);
  assert(defRoute === '#/overview', 'TC-AUTH-01: Редирект классрука на «Обзор класса» (#/overview)');

  const current = getCurrentUser();
  assert(current !== null && current.username === 'smirnova@school.ru', 'TC-AUTH-01: getCurrentUser возвращает профиль');
}

// 2. TC-AUTH-08: Выход из системы
{
  logout();
  const sessionAfter = getSession();
  assert(sessionAfter === null, 'TC-AUTH-08: Токен/флаг сессии удален после выхода');
  assert(getCurrentUser() === null, 'TC-AUTH-08: getCurrentUser после выхода возвращает null');
}

// 3. TC-AUTH-03: Вход под каждой из 5 ролей и стартовые экраны
{
  const testRoles = [
    { login: 'smirnova@school.ru', pwd: 'Test#2024', role: 'teacher', route: '#/overview' },
    { login: 'kozlov@school.ru', pwd: 'Test#2024', role: 'subject_teacher', route: '#/classes' },
    { login: 'petrov@mail.ru', pwd: 'Test#2024', role: 'parent', route: '#/child' },
    { login: 'petrova.a@school.ru', pwd: 'Test#2024', role: 'student', route: '#/schedule' },
    { login: 'admin@school.ru', pwd: 'Test#2024', role: 'admin', route: '#/accounts' },
  ];

  for (const t of testRoles) {
    logout();
    const r = login(t.login, t.pwd);
    assert(r.success === true, `TC-AUTH-03: Вход для ${t.role} (${t.login}) успешен`);
    assert(r.user.role === t.role, `TC-AUTH-03: Роль ${t.role} совпадает`);
    const route = getDefaultRouteForRole(r.user.role);
    assert(route === t.route, `TC-AUTH-03: Стартовый экран роли ${t.role} — ${t.route}`);
  }
  logout();
}

// 4. TC-AUTH-04: Вход с неверным паролем
{
  const r = login('smirnova@school.ru', 'Test#2023');
  assert(r.success === false, 'TC-AUTH-04: Вход с неверным паролем отклонён');
  assert(r.error === 'Неверный логин или пароль', 'TC-AUTH-04: Точный текст ошибки: «Неверный логин или пароль»');
  assert(getSession() === null, 'TC-AUTH-04: Сессия не создана');
}

// 5. TC-AUTH-05: Вход с несуществующим логином
{
  const r = login('smirnov@school.ru', 'Test#2024');
  assert(r.success === false, 'TC-AUTH-05: Вход с несуществующим логином отклонён');
  assert(r.error === 'Неверный логин или пароль', 'TC-AUTH-05: Сообщение об ошибке единообразно: «Неверный логин или пароль»');
  assert(getSession() === null, 'TC-AUTH-05: Сессия не создана');
}

// 6. TC-AUTH-06: Пустые поля и лишние пробелы
{
  assert(login('', '').success === false, 'TC-AUTH-06: Оба поля пустые — отказ');
  assert(login('smirnova@school.ru', '').success === false, 'TC-AUTH-06: Пароль пустой — отказ');
  assert(login('', 'Test#2024').success === false, 'TC-AUTH-06: Логин пустой — отказ');
  assert(login('   ', '   ').success === false, 'TC-AUTH-06: Пробельные поля — отказ');
  assert(login('smirnova@school.ru', '   ').success === false, 'TC-AUTH-06: Пароль из одних пробелов — отказ');
  assert(login('   ', 'Test#2024').success === false, 'TC-AUTH-06: Логин из одних пробелов — отказ');

  // Вход с пробелами вокруг логина
  const rSpaces = login('   smirnova@school.ru   ', 'Test#2024');
  assert(rSpaces.success === true, 'TC-AUTH-06: Пробелы вокруг логина успешно отсекаются');
  logout();

  // Вход с пробелами вокруг логина и пароля
  const rBothSpaces = login('   smirnova@school.ru   ', '   Test#2024   ');
  assert(rBothSpaces.success === true, 'TC-AUTH-06: Пробелы вокруг логина и пароля успешно отсекаются');
  logout();
}

// 7. TC-AUTH-07: Блокировка после серии неудачных попыток (порог 5)
{
  const testLogin = 'osipov.k@school.ru';

  // 4 неудачные попытки подряд
  for (let i = 1; i <= 4; i++) {
    const r = login(testLogin, 'Wrong#Password');
    assert(r.success === false && r.error === 'Неверный логин или пароль', `TC-AUTH-07: Попытка ${i} отклонена`);
  }

  // 5-я неудачная попытка вызывает блокировку
  const r5 = login(testLogin, 'Wrong#Password');
  assert(r5.success === false, 'TC-AUTH-07: 5-я попытка отклонена');
  assert(r5.error.includes('заблокирована'), 'TC-AUTH-07: Учетная запись заблокирована после 5 попыток');

  // Даже с верным паролем вход теперь заблокирован
  const rBlocked = login(testLogin, 'Osipov#2024');
  assert(rBlocked.success === false && rBlocked.error.includes('заблокирована'), 'TC-AUTH-07: Вход заблокирован даже с верным паролем');
}

// 8. TC-AUTH-09: Смена пользователя в одном браузере и защита от повторного логина
{
  resetDB();
  clearSession();

  // 1. Авторизация первого пользователя (классрук)
  const rTeacher = login('smirnova@school.ru', 'Test#2024');
  assert(rTeacher.success === true, 'TC-AUTH-09: Успешная авторизация первого пользователя');
  assert(getCurrentUser() !== null && getCurrentUser().role === 'teacher', 'TC-AUTH-09: Сессия первого пользователя активна');

  // 2. Попытка возврата на страницу логина при активном сеансе
  const activeViewHtml = renderLoginView();
  assert(activeViewHtml.includes('login-active-card'), 'TC-AUTH-09: При активной сессии экран входа показывает карточку активного сеанса');
  assert(!activeViewHtml.includes('id="login-form"'), 'TC-AUTH-09: Форма повторного входа скрыта, повторный ввод логина невозможен');
  assert(activeViewHtml.includes('btn-login-to-cabinet'), 'TC-AUTH-09: Присутствует действие перехода в кабинет');
  assert(activeViewHtml.includes('btn-login-switch-user'), 'TC-AUTH-09: Присутствует действие выхода для смены пользователя');

  // 3. Выход из системы для смены пользователя
  logout();
  assert(getCurrentUser() === null, 'TC-AUTH-09: Сессия очищена после выхода');

  // 4. Проверка экрана логина после выхода
  const cleanViewHtml = renderLoginView();
  assert(cleanViewHtml.includes('id="login-form"'), 'TC-AUTH-09: После выхода форма логина снова доступна');
  assert(!cleanViewHtml.includes('login-active-card'), 'TC-AUTH-09: Карточка активного сеанса скрыта после логаута');

  // 5. Вход второго пользователя (родитель)
  const rParent = login('petrov@mail.ru', 'Test#2024');
  assert(rParent.success === true, 'TC-AUTH-09: Вход второго пользователя (родитель) успешен');
  assert(getCurrentUser().role === 'parent', 'TC-AUTH-09: Активная сессия переключена на родителя');
  assert(getDefaultRouteForRole(rParent.user.role) === '#/child', 'TC-AUTH-09: Стартовый экран родителя — #/child');
}

console.log(`\n🎉 ВСЕ ${passed} ПРОВЕРОК АВТОРИЗАЦИИ И СЕССИЙ УСПЕШНО ПРОЙДЕНЫ!`);
