import { expect } from '@playwright/test';

/**
 * Page Object для страницы «Аналитика» (#/analytics)
 */
export class AnalyticsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.title = page.locator('h1:has-text("Аналитика класса")');
    this.periodSelect = page.locator('#select-analytics-period');
    this.btnGenerateReport = page.locator('#btn-generate-report');

    this.reportContainer = page.locator('#report-container');
    this.reportPeriodTitle = page.locator('#report-period-title');
    this.reportMetricAvg = page.locator('#report-metric-avg');
    this.reportMetricAtt = page.locator('#report-metric-att');
    this.reportMetricUnconfirmed = page.locator('#report-metric-unconfirmed');
    this.reportMetricRisk = page.locator('#report-metric-risk');
    this.btnCloseReport = page.locator('#btn-close-report');
    this.btnPrintReport = page.locator('#btn-print-report');

    this.subjectAverages = page.locator('h3:has-text("Средние баллы по предметам")').locator('..').locator('.grid > div');

    this.absencesSection = page.locator('h3:has-text("Сводный список пропусков")').locator('..').locator('..');
    this.absencesTable = page.locator('#report-container table');
  }

  /**
   * Открыть экран Аналитики
   * @param {string} [queryString='']
   */
  async goto(queryString = '') {
    const hash = queryString ? `#/analytics?${queryString}` : '#/analytics';
    await this.page.goto(`index.html${hash}`);
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  /**
   * Выбрать период отчёта
   * @param {string} periodId 'q1_2024' | 'sept_2024' | 'oct_2024'
   */
  async selectPeriod(periodId) {
    await this.periodSelect.selectOption(periodId);
  }

  /**
   * Нажать кнопку «Сформировать отчёт»
   */
  async generateReport() {
    await this.btnGenerateReport.click();
    await expect(this.reportContainer).toBeVisible({ timeout: 5000 });
  }

  /**
   * Закрыть отчёт
   */
  async closeReport() {
    await this.btnCloseReport.click();
    await expect(this.reportContainer).toBeHidden({ timeout: 5000 });
  }
}
