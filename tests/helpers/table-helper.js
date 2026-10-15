import { expect } from '@playwright/test';

export class TableHelper {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Получить локатор таблицы
   */
  getTable(tableSelector = 'table') {
    return this.page.locator(tableSelector);
  }

  /**
   * Получить локатор строк тела таблицы
   */
  getTableRows(tableSelector = 'table') {
    return this.page.locator(`${tableSelector} tbody tr`);
  }

  /**
   * Получить заголовки таблицы (текст из th)
   */
  async getTableHeaders(tableSelector = 'table') {
    const headers = this.page.locator(`${tableSelector} thead th`);
    return await headers.allInnerTexts();
  }

  /**
   * Проверить заголовки таблицы
   */
  async expectTableHeaders(tableSelector = 'table', expectedHeaders = []) {
    const headers = await this.getTableHeaders(tableSelector);
    for (const expected of expectedHeaders) {
      const found = headers.some(h => h.trim().toUpperCase().includes(expected.toUpperCase()));
      expect(found, `Заголовок "${expected}" не найден среди: ${JSON.stringify(headers)}`).toBe(true);
    }
  }

  /**
   * Проверить количество строк в таблице
   */
  async expectRowCount(tableSelector = 'table', expectedCount) {
    const rows = this.getTableRows(tableSelector);
    await expect(rows).toHaveCount(expectedCount, { timeout: 5000 });
  }

  /**
   * Получить текст ячейки по индексу строки и столбца (0-indexed)
   */
  async getTableCellValue(tableSelector = 'table', rowIndex = 0, colIndex = 0) {
    const cell = this.page.locator(`${tableSelector} tbody tr`).nth(rowIndex).locator('td').nth(colIndex);
    return (await cell.innerText()).trim();
  }

  /**
   * Найти строку по тексту (например ФИО ученика)
   */
  findRowByText(tableSelector = 'table', text) {
    return this.page.locator(`${tableSelector} tbody tr`, { hasText: text });
  }

  /**
   * Проверить, что строка содержит ожидаемые фрагменты текста
   * @param {string} tableSelector
   * @param {number|string} rowIndexOrText Индекс строки или текстовый маркер
   * @param {string[]} values Фрагменты текста, которые должны присутствовать в строке
   */
  async expectRowContains(tableSelector = 'table', rowIndexOrText, values = []) {
    const row = typeof rowIndexOrText === 'number'
      ? this.page.locator(`${tableSelector} tbody tr`).nth(rowIndexOrText)
      : this.findRowByText(tableSelector, rowIndexOrText);

    await expect(row).toBeVisible({ timeout: 5000 });
    const rowText = await row.innerText();
    for (const val of values) {
      expect(rowText, `Ожидаемое значение "${val}" не найдено в строке: ${rowText}`).toContain(val);
    }
  }
}
