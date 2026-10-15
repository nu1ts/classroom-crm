import { expect } from '@playwright/test';

export class NavigationPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.sidebar = page.locator('#app-sidebar');
    this.navContainer = page.locator('#app-sidebar nav');
    this.profileLink = page.locator('#sidebar-profile-link');
    this.logoutBtn = page.locator('#btn-sidebar-logout');
    this.roleSwitcher = page.locator('#demo-role-switcher');
    this.readOnlyBadge = page.locator('text="Только для просмотра"');
  }

  /**
   * Клик по пункту бокового меню по ID (например 'nav-students') или названию
   */
  async clickMenuItem(itemIdOrTitle) {
    const item = itemIdOrTitle.startsWith('nav-')
      ? this.page.locator(`#${itemIdOrTitle}`)
      : this.page.locator(`#app-sidebar nav a:has-text("${itemIdOrTitle}")`);
    
    await expect(item).toBeVisible({ timeout: 5000 });
    await item.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Проверка активного пункта меню
   */
  async expectActiveMenuItem(itemId) {
    const item = this.page.locator(`#${itemId}`);
    await expect(item).toBeVisible({ timeout: 5000 });
    await expect(item).toHaveClass(/bg-brand-sidebarActive/);
  }

  /**
   * Проверка списка видимых пунктов меню в сайдбаре
   * @param {string[]} expectedItemIds Список ID (например ['nav-overview', 'nav-students'])
   */
  async expectVisibleMenuItems(expectedItemIds) {
    for (const id of expectedItemIds) {
      const item = this.page.locator(`#${id}`);
      await expect(item).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Проверка отсутствия пунктов меню (недоступных для роли)
   * @param {string[]} forbiddenItemIds
   */
  async expectHiddenMenuItems(forbiddenItemIds) {
    for (const id of forbiddenItemIds) {
      const item = this.page.locator(`#${id}`);
      await expect(item).toHaveCount(0);
    }
  }

  /**
   * Проверка подзаголовка роли в сайдбаре
   */
  async expectRoleSubtitle(text) {
    const subtitle = this.page.locator('#app-sidebar [title*="' + text + '"], #app-sidebar div:has-text("' + text + '")');
    await expect(subtitle.first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Проверка плашки "Только для просмотра" (для роли ученика)
   */
  async expectReadOnlyBadge(shouldBeVisible = true) {
    if (shouldBeVisible) {
      await expect(this.readOnlyBadge).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.readOnlyBadge).toHaveCount(0);
    }
  }

  /**
   * Выход из системы через сайдбар с подтверждением в confirm dialog
   */
  async logout() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.logoutBtn.click();
    await this.page.waitForURL(/#\/login/, { timeout: 5000 });
  }

  /**
   * Переключение роли через dev-переключатель в сайдбаре
   */
  async switchRole(roleKey) {
    await expect(this.roleSwitcher).toBeVisible({ timeout: 5000 });
    await this.roleSwitcher.selectOption(roleKey);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Прямой переход по хеш-маршруту
   */
  async gotoRoute(hashRoute) {
    const cleanRoute = hashRoute.startsWith('#') ? hashRoute : `#${hashRoute}`;
    await this.page.goto(`index.html${cleanRoute}`);
    await this.page.waitForLoadState('domcontentloaded');
  }
}
