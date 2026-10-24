import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { OverviewPage } from '../page-objects/OverviewPage.js';
import { AttendancePage } from '../page-objects/AttendancePage.js';
import { AnalyticsPage } from '../page-objects/AnalyticsPage.js';

test.describe('БП «Недельный контроль класса» (Copy of Тест-кейсы БП «Недельный контроль класса».xlsx)', () => {

  test('TC-BP-01: Вход в систему под классным руководителем', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await expect(page).toHaveURL(/.*\/overview\/?/);
    await expect(overviewPage.classHeader).toContainText('7Б класс (28 учеников)');
    await expect(page.locator('text=Смирнова Марина Васильевна').first()).toBeVisible();
  });

  test('TC-BP-02: Дашборд: расчёт посещаемости на текущую дату', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await expect(overviewPage.todayAttendanceValue).toContainText('96.4%');
    await expect(page.locator('text="27 из 28 присутствуют"')).toBeVisible();
    await expect(page.locator('text="1 пропуск"')).toBeVisible();
  });

  test('TC-BP-03: Дашборд: средний балл класса за период', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await expect(overviewPage.classAverageValue).toContainText('4.2');
    await expect(page.locator('text=За I четверть').first()).toBeVisible();
    await expect(page.locator('text=+0.1').first()).toBeVisible();
  });

  test('TC-BP-04: Дашборд: метрика «Пропуски без подтверждения»', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await expect(overviewPage.unconfirmedAbsencesValue).toContainText('4');

    await overviewPage.unconfirmedLink.click();
    await expect(page).toHaveURL(/.*\/attendance\/?\?filter=unconfirmed/);
  });

  test('TC-BP-05: Показатели дашборда не хранятся, а пересчитываются', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);
    const attendancePage = new AttendancePage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();
    await expect(overviewPage.unconfirmedAbsencesValue).toContainText('4');

    await attendancePage.goto('week=w8');
    await attendancePage.openFirstUnconfirmedAbsence();
    await attendancePage.submitConfirm({
      reasonType: 'excused',
      hasDoc: true,
      docText: 'Справка № 101 от 24.10.2024'
    });

    await overviewPage.goto();
    await expect(overviewPage.unconfirmedAbsencesValue).toContainText('3');
  });

  test('TC-BP-06: Проверка неподтверждённых пропусков: список и предупреждение', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const attendancePage = new AttendancePage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await attendancePage.goto('week=w8');

    await expect(attendancePage.bannerUnconfirmed).toBeVisible();
    await expect(attendancePage.bannerUnconfirmed).toContainText('Неподтверждённые пропуски');
    await expect(attendancePage.bannerUnconfirmedText).toContainText('без подтверждающих документов');

    await expect(attendancePage.openConfirmButtons.first()).toBeVisible();
    await expect(attendancePage.openConfirmButtons.first()).toContainText('Н (Нп)');
  });

  test('TC-BP-07: Нет неподтверждённых пропусков', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const attendancePage = new AttendancePage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await attendancePage.goto('week=w8');

    while (await page.locator('#btn-banner-confirm').isVisible()) {
      await page.locator('#btn-banner-confirm').click();
      await attendancePage.submitConfirm({
        reasonType: 'excused',
        hasDoc: true,
        docText: 'Справка № 1'
      });
    }

    await expect(attendancePage.bannerUnconfirmed).toContainText('Все пропуски подтверждены');
  });

  test('TC-BP-08: Подтверждение уважительной причины пропуска', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const attendancePage = new AttendancePage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await attendancePage.goto('week=w8');

    await attendancePage.openFirstUnconfirmedAbsence();

    await attendancePage.submitConfirm({
      reasonType: 'excused',
      hasDoc: true,
      docText: 'Справка ОРВИ № 777',
      notes: 'Болезнь'
    });

    await expect(page.locator('span:has-text("УП")').first()).toBeVisible();
  });

  test.skip('TC-BP-09: После подтверждения причины предметник не может изменить отметку', async () => {
    // TODO: Панель ведения урока учителем-предметником ещё не реализована в UI
  });

  test('TC-BP-10: Отказ от подтверждения: пропуск остаётся неуважительным', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const attendancePage = new AttendancePage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await attendancePage.goto('week=w8');

    await attendancePage.openFirstUnconfirmedAbsence();
    await attendancePage.submitConfirm({
      reasonType: 'unexcused',
      hasDoc: false,
      notes: 'Прогул'
    });

    await expect(page.locator('span:has-text("Н")').first()).toBeVisible();
  });

  test('TC-BP-11: Список пропусков класса за период', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await analyticsPage.goto();

    await analyticsPage.generateReport();

    await expect(analyticsPage.absencesSection).toBeVisible();
    await expect(page.locator('text=Сводный список пропусков занятий')).toBeVisible();
    await expect(analyticsPage.absencesTable).toBeVisible();
  });

  test('TC-BP-12: Средние баллы по предметам: класс и отдельные ученики', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await analyticsPage.goto();

    await analyticsPage.generateReport();

    await expect(page.locator('text="Порог зоны риска: 3.5"')).toBeVisible();
    await expect(page.locator('text="Математика (Алгебра)"')).toBeVisible();
    await expect(page.locator('text="Русский язык"')).toBeVisible();
    await expect(page.locator('text="Физика"')).toBeVisible();
  });

  test('TC-BP-13: Зона риска: попадание по пропускам (более 20 %)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const sidorovCard = overviewPage.getRiskCard('Сидоров Никита');
    await expect(sidorovCard).toBeVisible();
    await expect(sidorovCard).toContainText('30%');
    await expect(sidorovCard).toContainText('12 из 40 уроков');

    const morozovCard = overviewPage.getRiskCard('Морозов Артём');
    await expect(morozovCard).toBeVisible();
    await expect(morozovCard).toContainText('22.5%');
  });

  test('TC-BP-14: Зона риска: попадание по среднему баллу (ниже 3,5)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const kotovCard = overviewPage.getRiskCard('Котов Максим');
    await expect(kotovCard).toBeVisible();
    await expect(kotovCard).toContainText('3.3');
    await expect(kotovCard).toContainText('порог 3.5');
  });

  test('TC-BP-15: Зона риска: оба признака — одна строка, две причины', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const sidorovCards = page.locator('.risk-card').filter({ hasText: 'Сидоров Никита' });
    await expect(sidorovCards).toHaveCount(1);
    await expect(sidorovCards.first()).toContainText('Пропуски:');
    await expect(sidorovCards.first()).toContainText('Средний балл:');
  });

  test('TC-BP-16: Граница порога по пропускам: ровно 20 %', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const orlovCard = page.locator('div:has-text("Орлов Пётр")').filter({ has: page.locator('.btn-open-summary') });
    await expect(orlovCard).toHaveCount(0);
  });

  test('TC-BP-17: Граница порога по баллу: ровно 3,5', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const nikitinCard = page.locator('.risk-card').filter({ hasText: 'Никитин Илья' });
    await expect(nikitinCard).toHaveCount(0);

    const volkovaCard = overviewPage.getRiskCard('Волкова София');
    await expect(volkovaCard).toBeVisible();
  });

  test.skip('TC-BP-18: Зона риска не хранится: ученик исчезает после исправления', async () => {
    // TODO: Интерактивное снятие/исправление отметки отсутствия предметником в UI ещё не реализовано
  });

  test('TC-BP-19: Зона риска: состав и порядок списка', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await expect(overviewPage.riskCards).toHaveCount(5);

    await expect(overviewPage.riskCards.first()).toContainText('Сидоров Никита');
    await expect(overviewPage.riskCards.first()).toContainText('Критический риск');
  });

  test.skip('TC-BP-20: Пустой список внимания: переход к отчёту', async () => {
    // TODO: В исходном датасете список внимания содержит 5 учеников; состояние пустого списка без учеников не смоделировано в интерфейсе
  });

  test('TC-BP-21: Цикл по списку внимания: обход и возврат', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    const studentsToProcess = [
      'Сидоров Никита',
      'Котов Максим',
      'Морозов Артём',
      'Петрова Анна',
      'Волкова София'
    ];

    for (const name of studentsToProcess) {
      await overviewPage.openNoteModal(name);
      await overviewPage.submitNote(`Обработан: ${name}`);
      const card = overviewPage.getRiskCard(name);
      await expect(card.locator('text="Обработан"')).toBeVisible();
    }

    await expect(page.locator('text="Все 5 учеников списка внимания обработаны!"')).toBeVisible();
    await expect(page.locator('a:has-text("К отчёту →")').first()).toBeVisible();
  });

  test('TC-BP-22: Сводка ученика: полный состав данных', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openSummary('Петрова Анна');

    await expect(overviewPage.modalSummaryContent).toContainText('Петрова Анна Сергеевна');
    await expect(overviewPage.modalSummaryContent).toContainText('7Б класс');
    await expect(overviewPage.modalSummaryContent).toContainText('Средний балл');
    await expect(overviewPage.modalSummaryContent).toContainText('Посещаемость');
    await expect(overviewPage.modalSummaryContent).toContainText('Баллы по предметам');
    await expect(overviewPage.modalSummaryContent).toContainText('Контакты родителей');

    await overviewPage.closeSummary();
  });

  test('TC-BP-23: История контактов с родителем: соответствие записям', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openContactModal('Петрова Анна');
    await overviewPage.submitContact({
      channel: 'phone',
      topic: 'absence',
      summary: 'Разговор с родителем о причинах отсутствия',
      agreement: true
    });

    await overviewPage.openSummary('Петрова Анна');
    await expect(overviewPage.modalSummaryContent).toContainText('Петрова Анна');
    await overviewPage.closeSummary();
  });

  test('TC-BP-24: Получение контакта родителя: телефон и «основной контакт»', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openSummary('Петрова Анна');
    await expect(overviewPage.modalSummaryContent).toContainText('Петров Сергей Викторович');
    await expect(overviewPage.modalSummaryContent).toContainText('+7 999 123-45-63');
    await expect(overviewPage.modalSummaryContent).toContainText('★ Основной контакт');

    await overviewPage.closeSummary();
  });

  test('TC-BP-25: Фиксация контакта с родителем', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openContactModal('Сидоров Никита');
    const summaryText = 'Обсудили пропуски, справку принесут после каникул';
    await overviewPage.submitContact({
      channel: 'phone',
      topic: 'absence',
      summary: summaryText,
      agreement: true
    });

    const card = overviewPage.getRiskCard('Сидоров Никита');
    await expect(card.locator('text="Обработан"')).toBeVisible();
  });

  test('TC-BP-26: Фиксация контакта: обязательные поля', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openContactModal('Котов Максим');
    await overviewPage.contactSummaryTextarea.fill('');
    await overviewPage.btnSaveContact.click();

    await expect(overviewPage.modalContact).toHaveClass(/opacity-100/);
    await overviewPage.btnCancelContact.first().click();
  });

  test('TC-BP-27: Ветка «контакт не нужен»: фиксация наблюдения заметкой', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openNoteModal('Котов Максим');
    const noteText = 'Стал замкнут, нужна беседа с психологом';
    await overviewPage.submitNote(noteText, true);

    const card = overviewPage.getRiskCard('Котов Максим');
    await expect(card.locator('text="Обработан"')).toBeVisible();
  });

  test('TC-BP-28: Договорённость достигнута: комментарий или заметка', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();

    await overviewPage.openContactModal('Морозов Артём');
    await overviewPage.submitContact({
      channel: 'phone',
      topic: 'absence',
      summary: 'Договорённость достигнута, график составлен',
      agreement: true
    });

    const card = overviewPage.getRiskCard('Морозов Артём');
    await expect(card.locator('text="Обработан"')).toBeVisible();
  });

  test.skip('TC-BP-29: Договорённость не достигнута: напоминание о повторном контакте', async () => {
    // TODO: Назначение даты напоминания о повторном контакте не реализовано в UI модалки контакта
  });

  test('TC-BP-30: Приватность заметки классрука: не видна родителю и ученику', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const overviewPage = new OverviewPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await overviewPage.goto();
    await overviewPage.openNoteModal('Петрова Анна');
    const secretNote = 'Приватное наблюдение классрука № 999';
    await overviewPage.submitNote(secretNote, true);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.locator('#btn-sidebar-logout').click();
    await expect(loginPage.emailInput).toBeVisible({ timeout: 5000 });
    await loginPage.login('petrov@mail.ru', 'Test#2024');

    await expect(page.locator(`text="${secretNote}"`)).toHaveCount(0);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.locator('#btn-sidebar-logout').click();
    await expect(loginPage.emailInput).toBeVisible({ timeout: 5000 });
    await loginPage.login('petrova.a@school.ru', 'Test#2024');

    await expect(page.locator(`text="${secretNote}"`)).toHaveCount(0);
  });

  test('TC-BP-31: Формирование отчёта по классу за период', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await analyticsPage.goto();

    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();

    await expect(analyticsPage.reportMetricAvg).toContainText('4.2');
    await expect(analyticsPage.reportMetricAtt).toContainText('93.6%');
    await expect(analyticsPage.reportMetricRisk).toContainText('5');
    await expect(analyticsPage.btnPrintReport).toBeVisible();
  });

  test('TC-BP-32: Отчёт не хранится: повторное формирование даёт те же цифры', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await analyticsPage.goto();

    await analyticsPage.generateReport();
    const firstAvg = await analyticsPage.reportMetricAvg.textContent();
    const firstAtt = await analyticsPage.reportMetricAtt.textContent();

    await analyticsPage.closeReport();

    await analyticsPage.generateReport();
    const secondAvg = await analyticsPage.reportMetricAvg.textContent();
    const secondAtt = await analyticsPage.reportMetricAtt.textContent();

    expect(secondAvg).toBe(firstAvg);
    expect(secondAtt).toBe(firstAtt);
  });

  test('TC-BP-33: Отчёт: смена периода меняет показатели', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await analyticsPage.goto();

    await analyticsPage.selectPeriod('q1_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('I четверть');

    await analyticsPage.selectPeriod('oct_2024');
    await analyticsPage.generateReport();
    await expect(analyticsPage.reportPeriodTitle).toContainText('Октябрь 2024');
  });

  test('TC-BP-34: Предметник не может подтвердить уважительную причину', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('kozlov@school.ru', 'Test#2024');

    await page.goto('attendance?class=class-7b');
    await expect(page.locator('#btn-open-batch-confirm')).toHaveCount(0);
    await expect(page.locator('#btn-banner-confirm')).toHaveCount(0);
    await expect(page.locator('button[data-action="open-confirm"]')).toHaveCount(0);
  });

  test.skip('TC-BP-35: Границы доступа: классрук видит только свой класс', async () => {
    // TODO: В системе пока заведён только один класс 7Б; другие классы и аккаунты их классруков отсутствуют
  });

});
