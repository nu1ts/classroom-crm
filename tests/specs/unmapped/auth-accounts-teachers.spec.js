// ВНЕ ТАБЛИЦЫ ТЕСТ-КЕЙСОВ — внести в таблицу вручную.
import { test, expect } from '../../fixtures/base-test.js';

test.describe('Недокументированные проверки: учётные записи и карточки учителей', () => {

  test.describe('Учётные записи: связывание с учётными карточками', () => {

    test('[TC-ACC-01] Привязка учётной записи к карточке ученика (Позитивный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

      await page.fill('#input-accounts-search', 'osipov.k@school.ru');
      const osipovRow = page.locator('#accounts-table-body tr', { hasText: 'Осипов' });
      await osipovRow.locator('[data-action="edit-account"]').click();

      await expect(page.locator('#select-edit-binding')).toHaveValue('st-12');
      await page.selectOption('#select-edit-binding', 'st-05');
      await page.click('#btn-submit-edit-account');

      await expect(page.locator('#accounts-toast-message')).toContainText('Привязка обновлена');
      await expect(osipovRow).toContainText('Ученик: Зайцев В.');
    });

    test('[TC-ACC-02] Отвязка учётной записи от учётной карточки (Позитивный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

      await page.fill('#input-accounts-search', 'osipov.k@school.ru');
      const osipovRow = page.locator('#accounts-table-body tr', { hasText: 'Осипов' });
      await osipovRow.locator('[data-action="edit-account"]').click();

      await page.click('#btn-unlink-account');
      await expect(page.locator('#select-edit-binding')).toHaveValue('');
      await page.click('#btn-submit-edit-account');

      await expect(osipovRow).toContainText('Без привязки');
    });

    test('[TC-ACC-03] Карточка не может быть привязана к двум учётным записям (Негативный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

      await page.fill('#input-accounts-search', 'osipov.k@school.ru');
      await page.locator('#accounts-table-body tr', { hasText: 'Осипов' }).locator('[data-action="edit-account"]').click();

      await page.selectOption('#select-edit-binding', 'st-23');
      await page.click('#btn-submit-edit-account');

      await expect(page.locator('#edit-account-error')).toBeVisible();
      await expect(page.locator('#edit-account-error')).toContainText('уже привязана к другой учётной записи');
      await expect(page.locator('#modal-edit-account')).toBeVisible();
    });

    test('[TC-ACC-04] Карточка учителя: привязка по умолчанию и смена (Правило)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

      await expect(page.locator('[data-account-row="user-smirnova"]')).toContainText('Учитель: Смирнова М. В.');
      await expect(page.locator('[data-account-row="user-kozlov"]')).toContainText('Учитель: Козлов А. П.');

      await page.locator('[data-account-row="user-kozlov"] [data-action="edit-account"]').click();
      await page.selectOption('#select-edit-binding', 'Иванова Е. С.');
      await page.click('#btn-submit-edit-account');
      await expect(page.locator('[data-account-row="user-kozlov"]')).toContainText('Учитель: Иванова Е. С.');

      await page.locator('[data-account-row="user-admin"] [data-action="edit-account"]').click();
      await expect(page.locator('#edit-binding-block')).toBeHidden();
      await page.locator('[data-action="close-edit-modal"]').first().click();
    });

  });

  test.describe('Учителя: карточка учителя', () => {

    test('[TC-UMT-01] Создание карточки учителя (Позитивный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
      await navigationPage.gotoRoute('/teachers');
      await expect(page.locator('h1')).toContainText('Учителя');

      await page.click('#btn-open-create-teacher');
      await page.fill('#input-teacher-name', 'Петров Сергей Ильич');
      await page.check('#teacher-subjects input[value="phys"]');
      await page.click('#btn-submit-teacher-card');

      await expect(page.locator('#teachers-toast-message')).toContainText('Карточка учителя создана');
      const card = page.locator('[data-teacher-card]', { hasText: 'Петров Сергей Ильич' });
      await expect(card).toBeVisible();
      await expect(card).toContainText('Физика');
      await expect(card).toContainText('0 ч');
    });

    test('[TC-UMT-02] Изменение карточки учителя (Позитивный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
      await navigationPage.gotoRoute('/teachers');
      await expect(page.locator('h1')).toContainText('Учителя');

      const card = page.locator('[data-teacher-card]', { hasText: 'Иванова Елена Сергеевна' });
      await card.locator('[data-action="edit-teacher"]').click();

      await expect(page.locator('#input-teacher-name')).toHaveValue('Иванова Елена Сергеевна');
      await page.fill('#input-teacher-name', 'Иванова Елена Сергеевна (нов.)');
      await page.selectOption('#select-teacher-status', 'archived');
      await page.click('#btn-submit-teacher-card');

      await expect(page.locator('#teachers-toast-message')).toContainText('Карточка учителя обновлена');
      const updated = page.locator('[data-teacher-card]', { hasText: 'Иванова Елена Сергеевна (нов.)' });
      await expect(updated).toBeVisible();
      await expect(updated).toContainText('В архиве');
    });

    test('[TC-UMT-03] Удаление карточки учителя без нагрузки и привязки (Позитивный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
      await navigationPage.gotoRoute('/teachers');
      await expect(page.locator('h1')).toContainText('Учителя');

      await page.click('#btn-open-create-teacher');
      await page.fill('#input-teacher-name', 'Временный Учитель');
      await page.check('#teacher-subjects input[value="pe"]');
      await page.click('#btn-submit-teacher-card');
      await expect(page.locator('[data-teacher-card]', { hasText: 'Временный Учитель' })).toBeVisible();

      await page.locator('[data-teacher-card]', { hasText: 'Временный Учитель' })
        .locator('[data-action="delete-teacher"]').click();

      await expect(page.locator('#teachers-toast-message')).toContainText('Карточка учителя удалена');
      await expect(page.locator('[data-teacher-card]', { hasText: 'Временный Учитель' })).toHaveCount(0);
    });

    test('[TC-UMT-04] Карточку с нагрузкой удалить нельзя (Негативный)', async ({ page, loginPage, navigationPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('admin');
      await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
      await navigationPage.gotoRoute('/teachers');
      await expect(page.locator('h1')).toContainText('Учителя');

      await page.locator('[data-teacher-card]', { hasText: 'Смирнова Марина Васильевна' })
        .locator('[data-action="delete-teacher"]').click();

      await expect(page.locator('#teachers-toast-message')).toContainText('Сначала снимите учебную нагрузку');
      await expect(page.locator('[data-teacher-card]', { hasText: 'Смирнова Марина Васильевна' })).toBeVisible();
    });

  });

});
