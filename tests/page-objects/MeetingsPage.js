export class MeetingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.pageTitle = page.locator('h1:has-text("Родительские собрания")');
    this.sectionNextMeeting = page.locator('#section-next-meeting');
    this.sectionUpcomingMeetings = page.locator('#section-upcoming-meetings');
    this.sectionPastMeetings = page.locator('#section-past-meetings');

    this.btnOpenCreateModal = page.locator('#btn-create-meeting');

    this.modalForm = page.locator('#modal-meeting-form');
    this.modalFormTitle = page.locator('#meeting-form-modal-title');
    this.inputTitle = page.locator('#meeting-title');
    this.inputDate = page.locator('#meeting-date');
    this.inputTime = page.locator('#meeting-time');
    this.inputLocation = page.locator('#meeting-location');
    this.agendaContainer = page.locator('#meeting-agenda-items');
    this.btnAddAgenda = page.locator('#btn-add-agenda-item');
    this.btnSaveMeeting = page.locator('#btn-save-meeting');
    this.btnCancelMeetingForm = page.locator('#btn-cancel-meeting-form');

    this.modalCancelMeeting = page.locator('#modal-cancel-meeting');
    this.inputCancelReason = page.locator('#cancel-reason');
    this.btnConfirmCancel = page.locator('#btn-confirm-cancel-meeting');

    this.modalAttendance = page.locator('#modal-meeting-attendance');
    this.attendanceCounterBadge = page.locator('#attendance-counter-badge');
    this.attendancePresentCount = page.locator('#attendance-present-count');
    this.attendanceTotalCount = page.locator('#attendance-total-count');
    this.attendanceTableBody = page.locator('#attendance-table-body');
    this.attendanceRows = page.locator('#attendance-table-body tr');
    this.btnSaveAttendance = page.locator('#btn-save-attendance');
    this.btnCloseAttendance = page.locator('#btn-close-attendance-modal');

    this.modalSummary = page.locator('#modal-meeting-summary');
    this.summaryPercentageText = page.locator('#summary-percentage-text');
    this.summaryRatioText = page.locator('#summary-ratio-text');
    this.summaryAbsentList = page.locator('#summary-absent-list');
    this.btnSummaryOpenAttendance = page.locator('#btn-summary-open-attendance');
    this.btnCloseSummary = page.locator('#btn-close-summary-modal');
  }

  async goto() {
    await this.page.goto('meetings');
  }
}
