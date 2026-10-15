import { test as baseTest, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { ProfilePage } from '../page-objects/ProfilePage.js';
import { TableHelper } from '../helpers/table-helper.js';
import { MetricsHelper } from '../helpers/metrics-helper.js';
import { TEST_USERS } from '../config/test-users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../../src/mock/dataset.json');
const INITIAL_DATASET = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

/**
 * Базовый тест с фикстурами сброса мок-состояния и Page Objects
 */
export const test = baseTest.extend({
  /**
   * Фикстура страницы с автоматическим пересидированием localStorage перед КАЖДЫМ спеком
   */
  page: async ({ page }, use) => {
    await page.addInitScript(({ dataset }) => {
      try {
        window.localStorage.setItem('classroom_crm_db', JSON.stringify(dataset));
        window.localStorage.removeItem('classroom_crm_session');
        window.localStorage.removeItem('classroom_crm_failed_attempts');
      } catch (err) {
        console.error('Ошибка сидирования localStorage в фикстуре теста:', err);
      }
    }, { dataset: INITIAL_DATASET });

    await use(page);
  },

  /**
   * Функция принудительного сброса состояния мока в рантайме
   */
  resetStorage: async ({ page }, use) => {
    const reset = async () => {
      await page.evaluate(({ dataset }) => {
        window.localStorage.setItem('classroom_crm_db', JSON.stringify(dataset));
        window.localStorage.removeItem('classroom_crm_session');
        window.localStorage.removeItem('classroom_crm_failed_attempts');
      }, { dataset: INITIAL_DATASET });
    };
    await use(reset);
  },

  /**
   * Быстрое сидирование сессии под конкретной ролью без ручного ввода формы
   */
  seedUserSession: async ({ page }, use) => {
    const seed = async (roleKey) => {
      const user = TEST_USERS[roleKey];
      if (!user) throw new Error(`Неизвестная роль: ${roleKey}`);
      await page.addInitScript(({ u }) => {
        window.localStorage.setItem('classroom_crm_session', JSON.stringify({
          userId: u.username,
          username: u.username,
          role: u.role,
          roleLabel: u.roleLabel,
          personName: u.name,
          shortName: u.shortName,
          loginAt: new Date().toISOString()
        }));
      }, { u: user });
    };
    await use(seed);
  },

  /**
   * Page Object страницы авторизации
   */
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  /**
   * Page Object навигации и сайдбара
   */
  navigationPage: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },

  /**
   * Хелпер для проверок таблиц
   */
  tableHelper: async ({ page }, use) => {
    await use(new TableHelper(page));
  },

  /**
   * Хелпер для проверок метрик и KPI
   */
  metricsHelper: async ({ page }, use) => {
    await use(new MetricsHelper(page));
  },

  /**
   * Page Object страницы профиля
   */
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});

export { expect };
