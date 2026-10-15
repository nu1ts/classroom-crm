import { expect } from '@playwright/test';

/**
 * Page Object для страницы детальной сводки ученика (#/student?id=...)
 */
export class StudentDetailPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.breadcrumbs = page.locator('nav.flex.items-center.space-x-2');
    this.studentFullName = page.locator('h1');
    this.birthDateLabel = page.locator('p:has-text("Дата рождения:")');
    this.riskBadge = page.locator('span:has-text("В зоне риска")');
    this.activeBadge = page.locator('span:has-text("7Б · Активен"), span:has-text("Активен")');

    this.averageGradeCard = page.locator('.bg-white.rounded-3xl', { has: page.locator('div:text-is("Средний балл")') });
    this.absencesTotalCard = page.locator('.bg-white.rounded-3xl', { has: page.locator('div:text-is("Пропусков всего")') });
    this.excusedAbsencesCard = page.locator('.bg-white.rounded-3xl', { has: page.locator('div:text-is("Из них по болезни")') });

    this.parentsContactsBlock = page.locator('.text-left', { has: page.locator('h3:has-text("Контакты родителей")') });
    this.subjectsBlock = page.locator('.bg-white.rounded-3xl', { has: page.locator('h3:has-text("Успеваемость по предметам")') });
    this.recentAbsencesBlock = page.locator('.bg-white.rounded-3xl', { has: page.locator('h3:has-text("Последние пропуски занятий")') });
    this.contactsHistoryBlock = page.locator('.bg-white.rounded-3xl', { has: page.locator('h3:has-text("История общения с родителями")') });
    this.notesBlock = page.locator('.bg-white.rounded-3xl', { has: page.locator('h3:has-text("Заметки классрука")') });

    this.btnOpenNoteModal = page.locator('#btn-open-note-modal');
    this.btnOpenContactModal = page.locator('#btn-open-contact-modal');
  }

  /**
   * Открыть детальную сводку ученика по ID
   * @param {string} studentId
   * @param {string} [period='q1_2024']
   */
  async goto(studentId, period = 'q1_2024') {
    await this.page.goto(`index.html#/student?id=${studentId}&period=${period}`);
    await expect(this.studentFullName).toBeVisible({ timeout: 10000 });
  }
}
