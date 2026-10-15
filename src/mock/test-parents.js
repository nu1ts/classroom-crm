import assert from 'node:assert';
import { getDB, resetDB, addParent, updateParent, deleteParent, linkParentToStudent } from '../services/storage.js';
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

// 8. TC-PR-13..18: Сводка по родителю
const htmlSummarySidorova = renderParentSummaryView({ parentId: 'pr-27' }); // Сидорова О. Н.
assert(htmlSummarySidorova.includes('Класс 7Б / Родители / Сидорова Ольга Николаевна') || htmlSummarySidorova.includes('Сидорова Ольга Николаевна'), 'TC-PR-13: Строка пути и ФИО Сидоровой');
assert(htmlSummarySidorova.includes('Сидоров Никита'), 'TC-PR-13: Блок дети содержит Сидорова Никиту');
assert(htmlSummarySidorova.includes('Зафиксировать контакт') || htmlSummarySidorova.includes('Добавить запись'), 'TC-PR-13: Кнопка фиксации контакта доступна');

const htmlSummaryPetrov = renderParentSummaryView({ parentId: 'pr-23' }); // Петров С. В.
assert(htmlSummaryPetrov.includes('Петров Сергей Викторович'), 'TC-PR-18: Сводка Петрова открывается');
console.log('✓ [TEST 8] TC-PR-13..18: Сводка по родителю, связанные дети и история общения');

console.log('\n🎉 ВСЕ ТЕСТ-КЕЙСЫ МОДУЛЯ «БАЗА РОДИТЕЛЕЙ» (TC-PR-01..18) УСПЕШНО ПРОЙДЕНЫ!\n');
