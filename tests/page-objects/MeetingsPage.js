import { expect } from '@playwright/test';

export class MeetingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.pageTitle = page.locator('#meetings-page-title');
    this.sectionNextMeeting = page.locator('#section-next-meeting');
    this.sectionOtherUpcoming = page.locator('#section-other-upcoming');
    this.sectionPastMeetings = page.locator('#section-past-meetings');
    this.btnOpenCreateModal = page.locator('#btn-create-meeting');

    this.modalForm = page.locator('#modal-meeting-form');
    this.modalFormTitle = page.locator('#modal-meeting-form-title');
    this.inputTitle = page.locator('#meeting-title-input');
    this.inputDate = page.locator('#meeting-date-input');
    this.inputTime = page.locator('#meeting-time-input');
    this.inputRoom = page.locator('#meeting-room-input');
    this.inputNewAgendaItem = page.locator('#input-new-agenda-item');
    this.agendaItems = page.locator('#modal-agenda-items-container .agenda-item');
    this.btnAddAgenda = page.locator('#btn-add-agenda-item');
    this.btnSaveMeeting = page.locator('#btn-save-meeting');
    this.errorTitle = page.locator('#error-meeting-title');
    this.errorDate = page.locator('#error-meeting-date');
    this.errorTime = page.locator('#error-meeting-time');

    this.modalCancelMeeting = page.locator('#modal-cancel-meeting');
    this.btnConfirmCancel = page.locator('#btn-confirm-cancel-meeting');

    this.modalAttendance = page.locator('#modal-meeting-attendance');
    this.attendanceCounterBadge = page.locator('#attendance-counter-badge');
    this.attendanceRows = page.locator('#attendance-table-body tr');
    this.btnSaveAttendance = page.locator('#btn-save-attendance');

    this.modalSummary = page.locator('#modal-meeting-summary');
    this.summaryPercentageText = page.locator('#summary-percentage-text');
    this.summaryRatioText = page.locator('#summary-ratio-text');
    this.summaryAbsentList = page.locator('#summary-absent-list');
    this.btnSummaryOpenAttendance = page.locator('#btn-summary-open-attendance');
  }

  async goto() {
    await this.page.goto('meetings/');
    await expect(this.pageTitle).toBeVisible();
  }

  pastMeeting(title) {
    return this.sectionPastMeetings.locator('[data-meeting-id]', { hasText: title });
  }
}
