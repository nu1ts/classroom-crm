import { expect } from '@playwright/test';

export class ParentsPage {
  constructor(page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Родители 7Б")');
    this.subtitle = page.locator('#parents-total-subtitle');
    this.searchInput = page.locator('#input-parents-search');
    this.btnClearSearch = page.locator('#btn-clear-parents-search');
    this.filterSelect = page.locator('#select-parents-filter');
    this.btnResetFilters = page.locator('#btn-reset-parents-filters');
    this.btnOpenAddParent = page.locator('#btn-open-add-parent');
    this.table = page.locator('table');
    this.parentRows = page.locator('table tbody tr');
    this.modalAdd = page.locator('#modal-add-parent');
    this.formAdd = page.locator('#form-add-parent');
    this.inputAddFullname = page.locator('#add-parent-fullname');
    this.inputAddPhone = page.locator('#add-parent-phone');
    this.phoneAddError = page.locator('#add-parent-phone-error');
    this.selectAddStudent = page.locator('#add-parent-student-select');
    this.selectAddRole = page.locator('#add-parent-role-select');
    this.checkAddPrimary = page.locator('#add-parent-is-primary');
    this.btnSubmitAdd = page.locator('#form-add-parent button[type="submit"]');
    this.modalEdit = page.locator('#modal-edit-parent');
    this.formEdit = page.locator('#form-edit-parent');
    this.inputEditFullname = page.locator('#edit-parent-fullname');
    this.inputEditPhone = page.locator('#edit-parent-phone');
    this.selectEditRole = page.locator('#edit-parent-role-select');
    this.checkEditPrimary = page.locator('#edit-parent-is-primary');
    this.btnSubmitEdit = page.locator('#form-edit-parent button[type="submit"]');
    this.modalLink = page.locator('#modal-link-parent');
    this.formLink = page.locator('#form-link-parent');
    this.selectLinkStudent = page.locator('#link-parent-student-select');
    this.selectLinkRole = page.locator('#link-parent-role-select');
    this.checkLinkPrimary = page.locator('#link-parent-is-primary');
    this.btnSubmitLink = page.locator('#form-link-parent button[type="submit"]');
    this.toast = page.locator('#parents-toast');
    this.toastMessage = page.locator('#parents-toast-message');
    this.countSummary = page.locator('#parents-filter-summary');
  }

  async goto(queryString = '') {
    await this.page.goto(queryString ? `parents/?${queryString}` : 'parents/');
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }
  getParentRow(parentName) { return this.parentRows.filter({ hasText: parentName }).first(); }
  async search(query) {
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get('search') === query),
      this.searchInput.fill(query),
    ]);
  }
  async clearSearch() {
    const clear = this.btnClearSearch.isVisible().then((visible) => visible ? this.btnClearSearch.click() : this.searchInput.fill(''));
    await Promise.all([this.page.waitForURL((url) => !url.searchParams.has('search')), clear]);
  }
  async setFilter(filterValue) {
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get('filter') === filterValue),
      this.filterSelect.selectOption(filterValue),
    ]);
  }
  async openActionMenu(parentName) { const row = this.getParentRow(parentName); await expect(row).toBeVisible(); await row.locator('.btn-parent-actions').click(); }
  async openEditModal(parentName) { await this.openActionMenu(parentName); const id = await this.getParentRow(parentName).getAttribute('data-parent-id'); await this.page.locator(`#menu-parent-${id} .btn-action-edit-parent`).click(); await expect(this.modalEdit).toHaveClass(/opacity-100/); }
  async openLinkModal(parentName) { await this.openActionMenu(parentName); const id = await this.getParentRow(parentName).getAttribute('data-parent-id'); await this.page.locator(`#menu-parent-${id} .btn-action-link-parent`).click(); await expect(this.modalLink).toHaveClass(/opacity-100/); }
  async deleteParent(parentName) { await this.openActionMenu(parentName); const id = await this.getParentRow(parentName).getAttribute('data-parent-id'); await this.page.locator(`#menu-parent-${id} .btn-action-delete-parent`).click(); }
  async openSummary(parentName) { await this.getParentRow(parentName).locator('.btn-open-parent-summary').click(); }
}
