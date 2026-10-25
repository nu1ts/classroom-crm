import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { JournalPage } from '../page-objects/JournalPage.js';
import { SchedulePage } from '../page-objects/SchedulePage.js';

test.describe('Тест-кейсы «Журнал» и «Расписание» (Copy of Тест-кейсы «Журнал» и «Расписание».xlsx)', () => {

  test.describe('Группа 1: Журнал учителя / классного руководителя (TC-TCH-01 .. TC-TCH-16)', () => {

    test('[TC-TCH-01] Выставление оценки одному ученику за урок', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.setGrade('Александров Егор', '2024-10-24', '5');
      await journalPage.saveJournal();

      await page.reload();
      const input = journalPage.getGradeInput('Александров Егор', '2024-10-24');
      await expect(input).toHaveValue('5');
    });

    test('[TC-TCH-02] Выставление оценок нескольким ученикам за один урок', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.setGrade('Александров Егор', '2024-10-24', '5');
      await journalPage.setGrade('Васильева Дарья', '2024-10-24', '4');
      await journalPage.setGrade('Кузнецов Данила', '2024-10-24', '3');
      await journalPage.saveJournal();

      await page.reload();
      await expect(journalPage.getGradeInput('Александров Егор', '2024-10-24')).toHaveValue('5');
      await expect(journalPage.getGradeInput('Васильева Дарья', '2024-10-24')).toHaveValue('4');
      await expect(journalPage.getGradeInput('Кузнецов Данила', '2024-10-24')).toHaveValue('3');
    });

    test('[TC-TCH-03] Допустимые значения оценки', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const input = journalPage.getGradeInput('Васильева Дарья', '2024-10-24');

      for (const invalid of ['1', '6', '0', 'х']) {
        await input.fill(invalid);
        await expect(input).toHaveClass(/border-rose/);
      }

      await input.fill('5');
      await expect(input).toHaveClass(/border-emerald/);
      await journalPage.saveJournal();

      await page.reload();
      await expect(journalPage.getGradeInput('Васильева Дарья', '2024-10-24')).toHaveValue('5');
    });

    test('[TC-TCH-04] Изменение своей оценки, пока урок открыт', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.setGrade('Александров Егор', '2024-10-24', '5');
      await journalPage.saveJournal();

      await page.reload();
      await expect(journalPage.getGradeInput('Александров Егор', '2024-10-24')).toHaveValue('5');
    });

    test('[TC-TCH-05] Удаление своей оценки, пока урок открыт', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const input = journalPage.getGradeInput('Александров Егор', '2024-10-24');
      await input.fill('');
      await journalPage.saveJournal();

      await page.reload();
      await expect(journalPage.getGradeInput('Александров Егор', '2024-10-24')).toHaveValue('');
    });

    test('[TC-TCH-06] Попытка изменить оценку после закрытия урока', async ({ page }) => {
      
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math&week=w1');
      const cell = journalPage.entryCells.first();
      await expect(cell).toBeVisible();

      const input = cell.locator('input.grade-input');
      if (await input.count() > 0) {
        await expect(input).toBeDisabled();
      }

      await cell.click();
      await expect(journalPage.entryModal).toHaveClass(/opacity-100/);
      const commentText = 'Комментарий к закрытому уроку';
      await journalPage.addComment(commentText);
      await expect(journalPage.commentsList).toContainText(commentText);
      await journalPage.closeEntryModal();
    });

    test('[TC-TCH-07] Правка отметки отсутствия до подтверждения причины', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const btn = journalPage.getAbsenceBtn('Петрова Анна', '2024-10-24');
      await expect(btn).toContainText('Н');
      await btn.click();
      await journalPage.saveJournal();

      await page.reload();
      const inputAfter = journalPage.getGradeInput('Петрова Анна', '2024-10-24');
      await expect(inputAfter).toBeEnabled();
    });

    test('[TC-TCH-08] Отметка отсутствия не меняется после подтверждения причины', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const btn = journalPage.getAbsenceBtn('Сидоров Никита', '2024-10-24');
      await expect(btn).toContainText('Б');
      await expect(btn).toHaveClass(/cursor-not-allowed/);
      await expect(btn).toHaveAttribute('title', /Причина подтверждена классным руководителем/i);
    });

    test('[TC-TCH-09] Оценка не ставится ученику, отмеченному отсутствующим', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const input = journalPage.getGradeInput('Петрова Анна', '2024-10-24');
      await expect(input).toBeDisabled();
      await expect(input).toHaveAttribute('title', /Ученик отсутствовал/i);
    });

    test('[TC-TCH-10] Отметка отсутствующих на уроке для нескольких учеников', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.toggleAbsence('Васильева Дарья', '2024-10-24');
      await journalPage.toggleAbsence('Кузнецов Данила', '2024-10-24');
      await journalPage.saveJournal();

      await page.reload();
      await expect(journalPage.getAbsenceBtn('Васильева Дарья', '2024-10-24')).toContainText('Н');
      await expect(journalPage.getAbsenceBtn('Кузнецов Данила', '2024-10-24')).toContainText('Н');
    });

    test('[TC-TCH-11] Комментарий предметника к своей записи', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.openCell('Кузнецов Данила', '2024-10-24');

      const commentText = 'Не выполнил домашнее задание';
      await journalPage.addComment(commentText);

      await expect(journalPage.commentsList).toContainText(commentText);
      await expect(journalPage.commentsList).toContainText('Козлов А. П.');
      await expect(journalPage.commentsList).toContainText('Предметник');

      await journalPage.closeEntryModal();

      await page.evaluate(() => window.localStorage.removeItem('classroom_crm_session'));
      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');
      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.openCell('Кузнецов Данила', '2024-10-24');
      await expect(journalPage.commentsList).toContainText(commentText);
      await expect(journalPage.commentsList).toContainText('Козлов А. П.');
    });

    test('[TC-TCH-12] Комментарий классрука к записи журнала', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();
      await journalPage.openCell('Александров Егор', '2024-10-24');

      const commentText = 'Родители уведомлены, справка ожидается';
      await journalPage.addComment(commentText);

      await expect(journalPage.commentsList).toContainText(commentText);
      await expect(journalPage.commentsList).toContainText('Смирнова М. В.');
      await expect(journalPage.commentsList).toContainText('Классрук');

      await journalPage.closeEntryModal();
      const cell = journalPage.getCell('Александров Егор', '2024-10-24');
      await expect(cell.locator('.indicator-comment')).toBeVisible();
    });

    test('[TC-TCH-13] Предметник видит только свои предметы и классы', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const navPage = new NavigationPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await navPage.expectVisibleMenuItems(['nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile']);

      await navPage.expectHiddenMenuItems(['nav-journal']);

      await page.goto('journal');

      await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);
    });

    test('[TC-TCH-14] Классрук просматривает журнал по всем предметам, но не меняет записи', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();
      await journalPage.selectSubject('math');

      await expect(journalPage.studentRows.first()).toBeVisible();
      await expect(journalPage.entryCells.first()).toBeVisible();

      await expect(journalPage.table.locator('input[type="number"], input.grade-input')).toHaveCount(0);

      await journalPage.openCell('Васильева Дарья', '2024-10-24');
      const noteText = 'Проверено классным руководителем';
      await journalPage.addComment(noteText);
      await expect(journalPage.commentsList).toContainText(noteText);
      await journalPage.closeEntryModal();
    });

    test('[TC-TCH-15] Сетка журнала: отображение записей за период', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();
      await journalPage.selectWeek('all');
      await journalPage.selectSubject('all');

      await expect(journalPage.studentRows).toHaveCount(28);

      await expect(page.locator('td.cell-journal-entry span:has-text("5")').first()).toBeVisible();
      await expect(page.locator('td.cell-journal-entry span:has-text("4")').first()).toBeVisible();

      await expect(page.locator('td.cell-journal-entry span:has-text("Н")').first()).toBeVisible();
      await expect(page.locator('td.cell-journal-entry span:has-text("Б")').first()).toBeVisible();

      await expect(page.locator('td.cell-journal-entry span:has-text("·")').first()).toBeVisible();
    });

    test('[TC-TCH-16] Фильтр «Показывать только записи»', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');
      await journalPage.goto();

      const initialHeaderCount = await journalPage.headerCells.count();

      await journalPage.toggleOnlyEntries();

      const filteredHeaderCount = await journalPage.headerCells.count();
      expect(filteredHeaderCount).toBeLessThan(initialHeaderCount);

      await journalPage.toggleOnlyEntries();

      const restoredHeaderCount = await journalPage.headerCells.count();
      expect(restoredHeaderCount).toBe(initialHeaderCount);
    });

  });

  test.describe('Группа 2: Медицинские справки и подтверждение уважительных причин (TC-MED-01 .. TC-MED-05)', () => {

    test('[TC-MED-01] Подтверждение медицинской справки: пропуск становится уважительным', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();
      const cell = journalPage.getCell('Петрова Анна', '2024-10-24');
      await expect(cell).toContainText('Н');

      await cell.click();
      await expect(journalPage.entryModal).toBeVisible();

      await journalPage.submitAbsenceConfirmation({
        reasonType: 'excused',
        hasDoc: true,
        docText: 'Справка № 142 от 25.10.2024 (ДГП № 1)',
        notes: 'ОРВИ'
      });

      await expect(cell).toContainText('Б');
      await expect(cell).not.toContainText('Н');
    });

    test('[TC-MED-02] Одна справка закрывает несколько дней пропуска', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();

      const cell24 = journalPage.getCell('Петрова Анна', '2024-10-24');
      await cell24.click();
      await expect(journalPage.entryModal).toBeVisible();
      await journalPage.submitAbsenceConfirmation({
        reasonType: 'excused',
        hasDoc: true,
        docText: 'Справка № 142 от 25.10.2024 (ДГП № 1)',
        notes: 'ОРВИ'
      });

      await expect(cell24).toContainText('Б');
      await expect(cell24).not.toContainText('Н');

      const cell25 = journalPage.getCell('Петрова Анна', '2024-10-25').first();
      await expect(cell25).toContainText('Б');

      await page.goto('attendance/?week=w8');
      const petrovaRow = page.locator('tr:has-text("Петрова Анна")');
      await expect(petrovaRow).toBeVisible();
      await expect(petrovaRow).toContainText('УП');
      await expect(petrovaRow).not.toContainText('Н (Нп)');
    });

    test('[TC-MED-03] Отказ в подтверждении справки', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await journalPage.goto();
      const cell = journalPage.getCell('Петрова Анна', '2024-10-24');
      await cell.click();
      await expect(journalPage.entryModal).toBeVisible();

      await journalPage.submitAbsenceConfirmation({
        reasonType: 'unexcused',
        hasDoc: false,
        notes: 'Справка не предоставлена'
      });

      await cell.click();
      await expect(journalPage.entryModal).toBeVisible();

      await expect(journalPage.entryModalAttendanceBadge).toContainText('Н');
      await expect(journalPage.entryModalAttendanceBadge).toContainText('Не подтверждено');
      await expect(journalPage.quickConfirmBtn).toBeVisible();

      await journalPage.closeEntryModal();
    });

    test('[TC-MED-04] Предметник не может подтвердить справку', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      await journalPage.openCell('Сидоров Никита', '2024-10-24');
      await expect(journalPage.quickConfirmBlock).toBeHidden();
      await journalPage.closeEntryModal();

      await page.goto('attendance?class=class-7b');
      await expect(page.locator('#btn-open-batch-confirm')).toHaveCount(0);
      await expect(page.locator('#btn-banner-confirm')).toHaveCount(0);
      await expect(page.locator('button[data-action="open-confirm"]')).toHaveCount(0);
    });

    test('[TC-MED-05] Подтверждение не удаляет пропуск из журнала', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');
      await journalPage.goto();

      const cell = journalPage.getCell('Петрова Анна', '2024-10-24');
      await expect(cell).toContainText('Н');

      await cell.click();
      await journalPage.submitAbsenceConfirmation({
        reasonType: 'excused',
        hasDoc: true,
        docText: 'Справка № 108 от 24.10.2024',
        notes: 'Уважительная причина'
      });

      await expect(cell).toBeVisible();
      await expect(cell).toContainText('Б');
      await expect(cell).not.toContainText('·');
    });

  });

  test.describe('Группа 3: Расписание уроков (TC-SCH-01 .. TC-SCH-11)', () => {

    test('[TC-SCH-01] Расписание класса на неделю для классного руководителя', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      const cards = page.locator('.schedule-card[data-class-id="class-7b"]');
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      const firstCard = cards.first();
      await expect(firstCard.locator('.lesson-teacher')).toBeVisible();
      await expect(firstCard).toContainText('Каб.');
    });

    test('[TC-SCH-02] Переключение недель', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-week-title')).toContainText('21.10.2024');

      await page.locator('#btn-prev-week').click();
      await expect(page.locator('#schedule-week-title')).toContainText('14.10.2024');

      await page.locator('#btn-next-week').click();
      await expect(page.locator('#schedule-week-title')).toContainText('21.10.2024');

      await page.locator('#btn-prev-week').click();
      await page.locator('#btn-prev-week').click();
      await expect(page.locator('#schedule-week-title')).toContainText('07.10.2024');

      await page.locator('#btn-current-week').click();
      await expect(page.locator('#schedule-week-title')).toContainText('21.10.2024');
    });

    test('[TC-SCH-03] Расписание ребёнка в роли родителя', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('petrov@mail.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      await expect(page.locator('.schedule-card[data-class-id="class-7b"]').first()).toBeVisible();
      await expect(page.locator('#schedule-class-badge')).toContainText('7Б');

      await expect(page.locator('#btn-add-lesson')).toHaveCount(0);
      await expect(page.locator('button[data-action="edit-lesson"]')).toHaveCount(0);
      await expect(page.locator('button[data-action="delete-lesson"]')).toHaveCount(0);
      await expect(page.locator('input[type="text"]')).toHaveCount(0);
    });

    test('[TC-SCH-04] Расписание в роли ученика и подсветка текущего дня', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('petrova.a@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      await expect(page.locator('th[data-today="true"]')).toBeVisible();

      await expect(page.locator('#btn-add-lesson')).toHaveCount(0);
      await expect(page.locator('button[data-action="edit-lesson"]')).toHaveCount(0);
      await expect(page.locator('button[data-action="delete-lesson"]')).toHaveCount(0);
    });

    test('[TC-SCH-05] Родитель и ученик не видят расписание чужого класса', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login('petrov@mail.ru', 'Test#2024');

      await page.goto('schedule?classId=class-8a');
      await expect(page.locator('#schedule-forbidden-alert')).toBeVisible();
      await expect(page.locator('#schedule-class-badge')).toContainText('7Б');
      await expect(page.locator('.schedule-card[data-class-id="class-8a"]')).toHaveCount(0);
      await expect(page.locator('.schedule-card[data-class-id="class-7b"]').first()).toBeVisible();

      const navPage = new NavigationPage(page);
      await navPage.logout();
      await loginPage.goto();
      await loginPage.login('petrova.a@school.ru', 'Test#2024');

      await page.goto('schedule?classId=class-8a');
      await expect(page.locator('#schedule-forbidden-alert')).toBeVisible();
      await expect(page.locator('#schedule-class-badge')).toContainText('7Б');
      await expect(page.locator('.schedule-card[data-class-id="class-8a"]')).toHaveCount(0);
      await expect(page.locator('.schedule-card[data-class-id="class-7b"]').first()).toBeVisible();
    });

    test('[TC-SCH-06] Одно расписание для всех ролей: состав занятий совпадает', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');
      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();
      const teacherLessons = await page.locator('.schedule-card').allInnerTexts();

      const navPage = new NavigationPage(page);

      await navPage.logout();
      await loginPage.goto();
      await loginPage.login('petrov@mail.ru', 'Test#2024');
      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();
      const parentLessons = await page.locator('.schedule-card').allInnerTexts();

      await navPage.logout();
      await loginPage.goto();
      await loginPage.login('petrova.a@school.ru', 'Test#2024');
      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();
      const studentLessons = await page.locator('.schedule-card').allInnerTexts();

      expect(parentLessons.length).toBe(teacherLessons.length);
      expect(studentLessons.length).toBe(teacherLessons.length);
      expect(parentLessons).toEqual(teacherLessons);
      expect(studentLessons).toEqual(teacherLessons);
    });

    test('[TC-SCH-07] Своё расписание учителя-предметника по всем классам', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      await expect(page.locator('.schedule-card[data-class-id="class-7b"]').first()).toBeVisible();
      await expect(page.locator('.schedule-card[data-class-id="class-8a"]').first()).toBeVisible();
      await expect(page.locator('.schedule-card[data-class-id="class-9v"]').first()).toBeVisible();

      await expect(page.locator('#btn-add-lesson')).toHaveCount(0);
      await expect(page.locator('button[data-action="edit-lesson"]')).toHaveCount(0);
      await expect(page.locator('button[data-action="delete-lesson"]')).toHaveCount(0);

      const cardTexts = await page.locator('.schedule-card').allInnerTexts();
      for (const text of cardTexts) {
        expect(text).not.toContain('Русский язык');
        expect(text).not.toContain('Физика');
        expect(text).not.toContain('Физкультура');
        expect(text).not.toContain('Разговоры о важном');
      }
    });

    test('[TC-SCH-08] Добавление занятия и проверка занятости аудитории', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      await page.locator('#btn-add-lesson').click();
      await expect(page.locator('#modal-lesson-form')).toBeVisible();

      await page.locator('#lesson-subject-select').selectOption('Физика');
      if (await page.locator('#lesson-class-select').isEnabled()) { await page.locator('#lesson-class-select').selectOption('class-7b'); }
      await page.locator('#lesson-date-select').selectOption('2024-10-22');
      await page.locator('#lesson-time-select').selectOption('11:30 - 12:15');
      await page.locator('#lesson-room-select').selectOption('Каб. 401');

      await page.locator('#btn-save-lesson').click();
      await expect(page.locator('#modal-lesson-form')).toBeHidden();

      const physicsCard = page.locator('.schedule-card:has-text("Физика"):has-text("Каб. 401")');
      await expect(physicsCard).toBeVisible();

      await page.locator('#btn-add-lesson').click();
      await expect(page.locator('#modal-lesson-form')).toBeVisible();

      await expect(page.locator('#lesson-class-select')).toBeDisabled();
      await page.locator('#lesson-subject-select').selectOption('История');
      await expect(page.locator('#lesson-teacher-select')).toContainText('Смирнова М. В.');
      await expect(page.locator('#lesson-teacher-select')).not.toContainText('Козлов А. П.');
      await page.locator('#lesson-date-select').selectOption('2024-10-22');
      await page.locator('#lesson-time-select').selectOption('11:30 - 12:15');
      await page.locator('#lesson-room-select').selectOption('Каб. 401');

      await page.locator('#btn-save-lesson').click();

      await expect(page.locator('#lesson-room-conflict-error')).toBeVisible();
      await expect(page.locator('#lesson-conflict-error-text')).toContainText('уже занята');
      await expect(page.locator('#modal-lesson-form')).toBeVisible();

      await page.locator('#btn-close-lesson-modal').click();
      await expect(page.locator('#modal-lesson-form')).toBeHidden();

      await expect(page.locator('.schedule-card:has-text("История"):has-text("Каб. 401")')).toHaveCount(0);
      await expect(physicsCard).toBeVisible();
    });

    test('[TC-SCH-09] Перенос занятия на другое время и аудиторию', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      let physicsCard = page.locator('.schedule-card:has-text("Физика"):has-text("Каб. 401")');
      if (await physicsCard.count() === 0) {
        await page.locator('#btn-add-lesson').click();
        await page.locator('#lesson-subject-select').selectOption('Физика');
        if (await page.locator('#lesson-class-select').isEnabled()) { await page.locator('#lesson-class-select').selectOption('class-7b'); }
        await page.locator('#lesson-date-select').selectOption('2024-10-22');
        await page.locator('#lesson-time-select').selectOption('11:30 - 12:15');
        await page.locator('#lesson-room-select').selectOption('Каб. 401');
        await page.locator('#btn-save-lesson').click();
        await expect(physicsCard).toBeVisible();
      }

      await physicsCard.locator('button[data-action="edit-lesson"]').click();
      await expect(page.locator('#modal-lesson-form')).toBeVisible();

      await page.locator('#lesson-time-select').selectOption('12:35 - 13:20');
      await page.locator('#lesson-room-select').selectOption('Каб. 302');

      await page.locator('#btn-save-lesson').click();
      await expect(page.locator('#modal-lesson-form')).toBeHidden();

      await expect(page.locator('.schedule-card:has-text("Физика"):has-text("Каб. 401")')).toHaveCount(0);
      const movedPhysicsCard = page.locator('.schedule-card:has-text("Физика"):has-text("Каб. 302")');
      await expect(movedPhysicsCard).toBeVisible();

      await page.goto('journal');
      await expect(page.locator('#journal-table-container table')).toBeVisible();
      const cellsWithGrades = page.locator('td.cell-journal-entry');
      await expect(cellsWithGrades.first()).toBeVisible();
    });

    test('[TC-SCH-10] Отмена занятия не удаляет записи журнала', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await page.goto('schedule');
      await expect(page.locator('#schedule-grid')).toBeVisible();

      let targetCard = page.locator('.schedule-card:has-text("Физика")').first();
      if (await targetCard.count() === 0) {
        await page.locator('#btn-add-lesson').click();
        await page.locator('#lesson-subject-select').selectOption('Физика');
        if (await page.locator('#lesson-class-select').isEnabled()) { await page.locator('#lesson-class-select').selectOption('class-7b'); }
        await page.locator('#lesson-date-select').selectOption('2024-10-22');
        await page.locator('#lesson-time-select').selectOption('12:35 - 13:20');
        await page.locator('#lesson-room-select').selectOption('Каб. 302');
        await page.locator('#btn-save-lesson').click();
        targetCard = page.locator('.schedule-card:has-text("Физика")').first();
      }

      await targetCard.locator('button[data-action="delete-lesson"]').click();
      await expect(page.locator('#modal-confirm-delete-lesson')).toBeVisible();

      await expect(page.locator('#cancel-lesson-warning')).toContainText('сохраняются');

      await page.locator('#btn-confirm-delete-lesson').click();
      await expect(page.locator('#modal-confirm-delete-lesson')).toBeHidden();

      await expect(page.locator('.schedule-card:has-text("Физика")')).toHaveCount(0);

      await page.goto('journal');
      await expect(page.locator('#journal-table-container table')).toBeVisible();
      const cellsWithGrades = page.locator('td.cell-journal-entry');
      await expect(cellsWithGrades.first()).toBeVisible();
    });

    test('[TC-SCH-11] Пустая неделя: состояние без занятий', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await page.goto('schedule?week=w9');

      await expect(page.locator('#schedule-empty-state')).toBeVisible();
      await expect(page.locator('#schedule-empty-state')).toContainText('каникулы');
      await expect(page.locator('#schedule-grid')).toHaveCount(0);

      await page.locator('#btn-empty-return-current').click();
      await expect(page.locator('#schedule-grid')).toBeVisible();
      await expect(page.locator('.schedule-card')).not.toHaveCount(0);
    });

    test('[TC-SCH-12] Граница конфликта аудитории: тот же слот, другая свободная аудитория', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const schedulePage = new SchedulePage(page);

      await loginPage.goto();
      await loginPage.login('smirnova@school.ru', 'Test#2024');

      await schedulePage.goto();
      await expect(schedulePage.scheduleGrid).toBeVisible();

      let physicsCard = schedulePage.getLessonCard('Физика', 'Каб. 401');
      if (await physicsCard.count() === 0) {
        await schedulePage.openAddLessonModal();
        await schedulePage.fillLessonForm({
          subject: 'Физика',
          classId: 'class-7b',
          date: '2024-10-22',
          time: '11:30 - 12:15',
          room: 'Каб. 401'
        });
        await schedulePage.saveLesson();
        await expect(schedulePage.lessonModal).toBeHidden();
        await expect(physicsCard).toBeVisible();
      }

      await schedulePage.openAddLessonModal();
      await schedulePage.fillLessonForm({
        subject: 'История',
        date: '2024-10-23',
        time: '11:30 - 12:15',
        room: 'Каб. 302'
      });
      await schedulePage.saveLesson();

      await expect(schedulePage.lessonModal).toBeHidden();
      const historyCard = schedulePage.getLessonCard('История', 'Каб. 302').last();
      await expect(historyCard).toBeVisible();

      await schedulePage.openAddLessonModal();
      await schedulePage.fillLessonForm({
        subject: 'История',
        date: '2024-10-22',
        time: '11:30 - 12:15',
        room: 'Каб. 401'
      });
      await schedulePage.saveLesson();

      await expect(schedulePage.conflictErrorBox).toBeVisible();
      await expect(schedulePage.conflictErrorText).toContainText('уже занята');

      await schedulePage.btnCloseModalX.click();
      await expect(schedulePage.lessonModal).toBeHidden();
    });

  });

});
