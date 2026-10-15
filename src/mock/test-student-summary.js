import assert from 'assert';
import { getDB, resetDB, addParentContact, addStudentNote } from '../services/storage.js';
import { calculateStudentAverage, calculateStudentAttendance, getRiskZoneStudents } from './calculations.js';
import { renderStudentSummaryView } from '../views/student-summary.js';

console.log('=== ТЕСТИРОВАНИЕ СТРАНИЦЫ «СВОДКА УЧЕНИКА» (TC-BP-22..30) ===');

// Сбрасываем базу данных к эталонному состоянию перед тестами
const db = resetDB();

// 1. TC-BP-22: Сводка ученика: полный состав данных
const st23 = db.students.find(s => s.id === 'st-23');
assert(st23, 'Ученица Петрова А. присутствует в базе');
assert.strictEqual(st23.fullName, 'Петрова Анна Сергеевна', 'ФИО ученицы совпадает');

const avg23 = calculateStudentAverage(db.grades, 'st-23', { periodId: 'q1_2024' });
assert.strictEqual(avg23, 4.5, 'TC-BP-22: Средний балл Петровой за I четверть равен 4.5');

// Проверка требования ТЗ: "единственная оценка даёт полноценное значение"
const singleGradeSubject = {
  id: 'single-grd-subj',
  studentId: 'st-23',
  subjectId: 'unique-subj',
  periodId: 'q1_2024',
  value: 4,
  date: '2024-10-10'
};
const singleAvg = calculateStudentAverage([singleGradeSubject], 'st-23', { periodId: 'q1_2024', subjectId: 'unique-subj' });
assert.strictEqual(singleAvg, 4.0, 'ТЗ: Единственная оценка по предмету даёт полноценное значение среднего балла');

// Проверка рендеринга сводки
const summaryHtml = renderStudentSummaryView({ studentId: 'st-23', periodId: 'q1_2024' });
assert(summaryHtml.includes('Петрова Анна Сергеевна'), 'TC-BP-22: Разметка содержит ФИО ученицы');
assert(summaryHtml.includes('4.5'), 'TC-BP-22: Разметка содержит средний балл 4.5');
assert(summaryHtml.includes('4 дня'), 'TC-BP-22: Разметка содержит количество дней пропусков (4 дня)');
assert(summaryHtml.includes('Успеваемость по предметам'), 'TC-BP-22: Разметка содержит блок успеваемости');
assert(summaryHtml.includes('Последние пропуски занятий'), 'TC-BP-22: Разметка содержит блок пропусков');
assert(summaryHtml.includes('История общения с родителями'), 'TC-BP-22: Разметка содержит историю контактов');
assert(summaryHtml.includes('Заметки классрука'), 'TC-BP-22: Разметка содержит блок заметок классрука');
console.log('✓ TC-BP-22: Сводка ученика содержит все 5 блоков и эталонные метрики (ср. балл 4.5, 4 дня)');

// 2. TC-BP-23: История контактов с родителем: соответствие записям
const contacts = (db.parentContacts || []).filter(c => c.studentId === 'st-23');
assert(contacts.length >= 2, 'TC-BP-23: У Петровой зафиксировано не менее 2 контактов');
assert(summaryHtml.includes('Смирнова М. В.'), 'TC-BP-23: Автор контакта — классный руководитель');
assert(summaryHtml.includes('Звонок'), 'TC-BP-23: Канал «Звонок» отображается');
assert(summaryHtml.includes('Личная беседа'), 'TC-BP-23: Канал «Личная беседа» отображается');
console.log('✓ TC-BP-23: Все контакты с родителем содержат автора, дату и канал связи');

// 3. TC-BP-24: Получение контакта родителя: телефон и «основной контакт»
const rels = db.parentStudentRelations.filter(r => r.studentId === 'st-23');
const primaryRel = rels.find(r => r.isPrimary);
assert(primaryRel, 'TC-BP-24: У Петровой есть основной контакт');
const primaryParent = db.parents.find(p => p.id === primaryRel.parentId);
assert(primaryParent && primaryParent.phone, 'TC-BP-24: У основного родителя есть телефон');
assert(summaryHtml.includes('Основной контакт'), 'TC-BP-24: Бейдж «Основной контакт» присутствует в карточке');
assert(summaryHtml.includes(primaryParent.phone), 'TC-BP-24: Телефон основного родителя виден на странице');
console.log('✓ TC-BP-24: Телефон родителя доступен сразу, бейдж «Основной контакт» отображается');

// 4. TC-BP-25: Фиксация контакта с родителем
const contactRes = addParentContact({
  studentId: 'st-23',
  parentId: primaryParent.id,
  author: 'Смирнова М. В.',
  date: '2024-10-28',
  channel: 'phone',
  summary: 'Обсудили пропуски, справку принесут после каникул',
  agreementReached: true
});
assert(contactRes.success, 'TC-BP-25: Контакт успешно зафиксирован');
const updatedDB = getDB();
const savedContact = updatedDB.parentContacts.find(c => c.summary.includes('справку принесут после каникул'));
assert(savedContact, 'TC-BP-25: Запись контакта сохранена в базе');
assert.strictEqual(savedContact.author, 'Смирнова М. В.', 'TC-BP-25: Автор совпадает');
assert.strictEqual(savedContact.channel, 'phone', 'TC-BP-25: Канал связи звонок');
console.log('✓ TC-BP-25: Контакт с родителем успешно зафиксирован и сохранён в мок-хранилище');

// 5. TC-BP-26: Валидация обязательных полей при фиксации контакта
const invalidRes1 = addParentContact({
  studentId: 'st-23',
  parentId: primaryParent.id,
  summary: '',
  channel: 'phone'
});
assert.strictEqual(invalidRes1.success, false, 'TC-BP-26: Пустой итог отклоняется');
assert(invalidRes1.error.includes('Итог'), 'TC-BP-26: Ошибка указывает на обязательное поле итога');

const invalidRes2 = addParentContact({
  studentId: 'st-23',
  parentId: primaryParent.id,
  summary: 'Успешная беседа',
  channel: ''
});
assert.strictEqual(invalidRes2.success, false, 'TC-BP-26: Пустой канал отклоняется');
console.log('✓ TC-BP-26: Валидация обязательных полей при фиксации контакта работает корректно');

// 6. TC-BP-27: Фиксация наблюдения заметкой классрука
const noteRes = addStudentNote({
  studentId: 'st-23',
  author: 'Смирнова М. В.',
  text: 'Стал замкнут, нужна беседа с психологом',
  isPrivate: true
});
assert(noteRes.success, 'TC-BP-27: Заметка успешно сохранена');
const dbAfterNote = getDB();
const savedNote = dbAfterNote.notes.find(n => n.text.includes('нужна беседа с психологом'));
assert(savedNote, 'TC-BP-27: Заметка присутствует в db.notes');
assert.strictEqual(savedNote.studentId, 'st-23', 'TC-BP-27: Заметка привязана к ученице');
console.log('✓ TC-BP-27: Фиксация наблюдения заметкой классрука сохранена в хранилище');

// 7. TC-BP-28: Договорённость достигнута: комментарий или заметка
const reachedContact = addParentContact({
  studentId: 'st-23',
  parentId: primaryParent.id,
  channel: 'personal',
  summary: 'Согласовали график пересдачи контрольной',
  agreementReached: true
});
assert(reachedContact.success, 'TC-BP-28: Контакт с договорённостью сохранён');
assert.strictEqual(reachedContact.contact.agreementReached, true, 'TC-BP-28: Флаг договорённости true');
assert.strictEqual(reachedContact.contact.nextContactDate, null, 'TC-BP-28: Повторный контакт не назначен');
console.log('✓ TC-BP-28: Договорённость достигнута: статус зафиксирован, повторный контакт не назначается');

// 8. TC-BP-29: Договорённость не достигнута: напоминание о повторном контакте
const unreachedContact = addParentContact({
  studentId: 'st-23',
  parentId: primaryParent.id,
  channel: 'phone',
  summary: 'Родитель не ответил на звонок',
  agreementReached: false,
  nextContactDate: '2024-11-02'
});
assert(unreachedContact.success, 'TC-BP-29: Контакт без договорённости сохранён');
assert.strictEqual(unreachedContact.contact.agreementReached, false, 'TC-BP-29: Флаг договорённости false');
assert.strictEqual(unreachedContact.contact.nextContactDate, '2024-11-02', 'TC-BP-29: Дата повторного контакта сохранена');
console.log('✓ TC-BP-29: Договорённость не достигнута: напоминание о повторном контакте с датой сохранено');

// 9. TC-BP-30: Приватность заметок классрука
assert.strictEqual(savedNote.isPrivate, true, 'TC-BP-30: Заметка классного руководителя помечена как приватная');
console.log('✓ TC-BP-30: Заметки классрука имеют статус приватных');

console.log('\n🎉 ВСЕ ТЕСТ-КЕЙСЫ СТРАНИЦЫ «СВОДКА УЧЕНИКА» (TC-BP-22..30) УСПЕШНО ПРОЙДЕНЫ!\n');
