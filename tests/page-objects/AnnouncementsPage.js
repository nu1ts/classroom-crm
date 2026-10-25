export class AnnouncementsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.pageTitle = page.locator('#announcements-page-title');
    this.pageSubtitle = page.locator('#announcements-page-subtitle');
    this.btnCreate = page.locator('#btn-create-announcement');

    this.listContainer = page.locator('#announcements-list');
    this.cards = page.locator('.announcement-card');
    this.emptyState = page.locator('#announcements-empty-state');

    this.modalCreate = page.locator('#modal-announcement-create');
    this.inputCreateClass = page.locator('#announcement-create-class');
    this.inputCreateDate = page.locator('#announcement-create-date');
    this.inputCreateTitle = page.locator('#announcement-create-title');
    this.inputCreateContent = page.locator('#announcement-create-content');
    this.errorCreateTitle = page.locator('#announcement-create-title-error');
    this.errorCreateContent = page.locator('#announcement-create-content-error');
    this.btnSubmitCreate = page.locator('#btn-submit-create-announcement');
    this.btnCancelCreate = page.locator('#btn-cancel-create-announcement');

    this.modalDetail = page.locator('#modal-announcement-detail');
    this.modalDetailTitle = page.locator('#modal-announcement-title');
    this.modalDetailDate = page.locator('#modal-announcement-date');
    this.modalDetailContent = page.locator('#modal-announcement-content');
    this.modalDetailReads = page.locator('#modal-announcement-reads');
    this.btnCloseDetail = page.locator('#btn-close-announcement-modal');
    this.btnDismissDetail = page.locator('#btn-modal-dismiss');
  }

  async goto() {
    await this.page.goto('announcements');
  }

  getCardByTitle(title) {
    return this.cards.filter({ hasText: title });
  }
}
