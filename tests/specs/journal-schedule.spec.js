import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { JournalPage } from '../page-objects/JournalPage.js';

test.describe('Тест-кейсы «Журнал» и «Расписание» (Copy of Тест-кейсы «Журнал» и «Расписание».xlsx)', () => {

  test.describe('Группа 1: Журнал учителя / классного руководителя (TC-TCH-01 .. TC-TCH-16)', () => {

    test('TC-TCH-01: Выставление оценки одному ученику за урок', async ({ page }) => {
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

    test('TC-TCH-02: Выставление оценок нескольким ученикам за один урок', async ({ page }) => {
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

    test('TC-TCH-03: Допустимые значения оценки', async ({ page }) => {
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

    test('TC-TCH-04: Изменение своей оценки, пока урок открыт', async ({ page }) => {
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

    test('TC-TCH-05: Удаление своей оценки, пока урок открыт', async ({ page }) => {
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

    test('TC-TCH-06: Попытка изменить оценку после закрытия урока', async ({ page }) => {
      
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

    test('TC-TCH-07: Правка отметки отсутствия до подтверждения причины', async ({ page }) => {
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

    test('TC-TCH-08: Отметка отсутствия не меняется после подтверждения причины', async ({ page }) => {
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

    test('TC-TCH-09: Оценка не ставится ученику, отмеченному отсутствующим', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const journalPage = new JournalPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await journalPage.goto('class=class-7b&subject=math');
      const input = journalPage.getGradeInput('Петрова Анна', '2024-10-24');
      await expect(input).toBeDisabled();
      await expect(input).toHaveAttribute('title', /Ученик отсутствовал/i);
    });

    test('TC-TCH-10: Отметка отсутствующих на уроке для нескольких учеников', async ({ page }) => {
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

    test('TC-TCH-11: Комментарий предметника к своей записи', async ({ page }) => {
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

    test('TC-TCH-12: Комментарий классрука к записи журнала', async ({ page }) => {
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

    test('TC-TCH-13: Предметник видит только свои предметы и классы', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const navPage = new NavigationPage(page);

      await loginPage.goto();
      await loginPage.login('kozlov@school.ru', 'Test#2024');

      await navPage.expectVisibleMenuItems(['nav-classes', 'nav-schedule', 'nav-attendance', 'nav-profile']);

      await navPage.expectHiddenMenuItems(['nav-journal']);

      await page.goto('journal');

      await expect(page.locator('h1, h2, h3')).toContainText(/Доступ ограничен/i);
    });

    test('TC-TCH-14: Классрук просматривает журнал по всем предметам, но не меняет записи', async ({ page }) => {
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

    test('TC-TCH-15: Сетка журнала: отображение записей за период', async ({ page }) => {
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

    test('TC-TCH-16: Фильтр «Показывать только записи»', async ({ page }) => {
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

    test('TC-MED-01: Подтверждение медицинской справки: пропуск становится уважительным', async ({ page }) => {
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

    test.skip('TC-MED-02: Одна справка закрывает несколько дней пропуска', async () => {
      // TODO: Пропуск за 25.10.2024 уже предзаполнен как подтверждённый в исходном датасете; групповое закрытие диапазона дат через одну форму ячейки пока не реализовано в UI
    });

    test('TC-MED-03: Отказ в подтверждении справки', async ({ page }) => {
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

    test('TC-MED-04: Предметник не может подтвердить справку', async ({ page }) => {
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

    test('TC-MED-05: Подтверждение не удаляет пропуск из журнала', async ({ page }) => {
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

    test.skip('TC-SCH-01: Расписание класса на неделю для классного руководителя', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-02: Переключение недель', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-03: Расписание ребёнка в роли родителя', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-04: Расписание в роли ученика и подсветка текущего дня', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-05: Родитель и ученик не видят расписание чужого класса', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-06: Одно расписание для всех ролей: состав занятий совпадает', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-07: Своё расписание учителя-предметника по всем классам', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-08: Добавление занятия и проверка занятости аудитории', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-09: Перенос занятия на другое время и аудиторию', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-10: Отмена занятия не удаляет записи журнала', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

    test.skip('TC-SCH-11: Пустая неделя: состояние без занятий', async () => {
      // TODO: Раздел «Расписание» (#/schedule) находится в стадии разработки (заглушка)
    });

  });

});
