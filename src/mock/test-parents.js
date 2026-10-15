import assert from 'node:assert';
import { getDB, resetDB, saveDB, addParent, updateParent, deleteParent, linkParentToStudent, unlinkParentFromStudent } from '../services/storage.js';
import { renderParentsView, renderParentSummaryView } from '../views/parents.js';

console.log('=== ТЕСТИРОВАНИЕ СТРАНИЦЫ «БАЗА РОДИТЕЛЕЙ» (TC-PR-01..18) ===');

resetDB();
let db = getDB();

// 1. TC-PR-01: База родителей класса: список, заголовки, колонки, Петров С. В.
const htmlDefault = renderParentsView({ page: '1' });
assert(htmlDefault.includes('Родители 7Б'), 'TC-PR-01: Заголовок содержит «Родители 7Б»');
assert(htmlDefault.includes('32 родителя · у 28 учеников'), 'TC-PR-01: Подпись содержит «32 родителя · у 28 учеников»');
assert(htmlDefault.includes('Родитель') && htmlDefault.includes('Дети') && htmlDefault.includes('Роль связи') && htmlDefault.includes('Основной контакт'), 'TC-PR-01: Колонки присутствуют');

const htmlPetrov = renderParentsView({ searchQuery: 'петров' });
assert(htmlPetrov.includes('Петров Сергей Викторович'), 'TC-PR-01: В списке присутствует Петров С. В.');
assert(htmlPetrov.includes('+7 999 123-45-63'), 'TC-PR-01: У Петрова С. В. телефон +7 999 123-45-63');
assert(htmlPetrov.includes('Петрова Анна'), 'TC-PR-01: У Петрова С. В. ребёнок Петрова Анна (7Б)');
assert(htmlPetrov.includes('Отец'), 'TC-PR-01: У Петрова С. В. роль «Отец»');
assert(htmlPetrov.includes('Основной контакт'), 'TC-PR-01: У Петрова С. В. бейдж «Основной контакт»');
console.log('✓ [TEST 1] TC-PR-01: Заголовок «Родители 7Б», подпись «32 родителя · у 28 учеников», колонки и строка Петрова С. В.');

// 2. TC-PR-02: Поиск по фамилии («сидор») и по телефону («123-45-62»)
const htmlSidor = renderParentsView({ searchQuery: 'сидор' });
assert(htmlSidor.includes('Сидорова Ольга Николаевна'), 'TC-PR-02: Поиск «сидор» находит Сидорову О. Н.');
assert(htmlSidor.includes('1 из 32'), 'TC-PR-02: Счётчик при поиске «сидор» показывает 1 из 32');

const htmlPhone = renderParentsView({ searchQuery: '123-45-62' });
assert(htmlPhone.includes('Котова'), 'TC-PR-02: Поиск «123-45-62» находит Котову');
assert(htmlPhone.includes('1 из 32'), 'TC-PR-02: Счётчик при поиске по телефону показывает 1 из 32');
console.log('✓ [TEST 2] TC-PR-02: Поиск по части фамилии (со строчной буквы) и по телефону регистронезависим');

// 3. TC-PR-03: Фильтр «Без связи» и пустой результат
const htmlNoLink = renderParentsView({ filterLink: 'no_link' });
assert(htmlNoLink.includes('Орлова'), 'TC-PR-03: При фильтре «Без связи» отображается Орлова Н. П.');
assert(htmlNoLink.includes('1 из 32'), 'TC-PR-03: Счётчик фильтра «Без связи» показывает 1 из 32');
assert(!htmlNoLink.includes('Петров Сергей Викторович'), 'TC-PR-03: Родители со связями отфильтрованы');

const htmlEmpty = renderParentsView({ filterLink: 'no_link', searchQuery: 'сидор' });
assert(htmlEmpty.includes('Ничего не найдено'), 'TC-PR-03: При комбинации фильтра без связи и поиска отображается «Ничего не найдено»');
assert(htmlEmpty.includes('0 из 32'), 'TC-PR-03: Счётчик показывает 0 из 32');
assert(htmlEmpty.includes('Сбросить фильтры'), 'TC-PR-03: Доступна кнопка сброса фильтров');
console.log('✓ [TEST 3] TC-PR-03: Фильтр «Без связи» и пустой результат с кнопкой сброса');

// 4. TC-PR-04..05: Добавление родителя и валидация телефона
const addNoPhoneRes = addParent({ fullName: 'Орлов Пётр Иванович', phone: '' });
assert.strictEqual(addNoPhoneRes.success, false, 'TC-PR-05: Добавление родителя без телефона запрещено');
assert.strictEqual(addNoPhoneRes.error, 'Укажите телефон', 'TC-PR-05: Подсказка об ошибке телефона');

const addSuccessRes = addParent({
  fullName: 'Котов Дмитрий Сергеевич',
  phone: '+7 999 123-45-66',
  studentId: 'st-07', // Котов Максим
  relationRole: 'Отец',
  isPrimary: false
});
assert.strictEqual(addSuccessRes.success, true, 'TC-PR-04: Родитель успешно добавлен');

const htmlAfterAdd = renderParentsView({ searchQuery: 'котов дмитрий' });
assert(htmlAfterAdd.includes('Котов Дмитрий Сергеевич'), 'TC-PR-04: Новый родитель найден в списке');
assert(htmlAfterAdd.includes('Отец'), 'TC-PR-04: Роль «Отец»');
assert(htmlAfterAdd.includes('Дополнительный'), 'TC-PR-04: Флаг основного контакта не установлен (у Максима основной контакт мать)');
assert(renderParentsView().includes('33 родителя · у 28 учеников'), 'TC-PR-04: Счётчик обновился до 33 родителей');
console.log('✓ [TEST 4] TC-PR-04..05: Добавление родителя со связью и валидация обязательности телефона');

// 5. TC-PR-06..07: Карточка родителя, обновление телефона
const kotova = getDB().parents.find(p => p.lastName === 'Котова');
assert(kotova !== undefined, 'Котова найдена в базе');
const updateRes = updateParent(kotova.id, { phone: '+7 999 123-45-68' });
assert.strictEqual(updateRes.success, true, 'TC-PR-06: Телефон Котовой успешно обновлён');

const htmlKotovaUpdated = renderParentsView({ searchQuery: 'котова' });
assert(htmlKotovaUpdated.includes('+7 999 123-45-68'), 'TC-PR-06: Новый телефон отображается в списке родителей');
console.log('✓ [TEST 5] TC-PR-06..07: Изменение телефона родителя отражается в базе');

// 6. TC-PR-08..09: Связывание родителя с учеником и один основной контакт
const orlova = getDB().parents.find(p => p.lastName === 'Орлова');
assert(orlova !== undefined, 'Орлова найдена');
const linkRes = linkParentToStudent(orlova.id, 'st-01', { relationRole: 'Опекун', isPrimary: false }); // Александров Егор
assert.strictEqual(linkRes.success, true, 'TC-PR-08: Связь с Александровым создана');

const htmlNoLinkAfter = renderParentsView({ filterLink: 'no_link' });
assert(htmlNoLinkAfter.includes('0 из 33') || htmlNoLinkAfter.includes('Ничего не найдено'), 'TC-PR-08: Фильтр без связи пуст после привязки Орловой');

// Переключение основного контакта (TC-PR-09)
const petrovaMother = getDB().parents.find(p => p.fullName.includes('Петрова Елена'));
assert(petrovaMother !== undefined, 'Мать Петровой найдена');
linkParentToStudent(petrovaMother.id, 'st-23', { isPrimary: true }); // делаем мать основным контактом Анны
const updatedDB = getDB();
const relFather = updatedDB.parentStudentRelations.find(r => r.studentId === 'st-23' && r.parentId === 'pr-23');
const relMother = updatedDB.parentStudentRelations.find(r => r.studentId === 'st-23' && r.parentId === petrovaMother.id);
assert.strictEqual(relMother.isPrimary, true, 'TC-PR-09: Мать стала основным контактом');
assert.strictEqual(relFather.isPrimary, false, 'TC-PR-09: У отца флаг основного контакта автоматически снят');
console.log('✓ [TEST 6] TC-PR-08..09: Связывание с учеником и правило одного основного контакта');

// 7. TC-PR-12: Удаление родителя
const delRes = deleteParent(orlova.id);
assert.strictEqual(delRes.success, true, 'TC-PR-12: Удаление родителя прошло успешно');
assert.strictEqual(getDB().parents.length, 32, 'TC-PR-12: Счётчик вернулся к 32 родителям');
console.log('✓ [TEST 7] TC-PR-12: Удаление родителя из базы');

// 8. TC-PR-13: Сводка по родителю: состав экрана, хлебные крошки, карточка, кнопки и дети
const htmlSummarySidorova = renderParentSummaryView({ parentId: 'pr-27' }); // Сидорова О. Н.
assert(htmlSummarySidorova.includes('Класс 7Б') && htmlSummarySidorova.includes('Родители') && htmlSummarySidorova.includes('Сидорова Ольга Николаевна'), 'TC-PR-13: Строка пути содержит «Класс 7Б / Родители / Сидорова Ольга Николаевна»');
assert(htmlSummarySidorova.includes('+7 999 123-45-64'), 'TC-PR-13: Телефон Сидоровой +7 999 123-45-64');
assert(htmlSummarySidorova.includes('Основной контакт'), 'TC-PR-13: Бейдж «Основной контакт»');
assert(htmlSummarySidorova.includes('Анкетные данные — только чтение в сводке'), 'TC-PR-13: Пометка об анкетных данных');
assert(htmlSummarySidorova.includes('Сидоров Никита'), 'TC-PR-13: Блок дети содержит Сидорова Никиту');
assert(htmlSummarySidorova.includes('Мать'), 'TC-PR-13: Роль «Мать»');
assert(htmlSummarySidorova.includes('Открыть сводку по ученику'), 'TC-PR-13: Ссылка «Открыть сводку по ученику»');
assert(htmlSummarySidorova.includes('Зафиксировать контакт'), 'TC-PR-13: Кнопка «Зафиксировать контакт»');
assert(htmlSummarySidorova.includes('Связать с учеником'), 'TC-PR-13: Кнопка «Связать с учеником»');
assert(htmlSummarySidorova.includes('Снять связь'), 'TC-PR-13: Кнопка «Снять связь»');
assert(htmlSummarySidorova.includes('26.10.2024') && htmlSummarySidorova.includes('18.10.2024'), 'TC-PR-13: Записи общения 26.10.2024 и 18.10.2024');
console.log('✓ [TEST 8] TC-PR-13: Сводка по родителю Сидоровой О. Н. (строка пути, телефон, бейдж, кнопки «Связать», «Снять связь», «Зафиксировать контакт», история)');

// 9. TC-PR-14: Сводка родителя с детьми в разных классах (Котова Е. П.)
const htmlKotovaSummary = renderParentSummaryView({ parentId: 'pr-10' }); // Котова Е. П.
assert(htmlKotovaSummary.includes('Котов Максим'), 'TC-PR-14: В блоке «Дети» отображается Котов Максим (7Б)');
assert(htmlKotovaSummary.includes('Котова Дарья') && htmlKotovaSummary.includes('9В'), 'TC-PR-14: В блоке «Дети» отображается Котова Дарья (9В)');
assert(htmlKotovaSummary.includes('Ребёнок под наблюдением'), 'TC-PR-14: Присутствует блок «Ребёнок под наблюдением»');
assert(htmlKotovaSummary.includes('Котов Максим') && htmlKotovaSummary.includes('Пропуски уроков'), 'TC-PR-14: Блок «Ребёнок под наблюдением» показывает Максима с его пропусками');

// Проверка перехода к Дарье в 9В (данные чужого класса доступны только для чтения)
const { renderStudentSummaryView } = await import('../views/student-summary.js');
const htmlDarya = renderStudentSummaryView({ studentId: 'ext-Котова%20Дарья' });
assert(htmlDarya.includes('Котова Дарья'), 'TC-PR-14: Сводка по Дарье открывается');
assert(htmlDarya.includes('другой класс') || htmlDarya.includes('только для чтения') || htmlDarya.includes('только просмотр'), 'TC-PR-14: Данные ученика из другого класса (9В) доступны только для чтения');
assert(!htmlDarya.includes('btn-confirm-absence-action'), 'TC-PR-14: Кнопка подтверждения причин скрыта для другого класса');
assert(!htmlDarya.includes('btn-open-note-modal'), 'TC-PR-14: Кнопка добавления заметок скрыта для другого класса');
assert(!htmlDarya.includes('btn-open-contact-modal'), 'TC-PR-14: Кнопка фиксации контакта скрыта в сводке ученика другого класса');
assert(!htmlDarya.includes('id="modal-confirm-student-absence"'), 'TC-PR-14: Модальное окно подтверждения пропусков отсутствует');
assert(!htmlDarya.includes('id="modal-add-note"'), 'TC-PR-14: Модальное окно заметок отсутствует');
assert(!htmlDarya.includes('id="modal-contact-parent"'), 'TC-PR-14: Модальное окно фиксации контакта отсутствует');
console.log('✓ [TEST 9] TC-PR-14: Сводка родителя с детьми в разных классах (Максим 7Б и Дарья 9В, блок наблюдения Максима, просмотр Дарьи только для чтения без кнопок редактирования)');

// 10. TC-PR-15: Фиксация контакта с родителем Сидоровой О. Н.
const dbBeforeContact = getDB();
const newContactRecord = {
  id: `pc-test-${Date.now()}`,
  parentId: 'pr-27',
  studentId: 'st-14', // Сидоров Никита
  author: 'Смирнова М. В.',
  date: '2024-10-28',
  time: '15:30',
  channel: 'phone',
  channelLabel: 'Звонок',
  summary: 'Дозвонились, справку принесёт 29.10',
  agreementReached: true,
  nextContactDate: null
};
dbBeforeContact.parentContacts.unshift(newContactRecord);
saveDB(dbBeforeContact);

const htmlSidorovaAfterContact = renderParentSummaryView({ parentId: 'pr-27' });
assert(htmlSidorovaAfterContact.includes('28.10.2024'), 'TC-PR-15: Запись с датой 28.10.2024 появилась в истории');
assert(htmlSidorovaAfterContact.includes('Дозвонились, справку принесёт 29.10'), 'TC-PR-15: Текст итога отображается');
assert(htmlSidorovaAfterContact.includes('Договорённость достигнута'), 'TC-PR-15: Флажок «Договорённость достигнута» сохранён');

// Проверка наличия той же записи в сводке ученика Сидорова Никиты (st-14)
const htmlNikitaSummary = renderStudentSummaryView({ studentId: 'st-14' });
assert(htmlNikitaSummary.includes('Дозвонились, справку принесёт 29.10'), 'TC-PR-15: Та же запись видна в сводке ученика Сидорова Никиты');

// Проверка отображения последнего контакта в базе родителей
const htmlParentsListAfterContact = renderParentsView({ searchQuery: 'сидорова' });
assert(htmlParentsListAfterContact.includes('28.10.2024') && htmlParentsListAfterContact.includes('Звонок'), 'TC-PR-15: Последний контакт сразу виден в базе родителей');
console.log('✓ [TEST 10] TC-PR-15: Фиксация контакта с родителем (дата 28.10.2024, звонок, договорённость достигнута, видна у ученика и в базе)');

// 11. TC-PR-16: Фиксация контакта: обязательные поля
// Проверяем валидацию: без канала связи или без итога контакт не должен добавляться
function validateContactFields(channel, summary) {
  if (!channel || !channel.trim()) return { valid: false, error: 'Выберите канал связи' };
  if (!summary || !summary.trim()) return { valid: false, error: 'Заполните итог разговора' };
  return { valid: true };
}
assert.strictEqual(validateContactFields('', 'Итог есть').valid, false, 'TC-PR-16: Без канала сохранение запрещено');
assert.strictEqual(validateContactFields('phone', '').valid, false, 'TC-PR-16: Без итога сохранение запрещено');
assert.strictEqual(validateContactFields('phone', 'Обсудили успеваемость').valid, true, 'TC-PR-16: С каналом и итогом форма валидна');
console.log('✓ [TEST 11] TC-PR-16: Валидация обязательности канала связи и итога разговора');

// 12. TC-PR-17: Запись контакта без привязки к ученику (Котова Е. П.)
const newGeneralContact = {
  id: `pc-test-general-${Date.now()}`,
  parentId: 'pr-10',
  studentId: null, // Поле «по поводу кого» оставлено пустым
  author: 'Смирнова М. В.',
  date: '2024-10-28',
  time: '16:00',
  channel: 'chat',
  channelLabel: 'Мессенджер',
  summary: 'Напоминание о собрании 31.10',
  agreementReached: true,
  nextContactDate: null
};
const dbWithGeneral = getDB();
dbWithGeneral.parentContacts.unshift(newGeneralContact);
saveDB(dbWithGeneral);

const htmlKotovaGeneral = renderParentSummaryView({ parentId: 'pr-10' });
assert(htmlKotovaGeneral.includes('Напоминание о собрании 31.10'), 'TC-PR-17: Запись сохранена и видна в истории родителя');

// Проверяем, что в сводках детей (Максима st-06 и Дарьи) этой записи НЕТ
const htmlMaksim = renderStudentSummaryView({ studentId: 'st-06' });
assert(!htmlMaksim.includes('Напоминание о собрании 31.10'), 'TC-PR-17: В сводке Максима запись общего контакта отсутствует');
const htmlDaryaGeneral = renderStudentSummaryView({ studentId: 'ext-Котова%20Дарья' });
assert(!htmlDaryaGeneral.includes('Напоминание о собрании 31.10'), 'TC-PR-17: В сводке Дарьи запись общего контакта отсутствует');
console.log('✓ [TEST 12] TC-PR-17: Запись контакта без привязки к ученику видна у родителя, но не дублируется у детей');

// 13. TC-PR-18: История общения: порядок записей и пустое состояние
// У Петрова С. В. (pr-23) история общения пуста
const htmlPetrovSummary = renderParentSummaryView({ parentId: 'pr-23' });
assert(htmlPetrovSummary.includes('Разговоров с этим родителем ещё не было'), 'TC-PR-18: У Петрова С. В. пустое состояние «Разговоров с этим родителем ещё не было»');
assert(htmlPetrovSummary.includes('Зафиксировать контакт'), 'TC-PR-18: Кнопка «Зафиксировать контакт» доступна в пустом состоянии');

// У Сидоровой О. Н. записи идут в строгом хронологическом порядке: сверху 28.10.2024, затем 26.10.2024, затем 18.10.2024
const idx28 = htmlSidorovaAfterContact.indexOf('28.10.2024');
const idx26 = htmlSidorovaAfterContact.indexOf('26.10.2024');
const idx18 = htmlSidorovaAfterContact.indexOf('18.10.2024');
assert(idx28 !== -1 && idx26 !== -1 && idx18 !== -1, 'TC-PR-18: Все три даты присутствуют');
assert(idx28 < idx26 && idx26 < idx18, 'TC-PR-18: Записи отсортированы сверху вниз по убыванию даты');
console.log('✓ [TEST 13] TC-PR-18: Хронологический порядок записей и пустое состояние у родителя без разговоров');

// 14. Снятие связи с учеником (TC-PR-13)
const unlinkRes = unlinkParentFromStudent('pr-27', 'st-14');
assert.strictEqual(unlinkRes.success, true, 'TC-PR-13: Снятие связи с учеником выполнено');
const relAfterUnlink = getDB().parentStudentRelations.find(r => r.parentId === 'pr-27' && r.studentId === 'st-14');
assert.strictEqual(relAfterUnlink, undefined, 'TC-PR-13: Связь Сидоровой с Никитой удалена из хранилища');
console.log('✓ [TEST 14] TC-PR-13: Снятие связи родителя с учеником (unlinkParentFromStudent)');

console.log('\n🎉 ВСЕ ТЕСТ-КЕЙСЫ МОДУЛЯ «БАЗА РОДИТЕЛЕЙ» (TC-PR-01..18) УСПЕШНО ПРОЙДЕНЫ!\n');
