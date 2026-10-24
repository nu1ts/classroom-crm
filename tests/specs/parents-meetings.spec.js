import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { ParentsPage } from '../page-objects/ParentsPage.js';
import { ParentDetailPage } from '../page-objects/ParentDetailPage.js';
import { StudentDetailPage } from '../page-objects/StudentDetailPage.js';

test.describe('Родители и Собрания', () => {

  test('TC-PR-01: База родителей класса: список', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await expect(parentsPage.title).toBeVisible();
    await expect(parentsPage.subtitle).toContainText('32 родителя · у 28 учеников');

    const thead = parentsPage.table.locator('thead');
    await expect(thead).toContainText('Родитель');
    await expect(thead).toContainText('Дети');
    await expect(thead).toContainText('Роль связи');
    await expect(thead).toContainText('Основной контакт');
    await expect(thead).toContainText('Действия');

    await expect(parentsPage.parentRows).toHaveCount(10);

    const firstRow = parentsPage.parentRows.first();
    await expect(firstRow).toContainText('Александрова Ирина Алексеевна');
    await expect(firstRow).toContainText('+7 999 123-45-60');
    await expect(firstRow).toContainText('Александров Егор');
    await expect(firstRow).toContainText('(7Б)');
    await expect(firstRow).toContainText('Мать');
    await expect(firstRow).toContainText('Основной контакт');
    await expect(firstRow.locator('.btn-open-parent-summary')).toBeVisible();
    await expect(firstRow.locator('.btn-parent-actions')).toBeVisible();
  });

  test('TC-PR-02: Поиск по фамилии и по телефону', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('сидор');
    await expect(parentsPage.parentRows).toHaveCount(1);
    const sidorovaRow = parentsPage.parentRows.first();
    await expect(sidorovaRow).toContainText('Сидорова Ольга Николаевна');
    await expect(sidorovaRow).toContainText('Сидоров Никита');
    await expect(sidorovaRow).toContainText('(7Б)');
    await expect(sidorovaRow).toContainText('+7 999 123-45-64');
    await expect(sidorovaRow).toContainText('Мать');
    await expect(sidorovaRow).toContainText('Основной контакт');

    await parentsPage.clearSearch();
    await parentsPage.search('123-45-64');
    await expect(parentsPage.parentRows).toHaveCount(1);
    await expect(parentsPage.parentRows.first()).toContainText('Сидорова Ольга Николаевна');
  });

  test('TC-PR-03: Фильтр «Без связи» и пустой результат', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.setFilter('no_link');
    await expect(parentsPage.parentRows).toHaveCount(1);
    const orlovaRow = parentsPage.parentRows.first();
    await expect(orlovaRow).toContainText('Орлова Надежда Павловна');
    await expect(orlovaRow).toContainText('+7 999 123-45-65');
    await expect(orlovaRow.locator('td').nth(1)).toContainText('—');

    await parentsPage.search('петров');
    await expect(parentsPage.parentRows).toHaveCount(0);
    await expect(page.locator('text=Ничего не найдено')).toBeVisible();
    await expect(parentsPage.btnResetFilters).toBeVisible();

    await parentsPage.btnResetFilters.click();
    await expect(parentsPage.parentRows).toHaveCount(10);
    await expect(parentsPage.searchInput).toHaveValue('');
  });

  test('TC-PR-04: Добавление родителя со связью', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.btnOpenAddParent.click();
    await expect(parentsPage.modalAdd).toHaveClass(/opacity-100/);

    await parentsPage.inputAddFullname.fill('Котов Дмитрий Сергеевич');
    await parentsPage.inputAddPhone.fill('+7 999 123-45-66');
    await parentsPage.selectAddStudent.selectOption('st-06');
    await parentsPage.selectAddRole.selectOption('Отец');

    if (await parentsPage.checkAddPrimary.isChecked()) {
      await parentsPage.checkAddPrimary.uncheck();
    }

    await parentsPage.btnSubmitAdd.click();
    await expect(parentsPage.modalAdd).toHaveClass(/opacity-0/);

    await parentsPage.search('Котов Дмитрий');
    await expect(parentsPage.parentRows).toHaveCount(1);
    const newRow = parentsPage.parentRows.first();
    await expect(newRow).toContainText('Котов Дмитрий Сергеевич');
    await expect(newRow).toContainText('+7 999 123-45-66');
    await expect(newRow).toContainText('Котов Максим');
    await expect(newRow).toContainText('Отец');
    await expect(newRow).not.toContainText('Основной контакт');

    await parentsPage.clearSearch();
    await expect(parentsPage.subtitle).toContainText('33 родителя · у 28 учеников');
  });

  test('TC-PR-05: Добавление родителя без телефона запрещено', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.btnOpenAddParent.click();
    await expect(parentsPage.modalAdd).toHaveClass(/opacity-100/);

    await parentsPage.inputAddFullname.fill('Иванов Иван Иванович');
    await parentsPage.inputAddPhone.fill('');

    await parentsPage.btnSubmitAdd.click();
    await expect(parentsPage.phoneAddError).toBeVisible();
    await expect(parentsPage.phoneAddError).toContainText('Укажите телефон');

    await page.locator('#btn-close-add-parent-x').click();
    await expect(parentsPage.modalAdd).toHaveClass(/opacity-0/);
    await expect(parentsPage.subtitle).toContainText('32 родителя · у 28 учеников');
  });

  test('TC-PR-06: Карточка родителя: состав полей и изменение', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.openEditModal('Котова Елена');
    await expect(parentsPage.inputEditFullname).toHaveValue('Котова Елена Павловна');
    await expect(parentsPage.inputEditPhone).toHaveValue('+7 999 123-45-62');

    await parentsPage.inputEditPhone.fill('+7 999 123-45-68');
    await parentsPage.btnSubmitEdit.click();
    await expect(parentsPage.modalEdit).toHaveClass(/opacity-0/);

    await parentsPage.search('Котова Елена');
    await expect(parentsPage.parentRows.first()).toContainText('+7 999 123-45-68');

    await parentsPage.openEditModal('Котова Елена');
    await expect(parentsPage.inputEditPhone).toHaveValue('+7 999 123-45-68');
    await page.locator('#btn-close-edit-parent-x').click();
  });

  test('TC-PR-07: Телефон — один на человека', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Петров Сергей');
    await parentsPage.openEditModal('Петров Сергей');
    await expect(parentsPage.formEdit.locator('input[type="tel"]')).toHaveCount(1);
    await expect(parentsPage.formEdit).not.toContainText('Добавить второй телефон');

    await parentsPage.inputEditPhone.fill('+7 999 123-45-69');
    await parentsPage.btnSubmitEdit.click();
    await expect(parentsPage.modalEdit).toHaveClass(/opacity-0/);

    await parentsPage.search('Петров Сергей');
    await expect(parentsPage.parentRows.first()).toContainText('+7 999 123-45-69');
  });

  test('TC-PR-08: Связывание родителя с учеником', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Орлова Надежда');
    await parentsPage.openLinkModal('Орлова Надежда');
    await parentsPage.selectLinkStudent.selectOption('st-16');
    await parentsPage.selectLinkRole.selectOption('Опекун');
    await parentsPage.checkLinkPrimary.check();

    await parentsPage.btnSubmitLink.click();
    await expect(parentsPage.modalLink).toHaveClass(/opacity-0/);

    await parentsPage.search('Орлова Надежда');
    const row = parentsPage.parentRows.first();
    await expect(row).toContainText('Васильева Дарья');
    await expect(row).toContainText('Опекун');
    await expect(row).toContainText('Основной контакт');

    await parentsPage.clearSearch();
    await parentsPage.setFilter('no_link');
    await expect(parentsPage.parentRows.filter({ hasText: 'Орлова Надежда' })).toHaveCount(0);
  });

  test('TC-PR-09: Основной контакт на ученика — только один', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Васильев Константин');
    const vasilievRow = parentsPage.parentRows.first();
    await expect(vasilievRow).toContainText('Основной контакт');
    await parentsPage.clearSearch();

    await parentsPage.search('Орлова Надежда');
    await parentsPage.openLinkModal('Орлова Надежда');
    await parentsPage.selectLinkStudent.selectOption('st-16');
    await parentsPage.selectLinkRole.selectOption('Опекун');
    await parentsPage.checkLinkPrimary.check();
    await parentsPage.btnSubmitLink.click();
    await expect(parentsPage.modalLink).toHaveClass(/opacity-0/);

    await parentsPage.clearSearch();
    await parentsPage.search('Васильев Константин');
    const updatedVasilievRow = parentsPage.parentRows.first();
    await expect(updatedVasilievRow).not.toContainText('Основной контакт');
    await expect(updatedVasilievRow).toContainText('Дополнительный');
  });

  test('TC-PR-10: Снятие связи с учеником', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Орлова Надежда');
    await parentsPage.openLinkModal('Орлова Надежда');
    await parentsPage.selectLinkStudent.selectOption('st-16');
    await parentsPage.selectLinkRole.selectOption('Опекун');
    await parentsPage.btnSubmitLink.click();
    await expect(parentsPage.modalLink).toHaveClass(/opacity-0/);

    await parentsPage.search('Орлова Надежда');
    await parentsPage.openSummary('Орлова Надежда');

    const parentDetailPage = new ParentDetailPage(page);
    await expect(parentDetailPage.parentNameHeading).toHaveText('Орлова Надежда Павловна');
    await parentDetailPage.openUnlinkModal();
    await parentDetailPage.btnSubmitUnlink.click();
    await expect(parentDetailPage.modalUnlink).toHaveClass(/opacity-0/);

    await parentsPage.goto();
    await parentsPage.search('Орлова Надежда');
    const orlovaRow = parentsPage.parentRows.first();
    await expect(orlovaRow.locator('td').nth(1)).toContainText('—');

    await parentsPage.clearSearch();
    await parentsPage.setFilter('no_link');
    await expect(parentsPage.parentRows.filter({ hasText: 'Орлова Надежда' })).toHaveCount(1);
  });

  test('TC-PR-11: Удаление родителя со связями запрещено', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Петров Сергей');
    await parentsPage.deleteParent('Петров Сергей');
    await expect(parentsPage.toastMessage).toContainText('Сначала снимите связь с учеником в карточке или сводке');

    await parentsPage.search('Петров Сергей');
    await expect(parentsPage.parentRows.first()).toContainText('Петров Сергей Викторович');
    await expect(parentsPage.parentRows.first()).toContainText('Петрова Анна');
  });

  test('TC-PR-12: Удаление родителя без связей', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentsPage = new ParentsPage(page);
    await parentsPage.goto();

    await parentsPage.search('Орлова Надежда');
    await parentsPage.deleteParent('Орлова Надежда');
    await expect(parentsPage.toastMessage).toContainText('Родитель удалён из базы');

    await parentsPage.search('Орлова Надежда');
    await expect(parentsPage.parentRows).toHaveCount(0);

    await parentsPage.clearSearch();
    await expect(parentsPage.subtitle).toContainText(/31 родител[яь] · у 28 учеников/);
  });

  test('TC-PR-13: Сводка по родителю: состав экрана', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-27');

    await expect(parentDetailPage.breadcrumbs).toContainText('Класс 7Б');
    await expect(parentDetailPage.breadcrumbs).toContainText('Родители');
    await expect(parentDetailPage.breadcrumbs).toContainText('Сидорова Ольга Николаевна');

    await expect(parentDetailPage.parentNameHeading).toHaveText('Сидорова Ольга Николаевна');
    await expect(parentDetailPage.phoneCard).toContainText('+7 999 123-45-64');
    await expect(page.locator('span:has-text("Основной контакт")').first()).toBeVisible();
    await expect(parentDetailPage.readOnlyNotice).toBeVisible();

    await expect(parentDetailPage.childrenBlock).toContainText('Сидоров Никита');
    await expect(parentDetailPage.childrenBlock).toContainText('Мать');
    await expect(parentDetailPage.childrenBlock.locator('a:has-text("Открыть сводку по ученику")')).toBeVisible();

    await expect(parentDetailPage.contactsHistoryBlock).toContainText('26.10.2024');
    await expect(parentDetailPage.contactsHistoryBlock).toContainText('18.10.2024');

    await expect(parentDetailPage.btnRecordContact).toBeVisible();
    await expect(parentDetailPage.btnLinkStudent).toBeVisible();
    await expect(parentDetailPage.btnUnlinkStudent).toBeVisible();
  });

  test('TC-PR-14: Сводка родителя с детьми в разных классах', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-10');

    await expect(parentDetailPage.childrenBlock).toContainText('Котов Максим');
    await expect(parentDetailPage.childrenBlock).toContainText('7Б класс');
    await expect(parentDetailPage.childrenBlock).toContainText('Котова Дарья');
    await expect(parentDetailPage.childrenBlock).toContainText('9В');

    const daryaLink = parentDetailPage.childrenBlock.locator('a[href*="st-ext"], a[href*="Котова"], a:has-text("Открыть сводку по ученику")').last();
    await expect(daryaLink).toBeVisible();

    await expect(parentDetailPage.riskChildBlock).toBeVisible();
    await expect(parentDetailPage.riskChildBlock).toContainText('Котов Максим');
  });

  test('TC-PR-15: Фиксация контакта с родителем', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-27');

    await parentDetailPage.openRecordContactModal();
    await expect(parentDetailPage.contactDateInput).toHaveValue('2024-10-28');

    await parentDetailPage.contactChannelSelect.selectOption('phone');
    const summaryText = 'Дозвонились, справку принесёт 29.10';
    await parentDetailPage.contactSummaryInput.fill(summaryText);
    await parentDetailPage.contactAgreementCheck.check();

    await parentDetailPage.btnSubmitContact.click();
    await expect(parentDetailPage.modalContact).toHaveClass(/opacity-0/);

    await expect(parentDetailPage.contactsHistoryList).toContainText('28.10.2024');
    await expect(parentDetailPage.contactsHistoryList).toContainText('Смирнова М. В.');
    await expect(parentDetailPage.contactsHistoryList).toContainText('Звонок');
    await expect(parentDetailPage.contactsHistoryList).toContainText(summaryText);
    await expect(parentDetailPage.contactsHistoryList).toContainText('Договорённость достигнута');

    const studentDetailPage = new StudentDetailPage(page);
    await studentDetailPage.goto('st-14');
    await expect(studentDetailPage.contactsHistoryBlock).toContainText(summaryText);
  });

  test('TC-PR-16: Фиксация контакта: обязательные поля', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-27');

    await parentDetailPage.openRecordContactModal();
    await parentDetailPage.contactSummaryInput.fill('Проверка обязательности канала');
    await parentDetailPage.btnSubmitContact.click();
    await expect(parentDetailPage.channelError).toBeVisible();

    await parentDetailPage.contactChannelSelect.selectOption('chat');
    await parentDetailPage.contactSummaryInput.fill('');
    await parentDetailPage.btnSubmitContact.click();
    await expect(parentDetailPage.summaryError).toBeVisible();

    await parentDetailPage.contactSummaryInput.fill('Успешный контакт после проверок');
    await parentDetailPage.btnSubmitContact.click();
    await expect(parentDetailPage.modalContact).toHaveClass(/opacity-0/);
    await expect(parentDetailPage.contactsHistoryList).toContainText('Успешный контакт после проверок');
  });

  test('TC-PR-17: Запись контакта без привязки к ученику', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-10');

    await parentDetailPage.openRecordContactModal();
    await parentDetailPage.contactChannelSelect.selectOption('chat');
    const generalSummary = 'Напоминание о собрании 31.10';
    await parentDetailPage.contactSummaryInput.fill(generalSummary);
    await parentDetailPage.contactStudentSelect.selectOption('');

    await parentDetailPage.btnSubmitContact.click();
    await expect(parentDetailPage.modalContact).toHaveClass(/opacity-0/);

    await expect(parentDetailPage.contactsHistoryList).toContainText(generalSummary);

    const studentDetailPage = new StudentDetailPage(page);
    await studentDetailPage.goto('st-06');
    await expect(studentDetailPage.contactsHistoryBlock).not.toContainText(generalSummary);
  });

  test('TC-PR-18: История общения: порядок записей и пустое состояние', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    const parentDetailPage = new ParentDetailPage(page);
    await parentDetailPage.goto('pr-27');

    const items = parentDetailPage.contactsHistoryList.locator('> div');
    await expect(items.first()).toContainText('26.10.2024');
    await expect(items.first()).toContainText('Звонок');
    await expect(items.nth(1)).toContainText('18.10.2024');
    await expect(items.nth(1)).toContainText('Мессенджер');

    await parentDetailPage.goto('pr-23');
    await expect(parentDetailPage.contactsHistoryList).toContainText('Разговоров с этим родителем ещё не было');
    await expect(parentDetailPage.contactsHistoryList.locator('#btn-empty-record-contact')).toBeVisible();
  });

  test('TC-PR-19: Права: база родителей недоступна предметнику и родителю', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.loginAs('subject_teacher');

    await page.goto('parents');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();

    await navPage.logout();

    await loginPage.loginAs('parent');
    await page.goto('parents');
    await expect(page.locator('text=Доступ ограничен')).toBeVisible();

    await page.goto('profile');
    await expect(page.locator('h2:has-text("Мой профиль")')).toBeVisible();
    await expect(page.locator('input[readonly]').first()).toHaveValue(/Петров/);
  });

  test('TC-PR-20: Приватность: история общения не видна родителю и ученику', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.loginAs('parent');

    await page.goto('student?id=st-23');
    await expect(page.locator('text=История общения с родителями')).toHaveCount(0);
    await expect(page.locator('text=Заметки классрука')).toHaveCount(0);

    await navPage.logout();

    await loginPage.loginAs('student');

    await page.goto('student?id=st-23');
    await expect(page.locator('text=История общения с родителями')).toHaveCount(0);
    await expect(page.locator('text=Заметки классрука')).toHaveCount(0);
  });

  test.skip('TC-MG-01: Список собраний: ближайшее и прошедшие', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-02: Создание собрания', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-03: Создание собрания без обязательных полей', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-04: Повестка собрания: состав и порядок пунктов', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-05: Перенос собрания', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-06: Отмена собрания не удаляет объявление', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-07: Отметка явки: значения и сохранение', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-08: Явка: причина обязательна при неявке', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-09: Отметить явку до собрания нельзя', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-MG-10: Итоги собрания: счётчик считается по явке', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test('TC-MG-11: Родитель видит собрания класса', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    const meetingsSection = page.locator('#child-meetings-section');
    await expect(meetingsSection).toBeVisible();

    await expect(meetingsSection.locator('text=Итоги первой четверти 7Б')).toBeVisible();
    await expect(meetingsSection.locator('text=31 октября 2024 г. в 18:30')).toBeVisible();
    await expect(meetingsSection.locator('text=Каб. 302').first()).toBeVisible();
    await expect(meetingsSection.locator('text=Запланировано')).toBeVisible();
    await expect(meetingsSection.locator('text=Повестка: Успеваемость, предстоящие каникулы, экскурсионная поездка в музей.')).toBeVisible();

    await expect(meetingsSection.locator('text=Организационное собрание начала года')).toBeVisible();
    await expect(meetingsSection.locator('text=Завершено')).toBeVisible();

    await expect(meetingsSection.locator('button:has-text("Создать собрание")')).toHaveCount(0);
    await expect(meetingsSection.locator('button:has-text("Редактировать")')).toHaveCount(0);
    await expect(meetingsSection.locator('input[type="checkbox"]')).toHaveCount(0);
  });

  test.skip('TC-MG-12: Права: предметник не ведёт собрания', async () => {
    // TODO: Раздел «Собрания» (#/meetings) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-01: Список объявлений класса', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-02: Публикация объявления', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-03: Публикация без обязательных полей', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-04: Изменение объявления', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-05: Удаление объявления и пустое состояние', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-06: Объявление видят родители и ученики класса', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-07: Удаление объявления не влияет на собрание', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

  test.skip('TC-AN-08: Публикация объявления из карточки собрания', async () => {
    // TODO: Раздел «Объявления» (#/announcements) в интерфейсе не реализован (является заглушкой)
  });

});
