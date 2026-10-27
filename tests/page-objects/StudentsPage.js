import { expect } from '@playwright/test';

/**
 * Page Object для страницы «Список учеников» (#/students)
 */
export class StudentsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.searchInput = page.locator('#input-search-student-list');
    this.btnClearSearch = page.locator('#btn-clear-student-search');
    this.btnFilterAbsences = page.locator('#btn-filter-absences-toggle');
    this.periodSelect = page.locator('#select-students-period');
    this.counterLabel = page.locator('#students-counter-label');
    this.btnResetFilters = page.locator('#btn-reset-students-filters');

    this.studentRows = page.locator('.student-row-item');
    this.sortByName = page.locator('.col-sortable[data-sort-by="name"]');
    this.sortByGrade = page.locator('.col-sortable[data-sort-by="grade"]');
    this.sortByAbsences = page.locator('.col-sortable[data-sort-by="absences"]');

    this.paginationPages = page.locator('.btn-pagination-page');
    this.paginationNav = page.locator('.btn-pagination-nav');

    this.modalSummary = page.locator('#modal-student-summary');
    this.modalSummaryContent = page.locator('#student-summary-content');
    this.btnCloseSummary = page.locator('#btn-close-students-summary-x, #btn-close-students-summary-footer');
  }

  /**
   * Открыть страницу списка учеников
   * @param {string} [queryString='']
   */
  async goto(queryString = '') {
    const route = queryString ? `students/?${queryString}` : 'students/';
    await this.page.goto(route);
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Найти строку ученика по имени
   * @param {string} studentName
   * @returns {import('@playwright/test').Locator}
   */
  getStudentRow(studentName) {
    return this.studentRows.filter({ hasText: studentName }).first();
  }

  /**
   * Открыть сводку ученика через кнопку в таблице
   * @param {string} studentName
   */
  async openSummary(studentName) {
    const row = this.getStudentRow(studentName);
    await row.locator('.btn-open-student-summary').click();
    await expect(this.modalSummary).toHaveClass(/opacity-100/);
  }

  /**
   * Перейти на детальную страницу сводки ученика
   * @param {string} studentName
   */
  async openFullSummary(studentName) {
    await this.openSummary(studentName);
    await this.modalSummary.locator('a:has-text("Полная сводка")').click();
  }

  /**
   * Закрыть модалку сводки
   */
  async closeSummary() {
    await this.btnCloseSummary.first().click();
    await expect(this.modalSummary).toHaveClass(/opacity-0/);
  }

  /**
   * Ввести поисковый запрос
   * @param {string} text
   */
  async search(text) {
    await this.searchInput.fill(text);
    await expect(this.searchInput).toHaveValue(text);
    await expect(this.counterLabel).toBeVisible();
  }

  /**
   * Очистить поиск
   */
  async clearSearch() {
    if (await this.btnClearSearch.isVisible()) {
      await this.btnClearSearch.click();
    } else {
      await this.searchInput.fill('');
    }
    await expect(this.searchInput).toHaveValue('');
    await expect(this.counterLabel).toBeVisible();
  }

  /**
   * Переключить фильтр «С пропусками»
   */
  async toggleAbsencesFilter() {
    const wasActive = await this.btnFilterAbsences.evaluate((button) =>
      button.classList.contains('bg-brand-500'),
    );
    await this.btnFilterAbsences.click();
    await expect(this.btnFilterAbsences).toHaveClass(
      wasActive ? /bg-white/ : /bg-brand-500/,
    );
  }

  /**
   * Кликнуть по номеру страницы
   * @param {number|string} pageNum
   */
  async goToPage(pageNum) {
    const target = this.page.locator(`.btn-pagination-page[data-page="${pageNum}"]`);
    await target.click();
    await expect(target).toHaveClass(/bg-brand-500/);
  }

  /**
   * Выбрать период в выпадающем списке
   * @param {string} periodId
   */
  async selectPeriod(periodId) {
    await this.periodSelect.selectOption(periodId);
    await expect(this.periodSelect).toHaveValue(periodId);
    await expect(this.counterLabel).toBeVisible();
  }
}
