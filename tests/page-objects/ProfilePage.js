import { expect } from '@playwright/test';

export class ProfilePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.nameInput = page.locator('label:has-text("ФИО") + input');
    this.roleInput = page.locator('label:has-text("Роль в системе") + input');
    this.bindingInput = page.locator('label:has-text("Курируемый класс"), label:has-text("Привязка")').locator('+ input');
    this.loginInput = page.locator('label:has-text("Логин") + input');
    this.langSelect = page.locator('#profile-lang-select');

    this.passwordForm = page.locator('#profile-password-form');
    this.currentPwdInput = page.locator('#pwd-current');
    this.newPwdInput = page.locator('#pwd-new');
    this.confirmPwdInput = page.locator('#pwd-confirm');
    this.savePasswordBtn = page.locator('#btn-save-password');
    this.passwordFeedback = page.locator('#password-feedback');

    this.logoutBtn = page.locator('#btn-profile-logout');
  }

  /**
   * Переход в профиль
   */
  async goto() {
    await this.page.goto('index.html#/profile');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Смена пароля через форму профиля
   */
  async changePassword(currentPwd, newPwd, confirmPwd) {
    if (currentPwd !== undefined) await this.currentPwdInput.fill(currentPwd);
    if (newPwd !== undefined) await this.newPwdInput.fill(newPwd);
    if (confirmPwd !== undefined) await this.confirmPwdInput.fill(confirmPwd);
    await this.savePasswordBtn.click();
  }

  /**
   * Проверка успешного сообщения смены пароля
   */
  async expectPasswordSuccess(expectedText = 'Пароль успешно изменён') {
    await expect(this.passwordFeedback).toBeVisible({ timeout: 5000 });
    await expect(this.passwordFeedback).toContainText(expectedText);
    await expect(this.passwordFeedback).toHaveClass(/bg-emerald-50/);
  }

  /**
   * Проверка ошибки при смене пароля
   */
  async expectPasswordError(expectedText) {
    await expect(this.passwordFeedback).toBeVisible({ timeout: 5000 });
    if (expectedText) {
      await expect(this.passwordFeedback).toContainText(expectedText);
    }
    await expect(this.passwordFeedback).toHaveClass(/bg-rose-50/);
  }

  /**
   * Выход из системы из профиля
   */
  async logout() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.logoutBtn.click();
    await this.page.waitForURL(/#\/login/, { timeout: 5000 });
  }
}
