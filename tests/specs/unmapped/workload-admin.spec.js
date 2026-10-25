import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage.js';
import { NavigationPage } from '../../page-objects/NavigationPage.js';

// ────────────────────────
// ВНЕ ТАБЛИЦЫ ТЕСТ-КЕЙСОВ
// ────────────────────────

async function openWorkloadAsAdmin(page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs('admin');
  await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
  await page.goto('workload');
  await expect(page.locator('h1')).toContainText('Нагрузка');
}

test.describe('Админ: страница «Нагрузка» (TC-WL, вне таблицы — перенести в таблицу тест-кейсов)', () => {

  test('[TC-WL-01] Матрица нагрузки: учитель × предмет × класс, часов в неделю', async ({ page }) => {
    await openWorkloadAsAdmin(page);

    const rows = page.locator('[data-workload-row]');
    await expect(rows).toHaveCount(11);

    const kozlovMath = rows.filter({ hasText: 'Козлов' }).filter({ hasText: 'Математика' }).first();
    await expect(kozlovMath).toContainText('7Б');
    await expect(kozlovMath).toContainText('5');

    await expect(page.locator('#workload-total-subtitle')).toContainText('часов в неделю');
  });

  test('[TC-WL-02] Назначение нагрузки: новая строка появляется в матрице', async ({ page }) => {
    await openWorkloadAsAdmin(page);
    const before = await page.locator('[data-workload-row]').count();

    await page.click('#btn-open-add-workload');
    await page.selectOption('#select-workload-teacher', 't-05');
    await page.selectOption('#select-workload-subject-modal', 'hist');
    await page.selectOption('#select-workload-class-modal', 'class-7v');
    await page.fill('#input-workload-hours', '4');
    await page.click('#btn-submit-workload');

    await expect(page.locator('#workload-toast-message')).toContainText('Нагрузка назначена');
    await expect(page.locator('[data-workload-row]')).toHaveCount(before + 1);

    const added = page.locator('[data-workload-row]').filter({ hasText: 'Новиков' }).filter({ hasText: 'История' }).first();
    await expect(added).toContainText('7В');
    await expect(added).toContainText('4');
  });

  test('[TC-WL-03] Изменение строки нагрузки: часы обновляются', async ({ page }) => {
    await openWorkloadAsAdmin(page);

    const row = page.locator('[data-workload-row]').filter({ hasText: 'Иванова' }).first();
    await row.locator('[data-action="edit-workload"]').click();
    await page.fill('#input-workload-hours', '8');
    await page.click('#btn-submit-workload');

    await expect(page.locator('#workload-toast-message')).toContainText('Нагрузка обновлена');
    const updated = page.locator('[data-workload-row]').filter({ hasText: 'Иванова' }).first();
    await expect(updated).toContainText('8');
  });

  test('[TC-WL-04] Снятие нагрузки: строка удаляется', async ({ page }) => {
    await openWorkloadAsAdmin(page);
    const before = await page.locator('[data-workload-row]').count();

    const row = page.locator('[data-workload-row]').filter({ hasText: 'Дмитриев' }).first();
    await row.locator('[data-action="remove-workload"]').click();

    await expect(page.locator('#workload-toast-message')).toContainText('Нагрузка снята');
    await expect(page.locator('[data-workload-row]')).toHaveCount(before - 1);
  });

  test('[TC-WL-05] Дубликат нагрузки (учитель × предмет × класс) отклоняется', async ({ page }) => {
    await openWorkloadAsAdmin(page);

    await page.click('#btn-open-add-workload');
    await page.selectOption('#select-workload-teacher', 't-04');
    await page.selectOption('#select-workload-subject-modal', 'phys');
    await page.selectOption('#select-workload-class-modal', 'class-7b');
    await page.fill('#input-workload-hours', '3');
    await page.click('#btn-submit-workload');

    await expect(page.locator('#workload-error')).toContainText('уже назначена');
  });

  test('[TC-WL-06] Поиск фильтрует строки без перерисовки страницы', async ({ page }) => {
    await openWorkloadAsAdmin(page);
    const before = await page.locator('[data-workload-row]').count();

    await page.click('#input-workload-search');
    await page.fill('#input-workload-search', 'Козлов');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-workload-row]')).toHaveCount(3);
    await expect(page).toHaveURL(/search=/);

    await expect(page.locator('#input-workload-search')).toBeFocused();

    await page.click('#btn-clear-workload-search');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-workload-row]')).toHaveCount(before);
    await expect(page.locator('#input-workload-search')).toBeFocused();
  });

});
