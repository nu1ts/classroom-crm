import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';

async function openSchoolYearAsAdmin(page) {
  await page.goto('index.html#/login');
  await page.evaluate(() => {
    try {
      localStorage.removeItem('classroom_crm_session');
    } catch (e) {}
  });
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs('admin');
  await page.waitForURL(/#\/accounts/, { timeout: 7000 });
  await page.goto('index.html#/school-year');
  await expect(page.locator('h1')).toContainText('Учебный год');
}

test.describe('Админ: страница «Учебный год» (TC-SY, настройки годов, четвертей и каникул)', () => {

  test('[TC-SY-01] Навигация: администратор переходит в «Учебный год» через меню', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/#\/accounts/, { timeout: 7000 });

    const menuLink = page.locator('#nav-school-year');
    await expect(menuLink).toBeVisible();
    await menuLink.click();

    await page.waitForURL(/#\/school-year/, { timeout: 7000 });
    await expect(page.locator('h1')).toContainText('Учебный год');
    await expect(page.locator('#school-year-view')).toBeVisible();
  });

  test('[TC-SY-02] Календарь: отображается текущий год 2024/2025, I четверть и ближайшие каникулы', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

    await expect(page.locator('#kpi-active-year-name')).toContainText('2024/2025');
    await expect(page.locator('#kpi-active-quarter-name')).toContainText('I четверть');
    await expect(page.locator('#kpi-active-quarter-dates')).toContainText('02.09.2024 – 25.10.2024');
    await expect(page.locator('#kpi-upcoming-vacation-name')).toContainText('Осенние каникулы');

const q1Row = page.locator('[data-quarter-row="q1_2024"]');
    await expect(q1Row).toBeVisible();
    await expect(q1Row.locator('.quarter-status')).toContainText('Текущая четверть');
    await expect(q1Row.locator('.quarter-dates')).toContainText('02.09.2024 – 25.10.2024');
  });

  test('[TC-SY-03] Смена текущей четверти: переключение на II четверть', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

    const q2Row = page.locator('[data-quarter-row="q2_2024"]');
    await expect(q2Row).toBeVisible();
    await q2Row.locator('[data-action="set-active-quarter"]').click();

    await expect(page.locator('#school-year-toast-message')).toContainText('Текущей четвертью назначена «II четверть»');
    await expect(page.locator('#kpi-active-quarter-name')).toContainText('II четверть');
    await expect(q2Row.locator('.quarter-status')).toContainText('Текущая четверть');

const q1Row = page.locator('[data-quarter-row="q1_2024"]');
    await q1Row.locator('[data-action="set-active-quarter"]').click();
    await expect(page.locator('#kpi-active-quarter-name')).toContainText('I четверть');
  });

  test('[TC-SY-04] Редактирование четверти: модальное окно и валидация дат', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

    const q1Row = page.locator('[data-quarter-row="q1_2024"]');
    await q1Row.locator('[data-action="edit-quarter"]').click();

    await expect(page.locator('#modal-edit-quarter')).toBeVisible();

await page.fill('#input-edit-quarter-start', '2024-11-01');
    await page.fill('#input-edit-quarter-end', '2024-10-01');
    await page.click('#btn-submit-edit-quarter');

    await expect(page.locator('#edit-quarter-error')).toBeVisible();
    await expect(page.locator('#edit-quarter-error')).toContainText('не может быть позже даты окончания');

await page.fill('#input-edit-quarter-start', '2024-09-02');
    await page.fill('#input-edit-quarter-end', '2024-10-25');
    await page.click('#btn-submit-edit-quarter');

    await expect(page.locator('#modal-edit-quarter')).toHaveClass(/opacity-0/);
    await expect(page.locator('#school-year-toast-message')).toContainText('Даты четверти «I четверть» обновлены');
  });

  test('[TC-SY-05] Добавление учебного года: модальное окно и проверка дубликатов', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

    await page.click('#btn-open-add-year');
    await expect(page.locator('#modal-add-year')).toBeVisible();

await page.fill('#input-add-year-name', '2024/2025');
    await page.fill('#input-add-year-start', '2024-09-01');
    await page.fill('#input-add-year-end', '2025-05-30');
    await page.click('#btn-submit-add-year');

    await expect(page.locator('#add-year-error')).toBeVisible();
    await expect(page.locator('#add-year-error')).toContainText('уже существует');

await page.fill('#input-add-year-name', '2025/2026');
    await page.fill('#input-add-year-start', '2025-09-01');
    await page.fill('#input-add-year-end', '2026-05-30');
    await page.click('#btn-submit-add-year');

    await expect(page.locator('#modal-add-year')).toHaveClass(/opacity-0/);
    await expect(page.locator('#school-year-toast-message')).toContainText('Учебный год «2025/2026» успешно создан');
    await expect(page.locator('[data-year-tab="ay-2025-2026"]')).toBeVisible();
  });

  test('[TC-SY-06] Защита от удаления активного учебного года и удаление неактивного года', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

await page.click('[data-year-tab="ay-2024-2025"]');
    await expect(page.locator('#btn-delete-year')).toBeHidden();

const prevYearTab = page.locator('[data-year-tab="ay-2023-2024"]');
    await expect(prevYearTab).toBeVisible();
    await prevYearTab.click();

    await expect(page.locator('#btn-delete-year')).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.click('#btn-delete-year');

    await expect(page.locator('#school-year-toast-message')).toContainText('удалён');
    await expect(page.locator('[data-year-tab="ay-2023-2024"]')).toBeHidden();
  });

  test('[TC-SY-07] Управление каникулами: добавление периода каникул', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

    await page.click('#btn-add-vacation');
    await expect(page.locator('#modal-edit-vacation')).toBeVisible();

    await page.fill('#input-edit-vacation-name', 'Зимние каникулы 2');
    await page.fill('#input-edit-vacation-start', '2025-02-17');
    await page.fill('#input-edit-vacation-end', '2025-02-23');
    await page.click('#btn-submit-edit-vacation');

    await expect(page.locator('#modal-edit-vacation')).toHaveClass(/opacity-0/);
    await expect(page.locator('#school-year-toast-message')).toContainText('Каникулы «Зимние каникулы 2» сохранены');
    await expect(page.locator('#vacations-grid')).toContainText('Зимние каникулы 2');
  });

  test('[TC-SY-08] UX модальных окон: закрытие по Escape и клику на фон (backdrop)', async ({ page }) => {
    await openSchoolYearAsAdmin(page);

await page.click('#btn-open-add-year');
    const modal = page.locator('#modal-add-year');
    await expect(modal).toHaveClass(/opacity-100/);

await page.keyboard.press('Escape');
    await expect(modal).toHaveClass(/opacity-0/);

await page.click('#btn-add-vacation');
    const vacModal = page.locator('#modal-edit-vacation');
    await expect(vacModal).toHaveClass(/opacity-100/);

await vacModal.click({ position: { x: 10, y: 10 } });
    await expect(vacModal).toHaveClass(/opacity-0/);
  });

});
