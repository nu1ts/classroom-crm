import { expect } from '@playwright/test';

export class ParentDetailPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.breadcrumbs = page.locator('nav:has-text("Класс 7Б")');
    this.parentNameHeading = page.locator('h2');
    this.phoneCard = page.locator('text=Мобильный телефон:').locator('..');
    this.readOnlyNotice = page.locator('text=Анкетные данные — только чтение в сводке');

    this.btnRecordContact = page.locator('#btn-card-record-contact');
    this.btnLinkStudent = page.locator('#btn-card-link-student');
    this.btnUnlinkStudent = page.locator('#btn-card-unlink-student');

    this.childrenBlock = page.locator('.bg-white.rounded-3xl', { hasText: 'Связанные ученики' });
    this.riskChildBlock = page.locator('.rounded-3xl', { hasText: 'Ребёнок под наблюдением' });
    this.contactsHistoryBlock = page.locator('.bg-white.rounded-3xl', { hasText: 'История общения с родителем' });
    this.contactsHistoryList = page.locator('#parent-communication-history-list');

    this.modalContact = page.locator('#modal-record-parent-contact');
    this.formContact = page.locator('#form-record-parent-contact');
    this.contactDateInput = page.locator('#contact-date-input');
    this.contactStudentSelect = page.locator('#contact-student-select');
    this.contactChannelSelect = page.locator('#contact-channel-select');
    this.contactSummaryInput = page.locator('#contact-summary-input');
    this.contactAgreementCheck = page.locator('#contact-agreement-check');
    this.channelError = page.locator('#contact-channel-error');
    this.summaryError = page.locator('#contact-summary-error');
    this.btnSubmitContact = page.locator('#form-record-parent-contact button[type="submit"]');

    this.modalLink = page.locator('#modal-card-link-student');
    this.formLink = page.locator('#form-card-link-student');
    this.linkStudentSelect = page.locator('#card-link-student-select');
    this.linkRoleSelect = page.locator('#card-link-role-select');
    this.linkPrimaryCheck = page.locator('#card-link-is-primary');
    this.btnSubmitLink = page.locator('#form-card-link-student button[type="submit"]');

    this.modalUnlink = page.locator('#modal-card-unlink-student');
    this.formUnlink = page.locator('#form-card-unlink-student');
    this.btnSubmitUnlink = page.locator('#form-card-unlink-student button[type="submit"]');
  }

  async goto(parentId) {
    await this.page.goto(`index.html#/parent?id=${parentId}`);
    await expect(this.parentNameHeading).toBeVisible({ timeout: 10000 });
  }

  async openRecordContactModal() {
    await this.btnRecordContact.click();
    await expect(this.modalContact).toHaveClass(/opacity-100/);
  }

  async openUnlinkModal() {
    await this.btnUnlinkStudent.click();
    await expect(this.modalUnlink).toHaveClass(/opacity-100/);
  }
}
