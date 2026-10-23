import { expect } from '@playwright/test';
import { TEST_USERS } from '../config/test-users.js';

export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.submitButton = page.locator('#btn-login-submit');
    this.errorBox = page.locator('#login-error-box');
    this.errorText = page.locator('#login-error-text');
    this.togglePasswordBtn = page.locator('#btn-toggle-password');
    this.forgotPasswordBtn = page.locator('#btn-forgot-password');

    this.activeCard = page.locator('#login-active-card');
    this.goToCabinetBtn = page.locator('#btn-login-to-cabinet');
    this.switchUserBtn = page.locator('#btn-login-switch-user');

    this.forgotPasswordModal = page.locator('#modal-forgot-password');
    this.closeForgotPasswordModalBtn = page.locator('#modal-forgot-password button[data-action="close-modal"]').first();
  }

  /**
   * Переход на экран авторизации
   */
  async goto(options = {}) {
    await this.page.goto('login', options);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Переход с секретным ключом для активации DEV-режима
   */
  async gotoWithDevKey() {
    await this.page.goto('login?key=tsu_debug');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Вход по логину и паролю
   */
  async login(username, password) {
    await this.emailInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Быстрый вход под пользователем из конфигурации TEST_USERS
   * @param {'teacher'|'subject_teacher'|'admin'|'parent'|'student'|'osipov'} roleKey
   */
  async loginAs(roleKey) {
    const user = TEST_USERS[roleKey];
    if (!user) throw new Error(`Неизвестный пользователь: ${roleKey}`);
    await this.login(user.username, user.password);
  }

  /**
   * Быстрый вход через dev-кнопку (когда активен ?key=tsu_debug)
   */
  async quickLoginDev(roleKey) {
    const devBtn = this.page.locator(`button[data-demo-role="${roleKey}"]`);
    await expect(devBtn).toBeVisible({ timeout: 5000 });
    await devBtn.click();
  }

  /**
   * Проверка сообщения об ошибке авторизации
   */
  async expectErrorMessage(expectedText) {
    await expect(this.errorBox).toBeVisible({ timeout: 5000 });
    if (expectedText) {
      await expect(this.errorText).toContainText(expectedText);
    }
  }

  /**
   * Переключение видимости пароля
   */
  async togglePasswordVisibility() {
    await this.togglePasswordBtn.click();
  }

  /**
   * Проверка карточки активного сеанса
   */
  async expectActiveSession() {
    await expect(this.activeCard).toBeVisible({ timeout: 5000 });
  }

  /**
   * Клик по переходу в кабинет из активного сеанса
   */
  async clickGoToCabinet() {
    await this.goToCabinetBtn.click();
  }

  /**
   * Клик по выходу и смене пользователя
   */
  async clickSwitchUser() {
    await this.switchUserBtn.click();
  }

  /**
   * Открытие модального окна восстановления пароля
   */
  async openForgotPasswordModal() {
    await this.forgotPasswordBtn.click();
    await expect(this.forgotPasswordModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Закрытие модального окна восстановления пароля
   */
  async closeForgotPasswordModal() {
    await this.closeForgotPasswordModalBtn.click();
    await expect(this.forgotPasswordModal).toHaveClass(/opacity-0\s+pointer-events-none/, { timeout: 5000 });
  }
}
