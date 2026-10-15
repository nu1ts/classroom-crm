import { expect } from '@playwright/test';

export class MetricsHelper {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Найти контейнер карточки метрики по заголовку
   * @param {string} title Например: "Посещаемость сегодня", "Средний балл класса", "Без подтверждения"
   */
  getMetricCard(title) {
    return this.page.locator('.rounded-2xl', {
      has: this.page.locator(`span:has-text("${title}")`)
    }).first();
  }

  /**
   * Проверить числовое или строковое значение в карточке метрики
   * @param {string} title Название метрики
   * @param {string|number|RegExp} expectedValue Ожидаемое значение
   */
  async expectMetricValue(title, expectedValue) {
    const card = this.getMetricCard(title);
    await expect(card).toBeVisible({ timeout: 5000 });
    
    const valueEl = card.locator('span.font-extrabold, span.text-2xl, span.text-3xl').first();
    await expect(valueEl).toBeVisible({ timeout: 5000 });
    
    if (expectedValue instanceof RegExp) {
      await expect(valueEl).toHaveText(expectedValue);
    } else {
      await expect(valueEl).toContainText(String(expectedValue));
    }
  }

  /**
   * Проверить наличие статусного бейджа/дополнительного текста в карточке метрики
   * @param {string} title Название метрики
   * @param {string} badgeText Текст бейджа (например "норма", "Готово к отчёту", "В работе")
   */
  async expectMetricBadge(title, badgeText) {
    const card = this.getMetricCard(title);
    await expect(card).toBeVisible({ timeout: 5000 });
    const badge = card.locator(`:has-text("${badgeText}")`).first();
    await expect(badge).toBeVisible({ timeout: 5000 });
  }

  /**
   * Получить объект со всеми обнаруженными метриками дашборда
   */
  async getAllMetrics() {
    const cards = this.page.locator('.bg-white.rounded-2xl.p-4, .bg-white.rounded-2xl.p-5');
    const count = await cards.count();
    const result = {};

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const titleEl = card.locator('span.uppercase, h2, h3').first();
      const valEl = card.locator('.font-extrabold, .text-2xl, .text-3xl').first();

      if (await titleEl.isVisible() && await valEl.isVisible()) {
        const title = (await titleEl.innerText()).trim();
        const value = (await valEl.innerText()).trim();
        result[title] = value;
      }
    }

    return result;
  }
}
