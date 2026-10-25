import { expect } from '@playwright/test';

export class SchedulePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.title = page.locator('h1');
    this.scheduleGrid = page.locator('#schedule-grid');
    this.weekSelect = page.locator('#select-schedule-week');
    this.classSelect = page.locator('#select-schedule-class');
    this.roleNotice = page.locator('#schedule-role-notice');
    this.emptyState = page.locator('#schedule-empty-state');

    this.btnAddLesson = page.locator('#btn-add-lesson');

    this.lessonModal = page.locator('#modal-lesson-form');
    this.lessonModalTitle = page.locator('#modal-lesson-title');
    this.subjectSelect = page.locator('#lesson-subject-select');
    this.classModalSelect = page.locator('#lesson-class-select');
    this.dateSelect = page.locator('#lesson-date-select');
    this.timeSelect = page.locator('#lesson-time-select');
    this.roomSelect = page.locator('#lesson-room-select');
    this.teacherSelect = page.locator('#lesson-teacher-select');
    this.btnSaveLesson = page.locator('#btn-save-lesson');
    this.btnCancelLesson = page.locator('#btn-cancel-lesson-form, #btn-close-lesson-modal');
    this.btnCloseModalX = page.locator('#btn-close-lesson-modal');

    this.conflictErrorBox = page.locator('#lesson-room-conflict-error');
    this.conflictErrorText = page.locator('#lesson-conflict-error-text');

    this.deleteModal = page.locator('#modal-delete-lesson');
    this.btnConfirmDelete = page.locator('#btn-confirm-delete-lesson');
    this.btnCancelDelete = page.locator('#btn-cancel-delete-lesson');

    this.lessonCards = page.locator('.schedule-card');
  }

  /**
   * Переход на страницу расписания
   * @param {string} [queryString='']
   */
  async goto(queryString = '') {
    const url = queryString ? `schedule/?${queryString}` : 'schedule';
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Открыть модалку добавления занятия
   */
  async openAddLessonModal() {
    await this.btnAddLesson.click();
    await expect(this.lessonModal).toBeVisible();
  }

  /**
   * Заполнить форму занятия
   */
  async fillLessonForm({ subject, classId, date, time, room, teacher } = {}) {
    if (subject) await this.subjectSelect.selectOption(subject);
    if (classId && await this.classModalSelect.isEnabled()) {
      await this.classModalSelect.selectOption(classId);
    }
    if (date) await this.dateSelect.selectOption(date);
    if (time) await this.timeSelect.selectOption(time);
    if (room) await this.roomSelect.selectOption(room);
    if (teacher) await this.teacherSelect.selectOption(teacher);
  }

  /**
   * Нажать Сохранить занятие
   */
  async saveLesson() {
    await this.btnSaveLesson.click();
  }

  /**
   * Получить карточку занятия по предмету и аудитории/времени
   */
  getLessonCard(subject, room = '', date = '') {
    let selector = '.schedule-card';
    if (date) {
      selector += `[data-date="${date}"]`;
    }
    let loc = this.page.locator(selector).filter({ hasText: subject });
    if (room) loc = loc.filter({ hasText: room });
    return loc;
  }
}
