// ВНЕ ТАБЛИЦЫ ТЕСТ-КЕЙСОВ — служебная проверка стенда.
import { test, expect } from '../../fixtures/base-test.js';
import { TEST_USERS } from '../../config/test-users.js';

test.describe('[AT] Стенд Playwright: конфиг, webServer и фикстуры', () => {

  test('Сервер и референсный сайт доступны, фикстура корректно пересидирует localStorage перед спеком', async ({ page, loginPage }) => {
    await loginPage.goto();

    await expect(page).toHaveTitle(/Classroom CRM|Кабинет классного руководителя/);

    const dbRaw = await page.evaluate(() => window.localStorage.getItem('classroom_crm_db'));
    expect(dbRaw).not.toBeNull();
    const db = JSON.parse(dbRaw);
    expect(db.meta?.className).toBe('7Б');
    expect(db.meta?.teacher).toBe('Смирнова М. В.');

    const sessionRaw = await page.evaluate(() => window.localStorage.getItem('classroom_crm_session'));
    expect(sessionRaw).toBeNull();

    const attemptsRaw = await page.evaluate(() => window.localStorage.getItem('classroom_crm_failed_attempts'));
    expect(attemptsRaw).toBeNull();
  });

});
