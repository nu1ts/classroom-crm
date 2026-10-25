import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { StudentsPage } from '../page-objects/StudentsPage.js';
import { StudentDetailPage } from '../page-objects/StudentDetailPage.js';
import { AnalyticsPage } from '../page-objects/AnalyticsPage.js';
import { JournalPage } from '../page-objects/JournalPage.js';

test.describe('Аналитика и Обзор класса', () => {

  test('[TC-ANL-01] Средний балл ученика за период', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    const row = studentsPage.getStudentRow('Александров Егор');
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/4[.,]8/);

    await studentsPage.openFullSummary('Александров Егор');
    const detailPage = new StudentDetailPage(page);
    await expect(detailPage.averageGradeCard).toContainText(/4[.,]8/);
  });

  test('[TC-ANL-02] Средний балл по единственной оценке', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Романов');
    const row = studentsPage.getStudentRow('Романов Илья');
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/5[.,]0/);

    await studentsPage.openFullSummary('Романов Илья');
    const detailPage = new StudentDetailPage(page);
    await expect(detailPage.averageGradeCard).toContainText(/5[.,]0/);
  });

  test('[TC-ANL-03] Округление среднего балла', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Морозов');
    const morozovRow = studentsPage.studentRows.first();
    await expect(morozovRow).toBeVisible();
    await expect(morozovRow.locator('td').nth(2)).toContainText(/3[.,]8/);

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    const mathCard = detailPage.subjectsBlock.locator('.p-3\\.5.rounded-2xl', { hasText: 'Математика' });
    await expect(mathCard).toContainText(/3[.,]2/);
  });

  test('[TC-ANL-04] Округление ровно на половине', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('week_21_25_10');
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricAvg).toHaveText(/4[.,]2/);
  });

  test('[TC-ANL-05] Процент посещаемости ученика', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Сидоров');
    const row = studentsPage.studentRows.first();
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(3)).toContainText('12 из 40');
    await expect(row.locator('span:has-text("В зоне риска")')).toBeVisible();
  });

  test('[TC-ANL-06] Неотмеченные уроки не считаются прогулами', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Петрова');
    const row = studentsPage.studentRows.first();
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(3)).toContainText('из 40');
  });

  test('[TC-ANL-07] Посещаемость класса', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricAtt).toContainText('93.6%');
    await expect(analyticsPage.reportContainer).toContainText('Пропущено 6.4%');
  });

  test('[TC-ANL-08] Ученик без оценок за период', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('sept_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportMetricAvg).toContainText(/4[.,]2/);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto('period=sept_2024');
    await studentsPage.search('Васильева');
    const row = studentsPage.getStudentRow('Васильева');
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/—|нет данных/);
    await expect(row.locator('td').nth(3)).toContainText(/2 из 2[01]/);
  });

  test('[TC-ANL-09] Смена периода пересчитывает показатели', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('I четверть');

    await analyticsPage.selectPeriod('oct_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('Октябрь');

    await analyticsPage.selectPeriod('sept_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('Сентябрь');

    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('I четверть');
  });

  test('[TC-ANL-10] Средний балл класса: способ расчёта', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricAvg).toHaveText('4.2');
    await expect(analyticsPage.reportContainer).toContainText('303 оценок за период');
  });

  test('[TC-ANL-11] Средние баллы по предметам и порог', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();

    const mathCard = analyticsPage.reportContainer.locator('.p-3\\.5.rounded-2xl', { hasText: 'Математика' });
    await expect(mathCard).toContainText(/3[.,]9/);

    const rusCard = analyticsPage.reportContainer.locator('.p-3\\.5.rounded-2xl', { hasText: 'Русский язык' });
    await expect(rusCard).toContainText(/4[.,]3/);

    const physCard = analyticsPage.reportContainer.locator('.p-3\\.5.rounded-2xl', { hasText: 'Физика' });
    await expect(physCard).toContainText(/4([.,]0)?/);

    const histCard = analyticsPage.reportContainer.locator('.p-3\\.5.rounded-2xl', { hasText: 'История' });
    await expect(histCard).toContainText(/4[.,]4/);

    const peCard = analyticsPage.reportContainer.locator('.p-3\\.5.rounded-2xl', { hasText: 'Физкультура' });
    await expect(peCard).toContainText(/4[.,]8/);

    await expect(analyticsPage.reportContainer).toContainText('Порог зоны риска: 3.5');
  });

  test('[TC-ANL-12] Пропуски по неделям', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportContainer).toContainText('8 недель I четверти');
    await expect(analyticsPage.reportContainer).toContainText('11.4%');
  });

  test('[TC-ANL-13] Зона риска: состав и причины', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricRisk).toHaveText('5');
    await expect(analyticsPage.reportContainer).toContainText('Сидоров Никита');
    await expect(analyticsPage.reportContainer).toContainText('Волкова');
    await expect(analyticsPage.reportContainer).toContainText('Морозов');
    await expect(analyticsPage.reportContainer).toContainText('Орлов');
    await expect(analyticsPage.reportContainer).toContainText('Котов Максим');
    await expect(analyticsPage.reportContainer).toContainText('Петрова Анна');
  });

  test('[TC-ANL-14] Неподтверждённые пропуски', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricUnconfirmed).toHaveText('4');
  });

  test('[TC-ANL-15] Отчёт по классу не хранится', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportContainer).toBeVisible();

    await analyticsPage.closeReport();
    await expect(analyticsPage.reportContainer).toBeHidden();

    const navPage = new NavigationPage(page);
    await navPage.logout();
    await loginPage.loginAs('teacher');
    await analyticsPage.goto();
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportContainer).toBeVisible();
    await expect(analyticsPage.reportMetricAvg).toHaveText('4.2');
  });

  test('[TC-ANL-16] Права: классрук видит только свой класс', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await expect(page.locator('#analytics-view')).toBeVisible();
    await expect(page.locator('#analytics-view')).not.toContainText('8А класс');

    await page.goto('analytics?class=8A');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=8А класс')).toHaveCount(0);
  });

  test('[TC-ANL-17] Права: предметник видит только свои предметы и классы', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');

    await page.goto('analytics');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
  });

  test('[TC-ANL-18] Права: родитель видит показатели только своего ребёнка', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('parent');

    await page.goto('analytics');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
  });

  test('[TC-ANL-19] Отметки о присутствии не влияют на средний балл', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.evaluate(() => {
      const DB_KEY = 'classroom_crm_db';
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const db = JSON.parse(raw);
        const att24 = db.attendance?.find((a) => a.lessonId === 'lsn-39' && a.studentId === 'st-14');
        const att23 = db.attendance?.find((a) => a.lessonId === 'lsn-38' && a.studentId === 'st-14');
        if (att24) {
          att24.value = 'present';
          att24.status = 'present';
          att24.code = 'Был';
          att24.reason = null;
          att24.confirmedBy = null;
          att24.confirmedAt = null;
          att24.document = null;
        }
        if (att23) {
          att23.value = 'absent';
          att23.status = 'confirmed';
          att23.code = 'УП';
        }
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      }
    });

    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.search('Сидоров');
    let row = studentsPage.getStudentRow('Сидоров');
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/3[.,]1/);

    const navPage = new NavigationPage(page);
    await navPage.logout();
    await loginPage.loginAs('subject_teacher');

    const journalPage = new JournalPage(page);
    await journalPage.goto('class=class-7b&subject=math');
    const btn = journalPage.getAbsenceBtn('Сидоров Никита', '2024-10-24');
    await expect(btn).toBeVisible();
    await btn.click();
    await journalPage.saveJournal();

    await navPage.logout();
    await loginPage.loginAs('teacher');
    await studentsPage.goto();
    await studentsPage.search('Сидоров');
    row = studentsPage.getStudentRow('Сидоров');
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/3[.,]1/);
    await expect(row.locator('td').nth(3)).toContainText('13 из 40');
  });

  test('[TC-ANL-20] Уважительная причина остаётся пропуском', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-14');

    await expect(detailPage.absencesTotalCard).toContainText('12 уроков');

    const confirmBtn = page.locator('.btn-confirm-absence-action').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      const modal = page.locator('#modal-confirm-student-absence');
      await expect(modal).toHaveClass(/opacity-100/);
      await page.locator('#form-confirm-student-absence button[type="submit"]').click();
      await expect(modal).toHaveClass(/opacity-0/);
    }

    await detailPage.goto('st-14');
    await expect(detailPage.absencesTotalCard).toContainText('12 уроков');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportMetricUnconfirmed).toHaveText('3');
  });

  test('[TC-ANL-21] Показатели пересчитываются после новой оценки', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportMetricAvg).toContainText(/4[.,]2/);

    const navPage = new NavigationPage(page);
    await navPage.logout();
    await loginPage.loginAs('subject_teacher');

    const journalPage = new JournalPage(page);
    await journalPage.goto('class=class-7b&subject=math');
    await journalPage.setGrade('Александров Егор', '2024-10-24', '2');
    await journalPage.saveJournal();

    await navPage.logout();
    await loginPage.loginAs('teacher');
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportMetricAvg).toContainText(/4[.,]2/);
    await expect(analyticsPage.reportContainer).toContainText('304');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.search('Александров');
    const aleksandrovRow = studentsPage.getStudentRow('Александров Егор');
    await expect(aleksandrovRow).toBeVisible();
    await expect(aleksandrovRow.locator('td').nth(2)).toContainText(/4[.,]6/);

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-01');
    await expect(detailPage.averageGradeCard).toContainText(/4[.,]6/);
    await expect(detailPage.subjectsBlock).toContainText(/4[.,]0/);
  });

  
  test('[TC-ANL-22] Аналитика за период без данных (каникулы)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
    await analyticsPage.selectPeriod('holidays_nov_2024');
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricAvg).toContainText(/—|нет данных/);
    await expect(analyticsPage.reportMetricAtt).toContainText(/—|нет данных/);
    await expect(analyticsPage.riskSection).toContainText(/Учеников в зоне риска за данный период нет|0/);

    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportMetricAvg).toContainText(/4[.,]2/);
    await expect(analyticsPage.reportMetricAtt).toContainText(/93[.,]6/);
  });

  test('[TC-OV-01] Список учеников класса', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.counterLabel).toContainText('28');

    const firstStudent = studentsPage.studentRows.first();
    await expect(firstStudent).toContainText('Александров');

    await studentsPage.search('Петрова');
    const petrovaRow = studentsPage.studentRows.first();
    await expect(petrovaRow).toBeVisible();
    await expect(petrovaRow.locator('td').nth(4)).toContainText('Петров');
    await expect(petrovaRow.locator('td').nth(4)).toContainText('+7 999 123-45-63');
  });

  test('[TC-OV-02] Показатели списка совпадают со сводкой', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Петрова');
    const petrovaRow = studentsPage.studentRows.first();
    await expect(petrovaRow.locator('td').nth(2)).toContainText(/4[.,]5/);
    await expect(petrovaRow.locator('td').nth(3)).toContainText('4 из 40');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');
    await expect(detailPage.averageGradeCard).toContainText(/4[.,]5/);
    await expect(detailPage.absencesTotalCard).toContainText('4 дня');

    await studentsPage.goto();
    await studentsPage.search('Сидоров');
    const sidorovRow = studentsPage.studentRows.first();
    await expect(sidorovRow.locator('td').nth(2)).toContainText(/3[.,]1/);
    await expect(sidorovRow.locator('td').nth(3)).toContainText('12 из 40');

    await detailPage.goto('st-14');
    await expect(detailPage.averageGradeCard).toContainText(/3[.,]1/);
    await expect(detailPage.absencesTotalCard).toContainText('12 уроков');
  });

  test('[TC-OV-03] Поиск по фамилии', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('сидор');
    await expect(studentsPage.studentRows).toHaveCount(1);
    await expect(studentsPage.studentRows.first()).toContainText('Сидоров Никита');
    await expect(studentsPage.counterLabel).toContainText('1 из 28');

    await studentsPage.clearSearch();
    await expect(studentsPage.studentRows).toHaveCount(10);
    await expect(studentsPage.counterLabel).toContainText('28');
  });

  test('[TC-OV-04] Фильтр по пропускам', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.toggleAbsencesFilter();
    await expect(studentsPage.studentRows.filter({ hasText: 'Александров Егор' })).toHaveCount(0);
    await expect(studentsPage.counterLabel).toContainText('из 25');

    await studentsPage.search('Сидоров');
    await expect(studentsPage.studentRows).toHaveCount(1);
    await expect(studentsPage.studentRows.first()).toContainText('Сидоров Никита');

    await studentsPage.clearSearch();
    await studentsPage.toggleAbsencesFilter();
    await expect(studentsPage.studentRows.filter({ hasText: 'Александров Егор' })).toHaveCount(1);
  });

  test('[TC-OV-05] Статус ученика и бейдж зоны риска', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    const statusCells = studentsPage.studentRows.locator('td:nth-child(2)');
    const count = await statusCells.count();
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toContainText('Активен');
    }

    await studentsPage.search('Сидоров');
    await expect(studentsPage.studentRows.first().locator('span:has-text("В зоне риска")')).toBeVisible();

    await studentsPage.search('Петрова');
    await expect(studentsPage.studentRows.first().locator('span:has-text("В зоне риска")')).toBeVisible();

    await studentsPage.search('Александров');
    await expect(studentsPage.studentRows.first().locator('span:has-text("В зоне риска")')).toHaveCount(0);
  });

  test('[TC-OV-06] Комбинация поиска и фильтра', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.toggleAbsencesFilter();
    await studentsPage.search('петров');

    await expect(studentsPage.studentRows).toHaveCount(1);
    await expect(studentsPage.studentRows.first()).toContainText('Петрова Анна');
    await expect(studentsPage.counterLabel).toContainText('1 из 28');
  });

  test('[TC-OV-07] Пустой результат фильтра', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.toggleAbsencesFilter();
    await studentsPage.search('александров');

    await expect(studentsPage.studentRows).toHaveCount(0);
    await expect(page.locator('text="Ничего не найдено"')).toBeVisible();
    await expect(studentsPage.btnResetFilters).toBeVisible();

    await studentsPage.btnResetFilters.click();
    await expect(studentsPage.studentRows).toHaveCount(10);
  });

  test('[TC-OV-08] Пагинация: страницы по 10', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.studentRows).toHaveCount(10);
    await expect(studentsPage.counterLabel).toContainText('1–10 из 28');

    await studentsPage.goToPage('2');
    await expect(studentsPage.studentRows).toHaveCount(10);
    await expect(studentsPage.counterLabel).toContainText('11–20 из 28');

    await studentsPage.goToPage('3');
    await expect(studentsPage.studentRows).toHaveCount(8);
    await expect(studentsPage.counterLabel).toContainText('21–28 из 28');
  });

  test('[TC-OV-09] Переход по страницам сохраняет фильтр и сортировку', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('ов');
    await studentsPage.sortByGrade.click();

    await expect(studentsPage.paginationPages.first()).toBeVisible();
    await studentsPage.goToPage('2');

    await expect(studentsPage.searchInput).toHaveValue('ов');
    const countOnPage2 = await studentsPage.studentRows.count();
    expect(countOnPage2).toBeGreaterThan(0);
    expect(countOnPage2).toBeLessThanOrEqual(10);

    await studentsPage.goToPage('1');
    await expect(studentsPage.searchInput).toHaveValue('ов');
  });

  test('[TC-OV-10] Сортировка по показателю', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.sortByGrade.click();
    await expect(studentsPage.studentRows.first()).toContainText('Сидоров Никита');
    await expect(studentsPage.studentRows.first().locator('td').nth(2)).toContainText(/3[.,]1/);

    await studentsPage.sortByGrade.click();
    const firstRow = studentsPage.studentRows.first();
    await expect(firstRow.locator('td').nth(2)).toContainText(/5[.,]0/);
  });

  test('[TC-OV-11] Переход в детальную сводку ученика', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('Петрова');
    await studentsPage.openFullSummary('Петрова Анна');

    await expect(page).toHaveURL(/\/student\/?\?id=st-23/);
    await expect(page.locator('h1')).toHaveText('Петрова Анна Сергеевна');

    await page.locator('#student-summary-view nav a:has-text("Ученики")').click();
    await expect(page).toHaveURL(/\/students\/?/);
  });

  test('[TC-OV-12] Детальная сводка: состав данных', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.breadcrumbs).toContainText('Класс 7Б');
    await expect(detailPage.breadcrumbs).toContainText('Ученики');
    await expect(detailPage.breadcrumbs).toContainText('Петрова Анна Сергеевна');

    await expect(detailPage.studentFullName).toHaveText('Петрова Анна Сергеевна');
    await expect(detailPage.birthDateLabel).toContainText('12.04.2011');
    await expect(detailPage.birthDateLabel).toContainText('13 лет');
    await expect(detailPage.activeBadge).toBeVisible();

    await expect(detailPage.averageGradeCard).toContainText(/4[.,]5/);
    await expect(detailPage.absencesTotalCard).toContainText('4 дня');
    await expect(detailPage.excusedAbsencesCard).toContainText('4');

    await expect(detailPage.parentsContactsBlock).toContainText('Петров Сергей');
    await expect(detailPage.parentsContactsBlock).toContainText('+7 999 123-45-63');
    await expect(detailPage.parentsContactsBlock).toContainText('Основной контакт');
    await expect(detailPage.parentsContactsBlock).toContainText('Петрова Елена');
    await expect(detailPage.parentsContactsBlock).toContainText('+7 999 765-43-21');
    await expect(detailPage.parentsContactsBlock).not.toContainText('Эл. почта');
  });

  test('[TC-OV-13] Сводка: средние баллы по предметам', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.subjectsBlock).toContainText('Математика');
    await expect(detailPage.subjectsBlock).toContainText(/3[.,]2/);
    await expect(detailPage.subjectsBlock).toContainText('Русский язык');
    await expect(detailPage.subjectsBlock).toContainText(/4[.,]6/);
    await expect(detailPage.subjectsBlock).toContainText('Физика');
    await expect(detailPage.subjectsBlock).toContainText(/4[.,]0/);
    await expect(detailPage.subjectsBlock).toContainText('История');
    await expect(detailPage.subjectsBlock).toContainText(/4[.,]5/);
    await expect(detailPage.subjectsBlock).toContainText('Физкультура');
    await expect(detailPage.subjectsBlock).toContainText(/5[.,]0/);

    const mathCard = detailPage.subjectsBlock.locator('.p-3\\.5.rounded-2xl', { hasText: 'Математика' });
    await expect(mathCard).toHaveClass(/border-rose/);
  });

  test('[TC-OV-14] Последние пропуски: дата, уроки, причина, статус', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.recentAbsencesBlock).toContainText('25.10.2024');
    await expect(detailPage.recentAbsencesBlock).toContainText('Подтверждено');

    await expect(detailPage.recentAbsencesBlock).toContainText('24.10.2024');
    await expect(detailPage.recentAbsencesBlock).toContainText('По болезни (ОРВИ)');
    await expect(detailPage.recentAbsencesBlock.locator('.btn-confirm-absence-action')).toBeVisible();
  });

  test('[TC-OV-15] Заметки классрука', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.notesBlock).toContainText('Приватно (только для классрука)');

    await detailPage.btnOpenNoteModal.click();
    const modalNote = page.locator('#modal-add-note');
    await expect(modalNote).toHaveClass(/opacity-100/);

    const noteText = `Тестовое наблюдение от ${Date.now()}`;
    await page.locator('#note-text-input').fill(noteText);
    await page.locator('#btn-submit-note-modal').click();
    await expect(modalNote).toHaveClass(/opacity-0/);

    await expect(detailPage.notesBlock).toContainText(noteText);
    await expect(detailPage.notesBlock).toContainText('Смирнова М. В.');
  });

  test('[TC-OV-16] История общения с родителями', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.contactsHistoryBlock).toContainText('24.10.2024');
    await expect(detailPage.contactsHistoryBlock).toContainText('15.10.2024');
    await expect(detailPage.contactsHistoryBlock).toContainText('Смирнова М. В.');

    await detailPage.btnOpenContactModal.click();
    const modalContact = page.locator('#modal-contact-parent');
    await expect(modalContact).toHaveClass(/opacity-100/);

    const contactDate = page.locator('#contact-date');
    await contactDate.fill('2024-10-26');
    const contactSummary = `Контрольный разговор от ${Date.now()}`;
    await page.locator('#contact-summary-input').fill(contactSummary);
    await page.locator('#btn-submit-contact-modal').click();
    await expect(modalContact).toHaveClass(/opacity-0/);

    await expect(detailPage.contactsHistoryBlock).toContainText(contactSummary);
  });

  test('[TC-OV-17] Сводка только для чтения', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const detailPage = new StudentDetailPage(page);
    await detailPage.goto('st-23');

    await expect(detailPage.averageGradeCard.locator('input, textarea')).toHaveCount(0);
    await expect(detailPage.subjectsBlock.locator('input, select')).toHaveCount(0);
  });

  test('[TC-OV-18] Родитель открывает сводку своего ребёнка', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    await expect(page.locator('h1:has-text("Петрова Анна Сергеевна")')).toBeVisible();
    await expect(page.locator('text=Сводка по посещаемости: Петрова Анна')).toBeVisible();
    await expect(page.locator('text=Средний балл: 4.50')).toBeVisible();

    const gradesTable = page.locator('#child-grades-table');
    await expect(gradesTable).toBeVisible();
    await expect(gradesTable.locator('text=Математика (Алгебра)')).toBeVisible();
    await expect(page.locator('text=Посещаемость и пропуски')).toBeVisible();
    await expect(page.locator('text=Подтверждено справкой').first()).toBeVisible();

    await expect(page.locator('button:has-text("Редактировать")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Выставить оценку")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Зафиксировать контакт")')).toHaveCount(0);

    await expect(page.locator('text=Заметки классрука')).toHaveCount(0);
    await expect(page.locator('text=История общения с родителями')).toHaveCount(0);
  });

  test('[TC-OV-19] Родитель и ученик: чужие ученики недоступны', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.loginAs('parent');

    await page.goto('student?id=st-14');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();

    await navPage.logout();

    await loginPage.loginAs('student');

    await page.goto('student?id=st-14');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
  });

});
