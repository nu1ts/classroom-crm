import { expect } from '@playwright/test';

export class AnnouncementsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.pageTitle = page.locator('#announcements-page-title');
    this.pageSubtitle = page.locator('#announcements-page-subtitle');
    this.btnCreate = page.locator('#btn-create-announcement');
    this.cards = page.locator('.announcement-card');
    this.emptyState = page.locator('#announcements-empty-state');

    this.modalCreate = page.locator('#modal-announcement-create');
    this.inputCreateClass = page.locator('#announcement-create-class');
    this.inputCreateDate = page.locator('#announcement-create-date');
    this.inputCreateTitle = page.locator('#announcement-create-title');
    this.inputCreateContent = page.locator('#announcement-create-content');
    this.errorCreateTitle = page.locator('#announcement-title-error');
    this.errorCreateContent = page.locator('#announcement-content-error');
    this.btnSubmitCreate = page.locator('#btn-submit-create-announcement');

    this.modalEdit = page.locator('#modal-announcement-edit');
    this.inputEditTitle = page.locator('#announcement-edit-title');
    this.inputEditContent = page.locator('#announcement-edit-content');
    this.btnSubmitEdit = page.locator('#btn-submit-edit-announcement');

    this.modalDetail = page.locator('#modal-announcement-detail');
    this.modalDetailTitle = page.locator('#modal-announcement-title');
    this.modalDetailReads = page.locator('#modal-announcement-reads');
    this.btnCloseDetail = page.locator('#btn-close-announcement-modal');
    this.btnDismissDetail = page.locator('#btn-modal-dismiss');
  }

  async goto() {
    await this.page.goto('announcements/');
    await expect(this.pageTitle).toBeVisible();
  }

  getCardByTitle(title) {
    return this.cards.filter({ hasText: title });
  }

  async deleteCard(card, accept = true) {
    this.page.once('dialog', async (dialog) => {
      if (accept) await dialog.accept();
      else await dialog.dismiss();
    });
    await card.locator('.btn-delete-announcement').click();
    if (accept) await expect(card).toHaveCount(0);
    else await expect(card).toBeVisible();
  }
}
