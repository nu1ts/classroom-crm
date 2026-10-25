import { expect } from '@playwright/test';

/**
 * Page Object для страницы «Посещаемость» (#/attendance)
 */
export class AttendancePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.title = page.locator('h2:has-text("Журнал посещаемости 7Б")');
    this.weekSelect = page.locator('#select-attendance-week');
    this.onlyAbsencesCheckbox = page.locator('#filter-only-absences');
    this.bannerUnconfirmed = page.locator('#banner-unconfirmed');
    this.bannerUnconfirmedText = page.locator('#banner-unconfirmed-text');

    this.openConfirmButtons = page.locator('button[data-action="open-confirm"]');

    this.modalConfirm = page.locator('#modal-confirm-absence');
    this.formConfirm = page.locator('#form-confirm-absence');
    this.studentNameInput = page.locator('#confirm-student-name');
    this.reasonTypeSelect = page.locator('#confirm-reason-type');
    this.hasCertificateCheckbox = page.locator('#confirm-has-certificate');
    this.documentTextInput = page.locator('#confirm-document-text');
    this.notesTextarea = page.locator('#confirm-notes');
    this.btnSubmitConfirm = page.locator('#form-confirm-absence button[type="submit"]');
    this.btnCancelConfirm = page.locator('#btn-cancel-confirm, #btn-close-confirm-x');
  }

  /**
   * Получить кнопку подтверждения пропуска по имени ученика и дате
   * @param {string} studentName
   * @param {string} date 'YYYY-MM-DD'
   */
  getConfirmButton(studentName, date) {
    return this.page.locator(`button[data-action="open-confirm"][data-student-name*="${studentName}"][data-date="${date}"]`);
  }

  /**
   * Открыть подтверждение пропуска для конкретного ученика и даты
   * @param {string} studentName
   * @param {string} date 'YYYY-MM-DD'
   */
  async openConfirmFor(studentName, date) {
    const btn = this.getConfirmButton(studentName, date);
    await btn.click();
    await expect(this.modalConfirm).toHaveClass(/opacity-100/);
  }

  /**
   * Открыть экран Посещаемости
   * @param {string} [queryString='']
   */
  async goto(queryString = '') {
    const route = queryString ? `attendance/?${queryString}` : 'attendance/';
    await this.page.goto(route);
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  /**
   * Открыть первое модальное окно подтверждения пропуска
   */
  async openFirstUnconfirmedAbsence() {
    await this.openConfirmButtons.first().click();
    await expect(this.modalConfirm).toHaveClass(/opacity-100/);
  }

  /**
   * Подтвердить уважительную причину или отклонить
   * @param {Object} options
   * @param {'excused' | 'unexcused'} [options.reasonType='excused']
   * @param {boolean} [options.hasDoc=true]
   * @param {string} [options.docText='']
   * @param {string} [options.notes='']
   */
  async submitConfirm({ reasonType = 'excused', hasDoc = true, docText = '', notes = '' } = {}) {
    if (reasonType) await this.reasonTypeSelect.selectOption(reasonType);
    if (reasonType !== 'unexcused' && hasDoc !== undefined) {
      const isChecked = await this.hasCertificateCheckbox.isChecked();
      if (isChecked !== hasDoc) {
        await this.hasCertificateCheckbox.setChecked(hasDoc);
      }
    }
    if (reasonType !== 'unexcused' && docText) {
      await this.documentTextInput.fill(docText);
    }
    if (notes) {
      await this.notesTextarea.fill(notes);
    }
    await this.btnSubmitConfirm.click();
    await expect(this.modalConfirm).toHaveClass(/opacity-0/);
  }
}
