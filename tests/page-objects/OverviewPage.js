import { expect } from '@playwright/test';

/**
 * Page Object для страницы «Обзор класса» (#/overview)
 */
export class OverviewPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.classHeader = page.locator('h1');

    this.metricCards = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div');
    this.todayAttendanceValue = page.locator('text="Посещаемость сегодня"').locator('..').locator('..').locator('span.text-2xl, span.text-3xl');
    this.classAverageValue = page.locator('text="Средний балл класса"').locator('..').locator('..').locator('span.text-2xl, span.text-3xl');
    this.unconfirmedAbsencesValue = page.locator('text="Без подтверждения"').locator('..').locator('..').locator('span.text-2xl, span.text-3xl');
    this.unconfirmedLink = page.getByRole('link', { name: 'К журналу →' });
    this.riskZoneMetricValue = page.locator('text="Список внимания"').locator('..').locator('..').locator('span.text-2xl, span.text-3xl');

    this.riskZoneSection = page.locator('text="Список внимания (Зона риска)"').locator('..').locator('..');
    this.riskCards = page.locator('.risk-card');

    this.modalSummary = page.locator('#modal-student-summary');
    this.modalSummaryContent = page.locator('#student-summary-content');
    this.btnCloseSummary = page.locator('#btn-close-summary, #btn-close-summary-x');

    this.modalContact = page.locator('#modal-contact-parent');
    this.formContact = page.locator('#form-contact-parent');
    this.contactStudentName = page.locator('#contact-student-name');
    this.contactParentSelect = page.locator('#contact-parent-select');
    this.contactChannelSelect = page.locator('#contact-channel');
    this.contactTopicSelect = page.locator('#contact-topic');
    this.contactSummaryTextarea = page.locator('#contact-summary');
    this.contactAgreementCheckbox = page.locator('#contact-agreement');
    this.btnSaveContact = page.locator('#form-contact-parent button[type="submit"]');
    this.btnCancelContact = page.locator('#btn-cancel-contact, #btn-close-contact-x');

    this.modalNote = page.locator('#modal-add-note');
    this.formNote = page.locator('#form-add-note');
    this.noteStudentName = page.locator('#note-student-name');
    this.noteTextarea = page.locator('#note-text');
    this.notePrivateCheckbox = page.locator('#note-private');
    this.btnSaveNote = page.locator('#form-add-note button[type="submit"]');
    this.btnCancelNote = page.locator('#btn-cancel-note, #btn-close-note-x');
  }

  /**
   * Открыть экран Обзора класса
   */
  async goto() {
    await this.page.goto('overview');
    await expect(this.classHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Найти карточку ученика в зоне риска по имени
   * @param {string} studentName
   * @returns {import('@playwright/test').Locator}
   */
  getRiskCard(studentName) {
    return this.page.locator('.risk-card').filter({ hasText: studentName }).first();
  }

  /**
   * Открыть сводку ученика из зоны риска
   * @param {string} studentName
   */
  async openSummary(studentName) {
    const card = this.getRiskCard(studentName);
    await card.locator('.btn-open-summary').click();
    await expect(this.modalSummary).toHaveClass(/opacity-100/);
  }

  /**
   * Закрыть модалку сводки
   */
  async closeSummary() {
    await this.btnCloseSummary.first().click();
    await expect(this.modalSummary).toHaveClass(/opacity-0/);
  }

  /**
   * Открыть модалку фиксации контакта
   * @param {string} studentName
   */
  async openContactModal(studentName) {
    const card = this.getRiskCard(studentName);
    await card.locator('.btn-contact-parent').click();
    await expect(this.modalContact).toHaveClass(/opacity-100/);
  }

  /**
   * Сохранить контакт с родителем
   * @param {Object} options
   * @param {string} [options.channel='phone']
   * @param {string} [options.topic='absence']
   * @param {string} options.summary
   * @param {boolean} [options.agreement=true]
   */
  async submitContact({ channel = 'phone', topic = 'absence', summary = '', agreement = true } = {}) {
    if (channel) await this.contactChannelSelect.selectOption(channel);
    if (topic) await this.contactTopicSelect.selectOption(topic);
    if (summary) await this.contactSummaryTextarea.fill(summary);
    if (agreement !== undefined) {
      const isChecked = await this.contactAgreementCheckbox.isChecked();
      if (isChecked !== agreement) {
        await this.contactAgreementCheckbox.setChecked(agreement);
      }
    }
    await this.btnSaveContact.click();
    await expect(this.modalContact).toHaveClass(/opacity-0/);
  }

  /**
   * Открыть модалку добавления заметки
   * @param {string} studentName
   */
  async openNoteModal(studentName) {
    const card = this.getRiskCard(studentName);
    await card.locator('.btn-add-note').click();
    await expect(this.modalNote).toHaveClass(/opacity-100/);
  }

  /**
   * Сохранить заметку классрука
   * @param {string} text
   * @param {boolean} [isPrivate=true]
   */
  async submitNote(text, isPrivate = true) {
    await this.noteTextarea.fill(text);
    if (isPrivate !== undefined) {
      const isChecked = await this.notePrivateCheckbox.isChecked();
      if (isChecked !== isPrivate) {
        await this.notePrivateCheckbox.setChecked(isPrivate);
      }
    }
    await this.btnSaveNote.click();
    await expect(this.modalNote).toHaveClass(/opacity-0/);
  }
}
