import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { NavigationPage } from '../page-objects/NavigationPage.js';
import { ParentsPage } from '../page-objects/ParentsPage.js';
import { ParentDetailPage } from '../page-objects/ParentDetailPage.js';
import { StudentDetailPage } from '../page-objects/StudentDetailPage.js';

test.describe('Родители и Собрания', () => {

  test('[TC-PR-01] База родителей класса: список', async ({ page }) => {
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

  test('[TC-PR-02] Поиск по фамилии и по телефону', async ({ page }) => {
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

  test('[TC-PR-03] Фильтр «Без связи» и пустой результат', async ({ page }) => {
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

  test('[TC-PR-04] Добавление родителя со связью', async ({ page }) => {
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

  test('[TC-PR-05] Добавление родителя без телефона запрещено', async ({ page }) => {
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

  test('[TC-PR-06] Карточка родителя: состав полей и изменение', async ({ page }) => {
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

  test('[TC-PR-07] Телефон — один на человека', async ({ page }) => {
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

  test('[TC-PR-08] Связывание родителя с учеником', async ({ page }) => {
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

  test('[TC-PR-09] Основной контакт на ученика — только один', async ({ page }) => {
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

  test('[TC-PR-10] Снятие связи с учеником', async ({ page }) => {
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

  test('[TC-PR-11] Удаление родителя со связями запрещено', async ({ page }) => {
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

  test('[TC-PR-12] Удаление родителя без связей', async ({ page }) => {
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

  test('[TC-PR-13] Сводка по родителю: состав экрана', async ({ page }) => {
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

  test('[TC-PR-14] Сводка родителя с детьми в разных классах', async ({ page }) => {
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

  test('[TC-PR-15] Фиксация контакта с родителем', async ({ page }) => {
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

  test('[TC-PR-16] Фиксация контакта: обязательные поля', async ({ page }) => {
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

  test('[TC-PR-17] Запись контакта без привязки к ученику', async ({ page }) => {
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

  test('[TC-PR-18] История общения: порядок записей и пустое состояние', async ({ page }) => {
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

  test('[TC-PR-19] Права: база родителей недоступна предметнику и родителю', async ({ page }) => {
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

  test('[TC-PR-20] Приватность: история общения не видна родителю и ученику', async ({ page }) => {
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

  test('[TC-MG-01] Список собраний: ближайшее и прошедшие', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await expect(page.locator('#meetings-page-title')).toContainText('Родительские собрания 7Б');

    const nextSection = page.locator('#section-next-meeting');
    await expect(nextSection).toBeVisible();
    await expect(nextSection.locator('text=Ближайшее собрание')).toBeVisible();
    await expect(nextSection.locator('#next-meeting-title')).toContainText('Итоги первой четверти 7Б');
    await expect(nextSection.locator('#next-meeting-datetime')).toContainText('31.10.2024, 18:30');
    await expect(nextSection.locator('#next-meeting-room')).toContainText('Каб. 302');

    const agendaItems = nextSection.locator('#next-meeting-agenda-list .agenda-item');
    await expect(agendaItems).toHaveCount(3);
    await expect(agendaItems.nth(0)).toContainText('Результаты первой четверти класса 7Б');
    await expect(agendaItems.nth(1)).toContainText('Проблемы с посещаемостью и успеваемостью');
    await expect(agendaItems.nth(2)).toContainText('Безопасность на осенних каникулах');

    await expect(nextSection.locator('.btn-edit-meeting')).toBeVisible();
    await expect(nextSection.locator('.btn-publish-announcement')).toBeVisible();

    const menuBtn = nextSection.locator('.btn-meeting-menu');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(nextSection.locator('.btn-cancel-meeting')).toBeVisible();

    const pastSection = page.locator('#section-past-meetings');
    await expect(pastSection).toBeVisible();
    await expect(pastSection).toContainText('05.09.2024');
    await expect(pastSection).toContainText('Организация учебного года');
    await expect(pastSection).toContainText('24 из 28');
    await expect(pastSection.locator('.btn-meeting-summary').first()).toBeVisible();
  });

  test('[TC-MG-02] Создание собрания', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await page.locator('#btn-create-meeting').click();

    const modal = page.locator('#modal-meeting-form');
    await expect(modal).toBeVisible();

    await page.locator('#meeting-title-input').fill('Подготовка к новогодним мероприятиям');
    await page.locator('#meeting-date-input').fill('2024-12-20');
    await page.locator('#meeting-time-input').fill('18:30');
    await page.locator('#meeting-room-input').fill('Каб. 302');

    await page.locator('#input-new-agenda-item').fill('Новогодний утренник и сценарий');
    await page.locator('#btn-add-agenda-item').click();
    await page.locator('#input-new-agenda-item').fill('Подарки и праздничный бюджет');
    await page.locator('#btn-add-agenda-item').click();

    await page.locator('#btn-save-meeting').click();
    await expect(modal).not.toBeVisible();

    await expect(page.locator('#next-meeting-title')).toContainText('Итоги первой четверти 7Б');

    const otherSection = page.locator('#section-other-upcoming');
    await expect(otherSection).toBeVisible();
    await expect(otherSection).toContainText('Подготовка к новогодним мероприятиям');
    await expect(otherSection).toContainText('20.12.2024');
  });

  test('[TC-MG-03] Создание собрания без обязательных полей', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await page.locator('#btn-create-meeting').click();

    await page.locator('#meeting-title-input').fill('Собрание без даты и времени');
    await page.locator('#btn-save-meeting').click();

    await expect(page.locator('#error-meeting-date')).toBeVisible();
    await expect(page.locator('#error-meeting-time')).toBeVisible();

    await page.locator('#meeting-date-input').fill('2024-11-20');
    await page.locator('#btn-save-meeting').click();

    await expect(page.locator('#error-meeting-time')).toBeVisible();

    await page.locator('#modal-meeting-form .btn-close-modal').first().click();
    await expect(page.locator('text=Собрание без даты и времени')).toHaveCount(0);
  });

  test('[TC-MG-04] Повестка собрания: состав и порядок пунктов', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await page.locator('#section-next-meeting .btn-edit-meeting').click();

    const modal = page.locator('#modal-meeting-form');
    await expect(modal).toBeVisible();

    const removeBtns = page.locator('.btn-agenda-remove');
    await removeBtns.nth(2).click();

    await page.locator('#input-new-agenda-item').fill('Организация дежурства');
    await page.locator('#btn-add-agenda-item').click();

    const upBtns = page.locator('.btn-agenda-up');
    await upBtns.last().click();

    await page.locator('#btn-save-meeting').click();
    await expect(modal).not.toBeVisible();

    await page.reload();

    const items = page.locator('#next-meeting-agenda-list .agenda-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('Результаты первой четверти класса 7Б');
    await expect(items.nth(1)).toContainText('Организация дежурства');
    await expect(items.nth(2)).toContainText('Проблемы с посещаемостью и успеваемостью');
  });

  test('[TC-MG-05] Перенос собрания', async ({ page, loginPage }) => {
    const navPage = new NavigationPage(page);
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await page.locator('#section-next-meeting .btn-edit-meeting').click();

    await page.locator('#meeting-date-input').fill('2024-11-07');
    await page.locator('#meeting-time-input').fill('18:00');
    await page.locator('#meeting-room-input').fill('Каб. 204');

    await page.locator('#btn-save-meeting').click();

    await expect(page.locator('#next-meeting-datetime')).toContainText('07.11.2024, 18:00');
    await expect(page.locator('#next-meeting-room')).toContainText('Каб. 204');

    await navPage.logout();
    await loginPage.loginAs('parent');
    await page.waitForURL(/\/child\/?/, { timeout: 7000 });

    const parentSection = page.locator('#child-meetings-section');
    await expect(parentSection.locator('text=7 ноября 2024 г. в 18:00')).toBeVisible();
    await expect(parentSection.locator('text=Каб. 204')).toBeVisible();
  });

  test('[TC-MG-06] Отмена собрания не удаляет объявление', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');

    await page.locator('#btn-create-meeting').click();
    await page.locator('#meeting-title-input').fill('Подготовка к новогодним мероприятиям');
    await page.locator('#meeting-date-input').fill('2024-12-20');
    await page.locator('#meeting-time-input').fill('18:30');
    await page.locator('#btn-save-meeting').click();

    await page.locator('#section-next-meeting .btn-meeting-menu').click();
    await page.locator('#section-next-meeting .btn-cancel-meeting').click();

    const cancelModal = page.locator('#modal-cancel-meeting');
    await expect(cancelModal).toBeVisible();
    await page.locator('#btn-confirm-cancel-meeting').click();

    await expect(page.locator('#next-meeting-title')).toContainText('Подготовка к новогодним мероприятиям');

    await page.goto('announcements');
    await expect(page.locator('.announcement-card', { hasText: 'Родительское собрание 31 октября' })).toBeVisible();
  });

  test('[TC-MG-07] Отметка явки: значения и сохранение', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    const pastSection = page.locator('#section-past-meetings');
    await pastSection.locator('.btn-mark-attendance').first().click();

    const modal = page.locator('#modal-meeting-attendance');
    await expect(modal).toBeVisible();

    const thead = modal.locator('thead');
    await expect(thead).toContainText('Явка');

    const rows = modal.locator('#attendance-table-body tr');
    await expect(rows).toHaveCount(28);

    const firstSelect = rows.first().locator('.attendance-status-select');
    const options = await firstSelect.locator('option').allInnerTexts();
    expect(options).toEqual(['Пришёл', 'Не пришёл', 'Уважительная причина']);

    await expect(modal.locator('#attendance-counter-badge')).toContainText('Всего пришли: 24 из 28');

    await page.locator('#btn-save-attendance').click();
    await expect(modal).not.toBeVisible();
  });

  test('[TC-MG-08] Явка: причина обязательна при неявке', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    await page.locator('#section-past-meetings .btn-mark-attendance').first().click();

    const modal = page.locator('#modal-meeting-attendance');
    await expect(modal).toBeVisible();

    const petrovRow = modal.locator('#attendance-table-body tr', { hasText: 'Петров С. В.' });
    await expect(petrovRow).toBeVisible();

    await petrovRow.locator('.attendance-status-select').selectOption('excused');
    await petrovRow.locator('.attendance-note-input').fill('');

    await page.locator('#btn-save-attendance').click();
    await expect(petrovRow.locator('.attendance-note-error')).toBeVisible();

    await petrovRow.locator('.attendance-note-input').fill('Болезнь ребёнка');

    await page.locator('#btn-save-attendance').click();
    await expect(modal).not.toBeVisible();
  });

  test('[TC-MG-09] Отметить явку до собрания нельзя', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');
    const nextSection = page.locator('#section-next-meeting');

    await expect(nextSection.locator('.btn-mark-attendance')).toHaveCount(0);
  });

  test('[TC-MG-10] Итоги собрания: счётчик считается по явке', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');

    await page.locator('#section-past-meetings .btn-meeting-summary').first().click();
    const summaryModal = page.locator('#modal-meeting-summary');
    await expect(summaryModal).toBeVisible();
    await expect(page.locator('#summary-ratio-text')).toHaveText('24 из 28');

    await page.locator('#btn-summary-open-attendance').click();
    await expect(summaryModal).not.toBeVisible();

    const attendanceModal = page.locator('#modal-meeting-attendance');
    await expect(attendanceModal).toBeVisible();

    const petrovRow = attendanceModal.locator('#attendance-table-body tr', { hasText: 'Петров С. В.' });
    await petrovRow.locator('.attendance-status-select').selectOption('absent');
    await petrovRow.locator('.attendance-note-input').fill('Семейные обстоятельства');
    await page.locator('#btn-save-attendance').click();
    await expect(attendanceModal).not.toBeVisible();

    await page.locator('#section-past-meetings .btn-meeting-summary').first().click();
    await expect(summaryModal).toBeVisible();
    await expect(page.locator('#summary-ratio-text')).toHaveText('23 из 28');
    await expect(page.locator('#summary-absent-list')).toContainText('Петров С. В.');
  });

  test('[TC-MG-11] Родитель видит собрания класса', async ({ page, loginPage }) => {
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

  test('[TC-MG-12] Права: предметник не ведёт собрания', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login('kozlov@school.ru', 'Test#2024');

    await expect(page.locator('#nav-meetings')).toHaveCount(0);
    await expect(page.locator('a[href="#/meetings"]')).toHaveCount(0);

    await page.goto('meetings');

    await expect(page.locator('text=Доступ ограничен')).toBeVisible();
    await expect(page.locator('text=Родительские собрания 7Б')).toHaveCount(0);
  });

  test('[TC-MG-13] Явка: все пришли — граница счётчика 28 из 28', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('teacher');

    await page.goto('meetings');

    await page.locator('#section-past-meetings .btn-mark-attendance').first().click();
    const attendanceModal = page.locator('#modal-meeting-attendance');
    await expect(attendanceModal).toBeVisible();

    const selects = attendanceModal.locator('.attendance-status-select');
    const count = await selects.count();
    expect(count).toBe(28);

    for (let i = 0; i < count; i++) {
      await selects.nth(i).selectOption('present');
    }

    await expect(page.locator('#attendance-counter-badge')).toContainText('Всего пришли: 28 из 28');

    await page.locator('#btn-save-attendance').click();
    await expect(attendanceModal).not.toBeVisible();

    await page.locator('#section-past-meetings .btn-mark-attendance').first().click();
    await expect(attendanceModal).toBeVisible();
    await expect(page.locator('#attendance-counter-badge')).toContainText('Всего пришли: 28 из 28');

    await attendanceModal.locator('.btn-close-modal').first().click();
    await expect(attendanceModal).not.toBeVisible();

    await page.locator('#section-past-meetings .btn-meeting-summary').first().click();
    const summaryModal = page.locator('#modal-meeting-summary');
    await expect(summaryModal).toBeVisible();
    await expect(page.locator('#summary-ratio-text')).toHaveText('28 из 28');
    await expect(page.locator('#summary-percentage-text')).toHaveText('100%');
    await summaryModal.locator('.btn-close-modal').first().click();
  });

  test('[TC-AN-01] Список объявлений класса', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('announcements');
    await expect(page.locator('#announcements-page-title')).toContainText('Объявления 7Б');
    await expect(page.locator('#announcements-page-subtitle')).toContainText('Читают родители и ученики класса');
    await expect(page.locator('#btn-create-announcement')).toBeVisible();

    const cards = page.locator('.announcement-card');
    await expect(cards).toHaveCount(2);

    const firstCard = cards.filter({ hasText: 'Родительское собрание 31 октября' });
    await expect(firstCard).toContainText('25.10.2024');
    await expect(firstCard).toContainText('прочитали 19 из 28');
    await expect(firstCard).toContainText('Адресовано классу 7Б');
    await expect(firstCard.locator('.btn-read-full')).toBeVisible();
    await expect(firstCard.locator('.btn-edit-announcement')).toBeVisible();
    await expect(firstCard.locator('.btn-delete-announcement')).toBeVisible();

    const secondCard = cards.filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(secondCard).toContainText('24.10.2024');
    await expect(secondCard).toContainText('прочитали 22 из 28');
    await expect(secondCard).toContainText('Адресовано классу 7Б');
  });

  test('[TC-AN-02] Публикация объявления', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('announcements');
    await page.locator('#btn-create-announcement').click();

    await expect(page.locator('#modal-announcement-create')).toBeVisible();
    await expect(page.locator('#announcement-create-class')).toHaveValue('7Б');
    await expect(page.locator('#announcement-create-date')).toHaveValue('28.10.2024');

    await page.locator('#announcement-create-title').fill('Организация дежурства');
    await page.locator('#announcement-create-content').fill('Утвержден новый график дежурств по классу 7Б на вторую четверть. Просьба ознакомиться.');

    await page.locator('#btn-submit-create-announcement').click();
    await expect(page.locator('#modal-announcement-create')).toBeHidden();

    const cards = page.locator('.announcement-card');
    await expect(cards).toHaveCount(3);

    const firstCard = cards.first();
    await expect(firstCard).toContainText('Организация дежурства');
    await expect(firstCard).toContainText('28.10.2024');
    await expect(firstCard).toContainText('прочитали 0 из 28');
    await expect(firstCard).toContainText('Адресовано классу 7Б');

    await page.reload();
    const cardsAfterReload = page.locator('.announcement-card');
    await expect(cardsAfterReload).toHaveCount(3);
    await expect(cardsAfterReload.first()).toContainText('Организация дежурства');
  });

  test('[TC-AN-03] Публикация без обязательных полей', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('announcements');
    await page.locator('#btn-create-announcement').click();
    await expect(page.locator('#modal-announcement-create')).toBeVisible();

    await page.locator('#announcement-create-content').fill('Текст объявления без заголовка');
    await page.locator('#btn-submit-create-announcement').click();

    await expect(page.locator('#announcement-title-error')).toBeVisible();
    await expect(page.locator('#announcement-title-error')).toContainText('обязателен для заполнения');
    await expect(page.locator('#modal-announcement-create')).toBeVisible();

    await page.locator('#announcement-create-title').fill('Заголовок без текста');
    await page.locator('#announcement-create-content').fill('');
    await page.locator('#btn-submit-create-announcement').click();

    await expect(page.locator('#announcement-content-error')).toBeVisible();
    await expect(page.locator('#announcement-content-error')).toContainText('обязателен для заполнения');
    await expect(page.locator('#modal-announcement-create')).toBeVisible();

    await page.locator('#btn-close-create-modal').click();
    await expect(page.locator('#modal-announcement-create')).toBeHidden();

    const cards = page.locator('.announcement-card');
    await expect(cards).toHaveCount(2);
  });

  test('[TC-AN-04] Изменение объявления', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('announcements');

    const card = page.locator('.announcement-card').filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('прочитали 22 из 28');
    await expect(card).toContainText('24.10.2024');

    await card.locator('.btn-edit-announcement').click();
    await expect(page.locator('#modal-announcement-edit')).toBeVisible();

    const currentText = await page.locator('#announcement-edit-content').inputValue();
    await page.locator('#announcement-edit-content').fill(currentText + ' Просьба сообщить классному руководителю о планах поездок.');
    await page.locator('#btn-submit-edit-announcement').click();

    await expect(page.locator('#modal-announcement-edit')).toBeHidden();

    await expect(page.locator('.announcement-card')).toHaveCount(2);
    const updatedCard = page.locator('.announcement-card').filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(updatedCard).toContainText('Просьба сообщить классному руководителю о планах поездок');
    await expect(updatedCard).toContainText('24.10.2024');
    await expect(updatedCard).toContainText('прочитали 22 из 28');

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrov@mail.ru', 'Test#2024');
    await page.goto('announcements');

    const parentCard = page.locator('.announcement-card').filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(parentCard).toContainText('Просьба сообщить классному руководителю о планах поездок');
    await expect(parentCard).toContainText('24.10.2024');
    await expect(parentCard).toContainText('прочитали 22 из 28');
  });

  test('[TC-AN-05] Удаление объявления и пустое состояние', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('announcements');

    const deleteButtons = page.locator('.btn-delete-announcement');
    while (await deleteButtons.count() > 0) {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteButtons.first().click();
      await page.waitForTimeout(300);
    }

    await expect(page.locator('#announcements-empty-state')).toBeVisible();
    await expect(page.locator('#announcements-empty-state')).toContainText('Объявлений пока нет');

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrov@mail.ru', 'Test#2024');
    await page.goto('announcements');
    await expect(page.locator('#announcements-empty-state')).toBeVisible();
    await expect(page.locator('#announcements-empty-state')).toContainText('Объявлений пока нет');

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrova.a@school.ru', 'Test#2024');
    await page.goto('announcements');
    await expect(page.locator('#announcements-empty-state')).toBeVisible();
    await expect(page.locator('#announcements-empty-state')).toContainText('Объявлений пока нет');
  });

  test('[TC-AN-06] Объявление видят родители и ученики класса', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.login('petrov@mail.ru', 'Test#2024');

    await page.goto('announcements');
    await expect(page.locator('#announcements-page-title')).toContainText('Объявления 7Б');

    await expect(page.locator('#btn-create-announcement')).toHaveCount(0);
    await expect(page.locator('.btn-edit-announcement')).toHaveCount(0);
    await expect(page.locator('.btn-delete-announcement')).toHaveCount(0);

    const firstCard = page.locator('.announcement-card').filter({ hasText: 'Родительское собрание 31 октября' });
    await expect(firstCard).toContainText('прочитали 19 из 28');

    await firstCard.locator('.btn-read-full').click();
    await expect(page.locator('#modal-announcement-detail')).toBeVisible();
    await expect(page.locator('#modal-announcement-title')).toContainText('Родительское собрание 31 октября');
    await expect(page.locator('#modal-announcement-reads')).toContainText('прочитали 20 из 28');

    await page.locator('#btn-close-announcement-modal').click();
    await expect(page.locator('#modal-announcement-detail')).toBeHidden();
    await expect(firstCard).toContainText('прочитали 20 из 28');

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrova.a@school.ru', 'Test#2024');

    await page.goto('announcements');
    const studentCard = page.locator('.announcement-card').filter({ hasText: 'Родительское собрание 31 октября' });
    await expect(studentCard).toContainText('прочитали 20 из 28');

    await studentCard.locator('.btn-read-full').click();
    await expect(page.locator('#modal-announcement-detail')).toBeVisible();
    await expect(page.locator('#modal-announcement-reads')).toContainText('прочитали 20 из 28');
    await page.locator('#btn-modal-dismiss').click();
    await expect(page.locator('#modal-announcement-detail')).toBeHidden();

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await page.goto('announcements');
    const teacherCard = page.locator('.announcement-card').filter({ hasText: 'Родительское собрание 31 октября' });
    await expect(teacherCard).toContainText('прочитали 20 из 28');
  });

  test('[TC-AN-07] Удаление объявления не влияет на собрание', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('meetings');
    await expect(page.locator('#section-next-meeting')).toBeVisible();
    await expect(page.locator('#section-next-meeting')).toContainText('Итоги первой четверти 7Б');
    await expect(page.locator('#section-next-meeting')).toContainText('31.10.2024');
    await expect(page.locator('#section-next-meeting')).toContainText('18:30');

    await page.goto('announcements');
    const meetingAnnouncement = page.locator('.announcement-card').filter({ hasText: 'Родительское собрание 31 октября' });
    await expect(meetingAnnouncement).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await meetingAnnouncement.locator('.btn-delete-announcement').click();
    await page.waitForTimeout(300);

    await expect(page.locator('.announcement-card').filter({ hasText: 'Родительское собрание 31 октября' })).toHaveCount(0);

    await page.goto('meetings');
    const banner = page.locator('#section-next-meeting');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Итоги первой четверти 7Б');
    await expect(banner).toContainText('31.10.2024');
    await expect(banner).toContainText('18:30');
    await expect(banner).toContainText('Каб. 302');
  });

  test('[TC-AN-08] Публикация объявления из карточки собрания', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');

    await page.goto('meetings');
    const publishBtn = page.locator('.btn-publish-announcement').first();
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    await expect(page.locator('#modal-announcement-create')).toBeVisible();
    await expect(page.locator('#announcement-create-title')).toHaveValue('Итоги первой четверти 7Б');
    await expect(page.locator('#announcement-create-class')).toHaveValue('7Б');

    await page.locator('#announcement-create-content').fill('Напоминание о собрании в Каб. 302 в 18:30. Явка родителей обязательна.');
    await page.locator('#btn-submit-create-announcement').click();
    await expect(page.locator('#modal-announcement-create')).toBeHidden();

    const cards = page.locator('.announcement-card');
    await expect(cards.first()).toContainText('Итоги первой четверти 7Б');
    await expect(cards.first()).toContainText('прочитали 0 из 28');

    await page.goto('meetings');
    const banner = page.locator('#section-next-meeting');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Итоги первой четверти 7Б');
    await expect(banner).toContainText('31.10.2024');
    await expect(banner).toContainText('18:30');
  });

  test('[TC-AN-09] Граница счётчика прочтений: 27 —> 28 и повторные открытия', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await page.evaluate(() => {
      const raw = localStorage.getItem('classroom_crm_db');
      if (raw) {
        const db = JSON.parse(raw);
        const anc = (db.announcements || []).find((a) => a.id === 'anc-02');
        if (anc) {
          anc.readBy = [
            'st-01', 'st-02', 'st-03', 'st-04', 'st-05', 'st-06', 'st-07', 'st-08', 'st-09',
            'st-10', 'st-11', 'st-12', 'st-13', 'st-14', 'st-15', 'st-16', 'st-17', 'st-18',
            'st-19', 'st-20', 'st-21', 'st-22', 'st-24', 'st-25', 'st-26', 'st-27', 'st-28'
          ];
          anc.readCount = 27;
          anc.totalCount = 28;
          localStorage.setItem('classroom_crm_db', JSON.stringify(db));
        }
      }
    });

    await loginPage.login('petrov@mail.ru', 'Test#2024');
    await page.goto('announcements');

    const card = page.locator('.announcement-card').filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(card).toContainText('прочитали 27 из 28');

    await card.locator('.btn-read-full').click();
    await expect(page.locator('#modal-announcement-detail')).toBeVisible();
    await expect(page.locator('#modal-announcement-reads')).toContainText('прочитали 28 из 28');
    await page.locator('#btn-close-announcement-modal').click();
    await expect(page.locator('#modal-announcement-detail')).toBeHidden();
    await expect(card).toContainText('прочитали 28 из 28');

    await card.locator('.btn-read-full').click();
    await expect(page.locator('#modal-announcement-detail')).toBeVisible();
    await expect(page.locator('#modal-announcement-reads')).toContainText('прочитали 28 из 28');
    await page.locator('#btn-close-announcement-modal').click();
    await expect(page.locator('#modal-announcement-detail')).toBeHidden();
    await expect(card).toContainText('прочитали 28 из 28');

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrova.a@school.ru', 'Test#2024');
    await page.goto('announcements');

    const studentCard = page.locator('.announcement-card').filter({ hasText: 'Каникулы с 28 октября по 5 ноября' });
    await expect(studentCard).toContainText('прочитали 28 из 28');

    await studentCard.locator('.btn-read-full').click();
    await expect(page.locator('#modal-announcement-detail')).toBeVisible();
    await expect(page.locator('#modal-announcement-reads')).toContainText('прочитали 28 из 28');
    await page.locator('#btn-modal-dismiss').click();
    await expect(page.locator('#modal-announcement-detail')).toBeHidden();
  });

  test('[TC-AN-10] Удаление всех объявлений: пустое состояние у всех ролей', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.login('smirnova@school.ru', 'Test#2024');
    await page.goto('announcements');

    const count = await page.locator('.announcement-card').count();
    for (let i = 0; i < count; i++) {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await page.locator('.btn-delete-announcement').first().click();
      await page.waitForTimeout(300);
    }

    const emptyState = page.locator('#announcements-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Объявлений пока нет. Опубликуйте первое — его увидят родители и ученики класса');
    await expect(page.locator('#btn-create-announcement')).toBeVisible();

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrov@mail.ru', 'Test#2024');
    await page.goto('announcements');

    await expect(page.locator('#announcements-empty-state')).toBeVisible();
    await expect(page.locator('#announcements-empty-state')).toContainText('Объявлений пока нет');
    await expect(page.locator('.announcement-card')).toHaveCount(0);

    await navPage.logout();
    await loginPage.goto();
    await loginPage.login('petrova.a@school.ru', 'Test#2024');
    await page.goto('announcements');

    await expect(page.locator('#announcements-empty-state')).toBeVisible();
    await expect(page.locator('#announcements-empty-state')).toContainText('Объявлений пока нет');
    await expect(page.locator('.announcement-card')).toHaveCount(0);
  });

});
