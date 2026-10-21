import { test, expect } from '../fixtures/base-test.js';
import { TEST_USERS } from '../config/test-users.js';

test.describe('Автотесты TC-AUTH и TC-RM: авторизация и ролевая модель', () => {

  test('[TC-AUTH-01] Вход в систему с верными данными (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();

    await expect(page.locator('#login-brand-logo')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Кабинет классного руководителя');
    await expect(page.locator('#login-card h2')).toContainText('Вход в систему');
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.togglePasswordBtn).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.forgotPasswordBtn).toBeVisible();

    await loginPage.login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);

    await page.waitForURL(/#\/overview/, { timeout: 7000 });
    await navigationPage.expectActiveMenuItem('nav-overview');
    await navigationPage.expectRoleSubtitle('Классный руководитель');
    await expect(page.locator('#app-sidebar')).toContainText('Смирнова М. В.');
  });

  test('[TC-AUTH-02] Кнопка «показать» у поля пароля (Позитивный)', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.passwordInput.fill(TEST_USERS.teacher.password);
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    await expect(loginPage.passwordInput).toHaveValue(TEST_USERS.teacher.password);

    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordInput).toHaveValue(TEST_USERS.teacher.password);

    await loginPage.emailInput.fill(TEST_USERS.teacher.username);
    await loginPage.submitButton.click();
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-AUTH-03] Вход под каждой из пяти ролей (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-attendance',
      'nav-schedule', 'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/#\/classes/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics']);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/#\/child/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-child', 'nav-schedule', 'nav-announcements', 'nav-profile'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-students', 'nav-analytics']);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('student');
    await page.waitForURL(/#\/schedule/, { timeout: 7000 });
    await navigationPage.expectReadOnlyBadge(true);
    await navigationPage.expectVisibleMenuItems([
      'nav-schedule', 'nav-grades', 'nav-announcements', 'nav-profile'
    ]);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-students', 'nav-meetings', 'nav-analytics']);
    await navigationPage.logout();
  });

  test('[TC-AUTH-04] Вход с неверным паролем (Негативный)', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.login(TEST_USERS.teacher.username, 'Test#2023');

    await loginPage.expectErrorMessage('Неверный логин или пароль');
    await expect(page).toHaveURL(/#\/login/);
    await expect(loginPage.emailInput).toHaveValue(TEST_USERS.teacher.username);
    await expect(loginPage.passwordInput).toHaveValue('');

    await loginPage.passwordInput.fill(TEST_USERS.teacher.password);
    await loginPage.submitButton.click();
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-AUTH-05] Вход с несуществующим логином (Негативный)', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.login('smirnov@school.ru', 'Test#2024');

    await loginPage.expectErrorMessage('Неверный логин или пароль');
    await expect(page).toHaveURL(/#\/login/);
  });

  test('[TC-AUTH-06] Пустые поля и лишние пробелы (Негативный)', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.submitButton.click();
    await loginPage.expectErrorMessage(/Заполните/);

    await loginPage.emailInput.fill(TEST_USERS.teacher.username);
    await loginPage.passwordInput.fill('');
    await loginPage.submitButton.click();
    await loginPage.expectErrorMessage(/Заполните/);

    await loginPage.emailInput.fill(`  ${TEST_USERS.teacher.username}  `);
    await loginPage.passwordInput.fill(TEST_USERS.teacher.password);
    await loginPage.submitButton.click();

    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-AUTH-07] Блокировка после серии неудачных попыток (Граничный)', async ({ page, loginPage }) => {
    await loginPage.goto();
    const testUsername = TEST_USERS.osipov.username;

    for (let i = 1; i <= 4; i++) {
      await loginPage.emailInput.fill(testUsername);
      await loginPage.passwordInput.fill('WrongPass123');
      await loginPage.submitButton.click();
      await loginPage.expectErrorMessage('Неверный логин или пароль');
    }

    await loginPage.emailInput.fill(testUsername);
    await loginPage.passwordInput.fill('WrongPass123');
    await loginPage.submitButton.click();
    await loginPage.expectErrorMessage('Учётная запись заблокирована из-за 5 неудачных попыток входа');

    await loginPage.emailInput.fill(testUsername);
    await loginPage.passwordInput.fill(TEST_USERS.osipov.password);
    await loginPage.submitButton.click();
    await loginPage.expectErrorMessage('Учётная запись заблокирована из-за 5 неудачных попыток входа');
  });

  test('[TC-AUTH-08] Выход из системы (Позитивный)', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
    await profilePage.goto();

    await profilePage.logout();

    await expect(page).toHaveURL(/#\/login/);
    await expect(loginPage.submitButton).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/#\/login/);
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page.locator('#app-sidebar')).toHaveCount(0);
  });

  test('[TC-AUTH-09] Смена пользователя в одном браузере (Правило)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('#app-content')).toContainText('28');

    await navigationPage.logout();

    await loginPage.loginAs('parent');
    await page.waitForURL(/#\/child/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/overview');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await page.goBack();
    await expect(page.locator('h2')).toContainText('Доступ ограничен');
  });

  test('[TC-AUTH-10] Смена пароля: успешная (Позитивный)', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Novy#2025');

    await profilePage.expectPasswordSuccess('Пароль успешно изменён');
  });

  test('[TC-AUTH-11] Смена пароля: неверный текущий пароль (Негативный)', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword('Test#2025', 'Novy#2025', 'Novy#2025');
    await profilePage.expectPasswordError('Текущий пароль указан неверно');

    await profilePage.logout();
    await loginPage.login(TEST_USERS.teacher.username, 'Novy#2025');
    await loginPage.expectErrorMessage('Неверный логин или пароль');

    await loginPage.login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-AUTH-12] Смена пароля: требования к новому паролю (Граничный)', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Short1', 'Short1');
    await profilePage.expectPasswordError('Новый пароль должен содержать не менее 8 символов');

    await profilePage.changePassword(TEST_USERS.teacher.password, 'passwordlower', 'passwordlower');
    await profilePage.expectPasswordError('Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру');

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Different#2025');
    await profilePage.expectPasswordError('Пароли не совпадают');
  });

  test('[TC-AUTH-13] После смены пароля старый не работает (Правило)', async ({ page, loginPage, profilePage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await profilePage.goto();
    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Novy#2025');
    await profilePage.expectPasswordSuccess();

    await profilePage.logout();

    await loginPage.login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);
    await loginPage.expectErrorMessage('Неверный логин или пароль');

    await loginPage.passwordInput.fill('Novy#2025');
    await loginPage.submitButton.click();
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-AUTH-14] Заблокированная учётная запись (Негативный)', async ({ page, loginPage, navigationPage }) => {
    const osipov = { username: 'osipov.k@school.ru', name: 'Осипов' };

    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });

    await page.fill('#input-accounts-search', osipov.username);
    const osipovRow = page.locator('#accounts-table-body tr', { hasText: osipov.name });
    await expect(osipovRow).toContainText('Активен');
    await osipovRow.locator('[data-action="toggle-status"][data-next-status="blocked"]').click();
    await expect(osipovRow).toContainText('Заблокирован');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.login(osipov.username, 'Osipov#2024');
    await loginPage.expectErrorMessage('заблокирована');

    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });
    await page.fill('#input-accounts-search', osipov.username);
    await osipovRow.locator('[data-action="toggle-status"][data-next-status="active"]').click();
    await expect(osipovRow).toContainText('Активен');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.login(osipov.username, 'Osipov#2024');
    await page.waitForURL(/#\/schedule/, { timeout: 7000 });
  });

  test('[TC-AUTH-15] Самостоятельный сброс пароля недоступен (Негативный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();

    await loginPage.openForgotPasswordModal();

    await expect(page.locator('#modal-forgot-password')).toContainText(/обратитесь к администратору/i);
    await expect(page.locator('#modal-forgot-password input[type="email"]')).toHaveCount(0);

    await loginPage.closeForgotPasswordModal();

    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });
    await page.fill('#input-accounts-search', TEST_USERS.teacher.username);
    const teacherRow = page.locator('#accounts-table-body tr', { hasText: 'Смирнова' });
    await teacherRow.locator('[data-action="edit-account"]').click();
    await page.click('#btn-reset-account-password');
    const resetBox = page.locator('#reset-password-result');
    await expect(resetBox).toBeVisible();
    const resetText = await resetBox.textContent();
    const tempPassword = resetText.match(/Temp#\d{6}/)?.[0];
    expect(tempPassword, 'временный пароль должен отображаться администратору').toBeTruthy();
    await page.locator('[data-action="close-edit-modal"]').first().click();
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.login(TEST_USERS.teacher.username, tempPassword);
    await page.waitForURL(/#\/change-password/, { timeout: 7000 });

    await page.fill('#cp-current', tempPassword);
    await page.fill('#cp-new', TEST_USERS.teacher.password);
    await page.fill('#cp-confirm', TEST_USERS.teacher.password);
    await page.click('#btn-cp-submit');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });
  });

  test('[TC-RM-01] Навигация администратора (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-meetings', 'nav-analytics'
    ]);
  });

  test('[TC-RM-02] Навигация классного руководителя (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-attendance',
      'nav-schedule', 'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);
  });

  test('[TC-RM-03] Навигация учителя-предметника (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/#\/classes/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);
  });

  test('[TC-RM-04] Навигация родителя (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/#\/child/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-child', 'nav-schedule', 'nav-announcements', 'nav-profile'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-journal', 'nav-parents', 'nav-analytics', 'nav-students'
    ]);
  });

  test('[TC-RM-05] Навигация ученика (Позитивный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('student');
    await page.waitForURL(/#\/schedule/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-schedule', 'nav-grades', 'nav-announcements', 'nav-profile'
    ]);

    await navigationPage.expectReadOnlyBadge(true);
  });

  test.skip('[TC-RM-06] Недоступные действия скрыты и отклоняются сервером (Негативный)', async () => {
    // TODO: Будет реализовано после внедрения интерфейса редактирования оценок в «Журнале»,
    // карточки ученика и действий над учениками под разными ролями.
  });

  test('[TC-RM-07] Прямой доступ к разделам администратора (Негативный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/accounts');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/directories');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.logout();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/#\/classes/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/accounts');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');
  });

  test('[TC-RM-08] Прямой доступ к разделам класса (Негативный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/#\/child/, { timeout: 7000 });

    for (const route of ['#/journal', '#/students', '#/parents', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }

    await navigationPage.logout();
    await loginPage.loginAs('student');
    await page.waitForURL(/#\/schedule/, { timeout: 7000 });

    for (const route of ['#/journal', '#/students', '#/parents', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }
  });

  test.skip('[TC-RM-09] Доступ только к своему классу (Негативный)', async () => {
    // TODO: Будет реализовано после добавления параллельных классов (8А, 9В) в интерфейсе системы.
  });

  test('[TC-RM-10] Администратор не работает с журналом и собраниями (Негативный)', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });

    for (const route of ['#/journal', '#/attendance', '#/meetings', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }

    await navigationPage.gotoRoute('#/teachers');
    await expect(page.locator('h2')).toContainText('Учителя');
  });

  test.skip('[TC-RM-11] Предметник видит только свои классы и предметы (Правило)', async () => {
    // TODO: Будет реализовано после разработки UI страниц «Мои классы», расписания по предметам и журнала по предметам.
  });

  test.skip('[TC-RM-12] Отказ не раскрывает лишних сведений (Негативный)', async () => {
    // TODO: Будет реализовано после создания карточек других учеников и унификации сообщений об ограничении доступа.
  });

  test('[TC-RM-13] Профиль показывает роль и привязку без права правки (Правило)', async ({ page, loginPage, profilePage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/overview/, { timeout: 7000 });

    await profilePage.goto();

    await expect(profilePage.nameInput).toHaveValue(/Смирнова/);
    await expect(profilePage.roleInput).toHaveValue('Классный руководитель');
    await expect(profilePage.bindingInput).toHaveValue('7Б');

    await profilePage.langSelect.selectOption('en');
    await navigationPage.expectVisibleMenuItems(['nav-overview', 'nav-students']);
    await profilePage.langSelect.selectOption('ru');

    await expect(profilePage.roleInput).toHaveAttribute('readonly', '');
    await expect(profilePage.bindingInput).toHaveAttribute('readonly', '');

    await navigationPage.logout();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });
    await page.fill('#input-accounts-search', TEST_USERS.teacher.username);
    const teacherRow = page.locator('#accounts-table-body tr', { hasText: 'Смирнова' });
    await teacherRow.locator('[data-action="edit-account"]').click();
    await page.selectOption('#select-edit-role', 'subject_teacher');
    await page.click('#btn-submit-edit-account');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.loginAs('teacher');
    await page.waitForURL(/#\/classes/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems(['nav-classes', 'nav-profile']);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-analytics']);

    await navigationPage.logout();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });
    await page.fill('#input-accounts-search', TEST_USERS.teacher.username);
    await teacherRow.locator('[data-action="edit-account"]').click();
    await page.selectOption('#select-edit-role', 'teacher');
    await page.click('#btn-submit-edit-account');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();
  });

});
