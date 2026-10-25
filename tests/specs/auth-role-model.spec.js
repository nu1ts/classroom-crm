import { test, expect } from '../fixtures/base-test.js';
import { TEST_USERS } from '../config/test-users.js';

test.describe('Автотесты TC-AUTH и TC-RM: авторизация и ролевая модель', () => {

  test('[TC-AUTH-01] Вход в систему с верными данными', async ({ page, loginPage, navigationPage }) => {
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

    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
    await navigationPage.expectActiveMenuItem('nav-overview');
    await navigationPage.expectRoleSubtitle('Классный руководитель');
    await expect(page.locator('#app-sidebar')).toContainText('Смирнова М. В.');
  });

  test('[TC-AUTH-02] Кнопка «показать» у поля пароля', async ({ page, loginPage }) => {
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
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-03] Вход под каждой из пяти ролей', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-attendance',
      'nav-schedule', 'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/\/classes\/?/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics']);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-child', 'nav-schedule', 'nav-announcements', 'nav-profile'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-students', 'nav-analytics']);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('student');
    await page.waitForURL(/\/schedule\/?/, { timeout: 7000 });
    await navigationPage.expectReadOnlyBadge(true);
    await navigationPage.expectVisibleMenuItems([
      'nav-schedule', 'nav-grades', 'nav-announcements', 'nav-profile'
    ]);
    await navigationPage.logout();

    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-students', 'nav-meetings', 'nav-analytics']);
    await navigationPage.logout();
  });

  test('[TC-AUTH-04] Вход с неверным паролем', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.login(TEST_USERS.teacher.username, 'Test#2023');

    await loginPage.expectErrorMessage('Неверный логин или пароль');
    await expect(page).toHaveURL(/\/login\/?/);
    await expect(loginPage.emailInput).toHaveValue(TEST_USERS.teacher.username);
    await expect(loginPage.passwordInput).toHaveValue('');

    await loginPage.passwordInput.fill(TEST_USERS.teacher.password);
    await loginPage.submitButton.click();
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-05] Вход с несуществующим логином', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.login('smirnov@school.ru', 'Test#2024');

    await loginPage.expectErrorMessage('Неверный логин или пароль');
    await expect(page).toHaveURL(/\/login\/?/);
  });

  test('[TC-AUTH-06] Пустые поля и лишние пробелы', async ({ page, loginPage }) => {
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

    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-07] Блокировка после серии неудачных попыток', async ({ page, loginPage }) => {
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

  test('[TC-AUTH-08] Выход из системы', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
    await profilePage.goto();

    await profilePage.logout();

    await expect(page).toHaveURL(/\/login\/?/);
    await expect(loginPage.submitButton).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login\/?/);
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page.locator('#app-sidebar')).toHaveCount(0);
  });

  test('[TC-AUTH-09] Смена пользователя в одном браузере', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('#app-content')).toContainText('28');

    await navigationPage.logout();

    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/overview');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await page.goBack();
    await expect(page.locator('h2')).toContainText('Доступ ограничен');
  });

  test('[TC-AUTH-10] Смена пароля: успешная', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Novy#2025');

    await profilePage.expectPasswordSuccess('Пароль успешно изменён');
  });

  test('[TC-AUTH-11] Смена пароля: неверный текущий пароль', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword('Test#2025', 'Novy#2025', 'Novy#2025');
    await profilePage.expectPasswordError('Текущий пароль указан неверно');

    await profilePage.logout();
    await loginPage.login(TEST_USERS.teacher.username, 'Novy#2025');
    await loginPage.expectErrorMessage('Неверный логин или пароль');

    await loginPage.login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-12] Смена пароля: требования к новому паролю', async ({ page, loginPage, profilePage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await profilePage.goto();

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Short1', 'Short1');
    await profilePage.expectPasswordError('Новый пароль должен содержать не менее 8 символов');

    await profilePage.changePassword(TEST_USERS.teacher.password, 'passwordlower', 'passwordlower');
    await profilePage.expectPasswordError('Пароль должен содержать буквы в обоих регистрах и хотя бы одну цифру');

    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Different#2025');
    await profilePage.expectPasswordError('Пароли не совпадают');
  });

  test('[TC-AUTH-13] После смены пароля старый не работает', async ({ page, loginPage, profilePage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await profilePage.goto();
    await profilePage.changePassword(TEST_USERS.teacher.password, 'Novy#2025', 'Novy#2025');
    await profilePage.expectPasswordSuccess();

    await profilePage.logout();

    await loginPage.login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);
    await loginPage.expectErrorMessage('Неверный логин или пароль');

    await loginPage.passwordInput.fill('Novy#2025');
    await loginPage.submitButton.click();
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-14] Заблокированная учётная запись', async ({ page, loginPage, navigationPage }) => {
    const osipov = { username: 'osipov.k@school.ru', name: 'Осипов' };

    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

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
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
    await page.fill('#input-accounts-search', osipov.username);
    await osipovRow.locator('[data-action="toggle-status"][data-next-status="active"]').click();
    await expect(osipovRow).toContainText('Активен');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.login(osipov.username, 'Osipov#2024');
    await page.waitForURL(/\/schedule\/?/, { timeout: 7000 });
  });

  test('[TC-AUTH-15] Самостоятельный сброс пароля недоступен', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();

    await loginPage.openForgotPasswordModal();

    await expect(page.locator('#modal-forgot-password')).toContainText(/обратитесь к администратору/i);
    await expect(page.locator('#modal-forgot-password input[type="email"]')).toHaveCount(0);

    await loginPage.closeForgotPasswordModal();

    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
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
    await page.waitForURL(/\/change-password\/?/, { timeout: 7000 });

    await page.fill('#cp-current', tempPassword);
    await page.fill('#cp-new', TEST_USERS.teacher.password);
    await page.fill('#cp-confirm', TEST_USERS.teacher.password);
    await page.click('#btn-cp-submit');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
  });

  test('[TC-RM-01] Навигация администратора', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-meetings', 'nav-analytics'
    ]);
  });

  test('[TC-RM-02] Навигация классного руководителя', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-overview', 'nav-students', 'nav-journal', 'nav-attendance',
      'nav-schedule', 'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-accounts', 'nav-teachers', 'nav-directories', 'nav-workload', 'nav-school-year'
    ]);
  });

  test('[TC-RM-03] Навигация учителя-предметника', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/\/classes\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-parents', 'nav-meetings', 'nav-announcements', 'nav-analytics'
    ]);
  });

  test('[TC-RM-04] Навигация родителя', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-child', 'nav-schedule', 'nav-announcements', 'nav-profile'
    ]);

    await navigationPage.expectHiddenMenuItems([
      'nav-journal', 'nav-parents', 'nav-analytics', 'nav-students'
    ]);
  });

  test('[TC-RM-05] Навигация ученика', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('student');
    await page.waitForURL(/\/schedule\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems([
      'nav-schedule', 'nav-grades', 'nav-announcements', 'nav-profile'
    ]);
    await navigationPage.expectHiddenMenuItems([
      'nav-journal', 'nav-parents', 'nav-analytics', 'nav-students', 'nav-attendance', 'nav-overview'
    ]);

    await navigationPage.expectReadOnlyBadge(true);
    await expect(page.locator('#btn-open-create-lesson')).toHaveCount(0);

    await page.locator('#nav-grades').click();
    await page.waitForURL(/\/grades\/?/, { timeout: 7000 });
    await expect(page.locator('h1')).toContainText('Мои оценки');
    await expect(page.locator('#badge-readonly')).toBeVisible();
    await expect(page.locator('#badge-readonly')).toContainText('Только для просмотра');
    await expect(page.locator('#kpi-average-grade')).toBeVisible();
    await expect(page.locator('#kpi-attendance-rate')).toBeVisible();
    await expect(page.locator('button:has-text("Выставить")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Изменить")')).toHaveCount(0);

    await page.locator('#nav-announcements').click();
    await page.waitForURL(/\/announcements\/?/, { timeout: 7000 });
    await expect(page.locator('#btn-open-create-announcement')).toHaveCount(0);

    await page.locator('#nav-profile').click();
    await page.waitForURL(/\/profile\/?/, { timeout: 7000 });
    await expect(page.locator('label:has-text("Роль в системе") + input')).toHaveAttribute('readonly', '');
  });

  test('[TC-RM-06] Недоступные действия скрыты и отклоняются сервером', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });
    await navigationPage.clickMenuItem('nav-journal');
    await page.waitForURL(/\/journal\/?/, { timeout: 7000 });

    const cell = page.locator('td.cell-journal-entry').first();
    await expect(cell).toBeVisible({ timeout: 5000 });
    await cell.click();

    const entryModal = page.locator('#modal-journal-entry');
    await expect(entryModal).toBeVisible();

    await expect(page.locator('#btn-send-journal-comment')).toBeVisible();
    await expect(page.locator('#btn-save-grade')).toHaveCount(0);
    await expect(page.locator('#btn-delete-grade')).toHaveCount(0);
    await expect(page.locator('input.grade-input')).toHaveCount(0);

    const teacherDirectCall = await page.evaluate(() => {
      return window.crmApi.saveGradeRecord({ lessonId: 'les-7b-alg-01', studentId: 'st-01', value: 5 });
    });
    expect(teacherDirectCall.success).toBe(false);

    const closeBtn = page.locator('#btn-close-journal-modal');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    await navigationPage.logout();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    await expect(page.locator('button:has-text("Выставить")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Изменить оценку")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Редактировать")')).toHaveCount(0);

    const parentDirectCall = await page.evaluate(() => {
      return window.crmApi.saveGradeRecord({ lessonId: 'les-7b-alg-01', studentId: 'st-01', value: 4 });
    });
    expect(parentDirectCall.success).toBe(false);

    await navigationPage.logout();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');
  });

  test('[TC-RM-07] Прямой доступ к разделам администратора', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/accounts');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/directories');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.logout();
    await loginPage.loginAs('subject_teacher');
    await page.waitForURL(/\/classes\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/accounts');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');
  });

  test('[TC-RM-08] Прямой доступ к разделам класса', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    for (const route of ['#/journal', '#/students', '#/parents', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }

    await navigationPage.logout();
    await loginPage.loginAs('student');
    await page.waitForURL(/\/schedule\/?/, { timeout: 7000 });

    for (const route of ['#/journal', '#/students', '#/parents', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }
  });

  test('[TC-RM-09] Доступ только к своему классу', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('#students-counter-label')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#students-counter-label')).toContainText('28');

    await navigationPage.gotoRoute('#/students?class=8A');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/analytics?class=8A');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/students?class=9В');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/analytics?class=9В');
    await expect(page.locator('h2')).toContainText('Доступ ограничен');

    await navigationPage.gotoRoute('#/students');
    await expect(page.locator('#students-counter-label')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#students-counter-label')).toContainText('28');
  });

  test('[TC-RM-10] Администратор не работает с журналом и собраниями', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

    for (const route of ['#/journal', '#/attendance', '#/meetings', '#/analytics']) {
      await navigationPage.gotoRoute(route);
      await expect(page.locator('h2')).toContainText('Доступ ограничен');
    }

    await navigationPage.gotoRoute('#/teachers');
    await expect(page.locator('h1')).toContainText('Учителя');
    await expect(page.locator('[data-teacher-card]')).toHaveCount(5);
  });

  test('[TC-RM-11] Предметник видит только свои классы и предметы', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.subject_teacher.username, TEST_USERS.subject_teacher.password);
    await page.waitForURL(/\/classes\/?/, { timeout: 7000 });

    await navigationPage.expectVisibleMenuItems(['nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile']);
    await navigationPage.expectHiddenMenuItems(['nav-overview', 'nav-journal', 'nav-students', 'nav-parents', 'nav-analytics']);

    await expect(page.locator('h1')).toContainText('Мои классы');
    const classCards = page.locator('[data-class-card]');
    await expect(classCards).toHaveCount(3);

    await expect(page.locator('[data-class-card="7Б"]')).toBeVisible();
    await expect(page.locator('[data-class-card="7Б"]')).toContainText('5 ч / нед');
    await expect(page.locator('[data-class-card="7Б"]')).toContainText(/Математика/i);

    await expect(page.locator('[data-class-card="8А"]')).toBeVisible();
    await expect(page.locator('[data-class-card="8А"]')).toContainText('5 ч / нед');
    await expect(page.locator('[data-class-card="8А"]')).toContainText(/Математика/i);

    await expect(page.locator('[data-class-card="9В"]')).toBeVisible();
    await expect(page.locator('[data-class-card="9В"]')).toContainText('3 ч / нед');
    await expect(page.locator('[data-class-card="9В"]')).toContainText(/Алгебра/i);

    await expect(page.locator('[data-class-card="7В"]')).toHaveCount(0);

    const journalBtn7b = page.locator('[data-class-card="7Б"] [data-action="open-journal"]');
    await journalBtn7b.click();
    await page.waitForURL(/\/journal.*class=class-7b.*subject=math/, { timeout: 7000 });
    await expect(page.locator('h1')).toContainText(/Журнал класса 7Б/);

    await page.goto('journal?class=class-7b&subject=phys');
    await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);

    await page.goto('journal?class=class-7b&subject=rus');
    await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);

    await page.goto('journal?class=class-6v&subject=math');
    await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);

    await page.goto('attendance?class=class-7v');
    await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);

    await page.goto('attendance?class=class-7b');
    await expect(page.locator('h2')).toContainText(/Журнал посещаемости 7Б/i);
    await expect(page.locator('#select-attendance-class option')).toHaveText([
      /7Б/i,
      /8А/i,
      /9В/i,
    ]);
  });

  test('[TC-RM-12] Отказ не раскрывает лишних сведений', async ({ page, loginPage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    await page.goto('child?id=st-14');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=У вас нет прав для просмотра данного раздела или объекта системы')).toBeVisible();
    await expect(page.locator('#app-content').locator('text=Сидоров')).toHaveCount(0);
    await expect(page.locator('#child-grades-table')).toHaveCount(0);

    await page.goto('child?id=nonexistent-999');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=У вас нет прав для просмотра данного раздела или объекта системы')).toBeVisible();
    await expect(page.locator('#child-grades-table')).toHaveCount(0);

    await navigationPage.logout();
    await loginPage.loginAs('student');
    await page.waitForURL(/\/schedule\/?/, { timeout: 7000 });

    await page.goto('student?id=st-14');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=У вас нет прав для просмотра данного раздела или объекта системы')).toBeVisible();

    await page.goto('grades?id=st-14');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=У вас нет прав для просмотра данного раздела или объекта системы')).toBeVisible();
    await expect(page.locator('#grades-table')).toHaveCount(0);

    await page.goto('grades?id=nonexistent-999');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=У вас нет прав для просмотра данного раздела или объекта системы')).toBeVisible();
    await expect(page.locator('#grades-table')).toHaveCount(0);
  });

  test('[TC-RM-13] Профиль показывает роль и привязку без права правки', async ({ page, loginPage, profilePage, navigationPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/overview\/?/, { timeout: 7000 });

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
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
    await page.fill('#input-accounts-search', TEST_USERS.teacher.username);
    const teacherRow = page.locator('#accounts-table-body tr', { hasText: 'Смирнова' });
    await teacherRow.locator('[data-action="edit-account"]').click();
    await page.selectOption('#select-edit-role', 'subject_teacher');
    await page.click('#btn-submit-edit-account');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();

    await loginPage.loginAs('teacher');
    await page.waitForURL(/\/classes\/?/, { timeout: 7000 });
    await navigationPage.expectVisibleMenuItems(['nav-classes', 'nav-profile']);
    await navigationPage.expectHiddenMenuItems(['nav-journal', 'nav-analytics']);

    await navigationPage.logout();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
    await page.fill('#input-accounts-search', TEST_USERS.teacher.username);
    await teacherRow.locator('[data-action="edit-account"]').click();
    await page.selectOption('#select-edit-role', 'teacher');
    await page.click('#btn-submit-edit-account');
    await page.fill('#input-accounts-search', '');
    await navigationPage.logout();
  });

});
