import { expect } from '@playwright/test';

/**
 * Page Object для страницы «Журнал» (#/journal)
 */
export class JournalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.title = page.locator('h1');
    this.subjectSelect = page.locator('#select-journal-subject');
    this.weekSelect = page.locator('#select-journal-week');
    this.statusSelect = page.locator('#select-journal-status');
    this.searchInput = page.locator('#input-search-student');
    this.onlyEntriesCheckbox = page.locator('#check-only-entries');
    this.highlightUnconfirmedBtn = page.locator('#btn-toggle-highlight-unconfirmed');

    this.table = page.locator('#journal-table-container table');
    this.studentRows = page.locator('tr.student-row');
    this.headerCells = page.locator('#journal-table-container table thead th');
    this.entryCells = page.locator('td.cell-journal-entry');

    this.entryModal = page.locator('#modal-journal-entry');
    this.entryModalSubject = page.locator('#entry-modal-subject');
    this.entryModalDateBadge = page.locator('#entry-modal-lesson-date-badge');
    this.entryModalStudentName = page.locator('#entry-modal-student-name');
    this.entryModalGradeBadge = page.locator('#entry-modal-grade-badge');
    this.entryModalAttendanceBadge = page.locator('#entry-modal-attendance-badge');
    this.entryModalAbsenceDetails = page.locator('#entry-modal-absence-details');
    this.entryModalCloseBtn = page.locator('#btn-close-journal-modal');
    this.entryModalFooterCloseBtn = page.locator('#btn-close-journal-modal-footer');

    this.commentsList = page.locator('#entry-modal-comments-list');
    this.commentInput = page.locator('#input-journal-comment-text');
    this.commentSubmitBtn = page.locator('#btn-send-journal-comment');

    this.quickConfirmBlock = page.locator('#block-confirm-from-journal');
    this.quickConfirmBtn = page.locator('#btn-quick-confirm-absence');

    this.confirmModal = page.locator('#modal-journal-confirm-absence');
    this.confirmStudentNameInput = page.locator('#journal-confirm-student-name');
    this.confirmReasonSelect = page.locator('#journal-confirm-reason-type');
    this.confirmHasDocCheckbox = page.locator('#journal-confirm-has-certificate');
    this.confirmDocInput = page.locator('#journal-confirm-document-text');
    this.confirmNotesTextarea = page.locator('#journal-confirm-notes');
    this.confirmSubmitBtn = page.locator('#form-journal-confirm-absence button[type="submit"]');
    this.confirmCancelBtn = page.locator('#btn-cancel-journal-confirm');
  }

  /**
   * Открыть страницу Журнала
   * @param {string} [queryString='']
   */
  async goto(queryString = '') {
    const hash = queryString ? `#/journal?${queryString}` : '#/journal';
    await this.page.goto(`index.html${hash}`);
    await this.title.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Выбрать предмет в фильтре
   * @param {string} subjectId
   */
  async selectSubject(subjectId) {
    await this.subjectSelect.selectOption(subjectId);
  }

  /**
   * Выбрать неделю/период в фильтре
   * @param {string} weekId
   */
  async selectWeek(weekId) {
    await this.weekSelect.selectOption(weekId);
  }

  /**
   * Выбрать статус записей
   * @param {string} status 'all' | 'unconfirmed' | 'absences' | 'grades'
   */
  async selectStatus(status) {
    await this.statusSelect.selectOption(status);
  }

  /**
   * Переключить фильтр «Показывать только записи»
   */
  async toggleOnlyEntries() {
    await this.page.locator('label[for="check-only-entries"]').click();
  }

  /**
   * Поиск ученика
   * @param {string} query
   */
  async searchStudent(query) {
    await this.searchInput.fill(query);
  }

  /**
   * Найти ячейку по имени ученика и дате урока
   * @param {string} studentName
   * @param {string} date 'YYYY-MM-DD'
   * @returns {import('@playwright/test').Locator}
   */
  getCell(studentName, date) {
    return this.page.locator(`td.cell-journal-entry[title*="${studentName}"][title*="${date}"]`);
  }

  /**
   * Кликнуть по ячейке ученика за дату для открытия модалки
   * @param {string} studentName
   * @param {string} date 'YYYY-MM-DD'
   */
  async openCell(studentName, date) {
    const cell = this.getCell(studentName, date);
    await cell.click();
    await expect(this.entryModal).toHaveClass(/opacity-100/);
  }

  /**
   * Добавить комментарий к открытой записи
   * @param {string} text
   */
  async addComment(text) {
    await this.commentInput.fill(text);
    await this.commentSubmitBtn.click();
  }

  /**
   * Открыть модалку подтверждения уважительной причины из карточки записи
   */
  async openAbsenceConfirmation() {
    await this.quickConfirmBtn.click();
    await expect(this.confirmModal).toHaveClass(/opacity-100/);
  }

  /**
   * Подтвердить причину пропуска через модальное окно
   * @param {Object} options
   * @param {'excused' | 'unexcused'} [options.reasonType='excused']
   * @param {boolean} [options.hasDoc=true]
   * @param {string} [options.docText='']
   * @param {string} [options.notes='']
   */
  async submitAbsenceConfirmation({ reasonType = 'excused', hasDoc = true, docText = '', notes = '' } = {}) {
    await this.openAbsenceConfirmation();
    if (reasonType) {
      await this.confirmReasonSelect.selectOption(reasonType);
    }
    if (reasonType !== 'unexcused' && hasDoc !== undefined) {
      const isChecked = await this.confirmHasDocCheckbox.isChecked();
      if (isChecked !== hasDoc) {
        await this.confirmHasDocCheckbox.setChecked(hasDoc);
      }
    }
    if (reasonType !== 'unexcused' && docText) {
      await this.confirmDocInput.fill(docText);
    }
    if (notes) {
      await this.confirmNotesTextarea.fill(notes);
    }
    await this.confirmSubmitBtn.click();
    await expect(this.confirmModal).toHaveClass(/opacity-0/);
  }

  /**
   * Закрыть модальное окно записи
   */
  async closeEntryModal() {
    await this.entryModalCloseBtn.click();
    await expect(this.entryModal).toHaveClass(/opacity-0/);
  }
}
