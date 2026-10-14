import assert from 'node:assert';
import { getDB, resetDB, confirmAbsenceRecord, batchConfirmAbsences } from '../services/storage.js';
import { getUnconfirmedAbsences } from './calculations.js';
import { renderAttendanceView } from '../views/attendance.js';

console.log('--- Запуск тестов модуля «Посещаемость: подтверждение пропусков» ---');

resetDB();
const initialDB = getDB();

const initialUnconfirmed = getUnconfirmedAbsences(initialDB.attendance, initialDB.lessons, initialDB.students, { periodId: 'q1_2024' });
console.log(`[TEST 1] Исходное количество неподтверждённых пропусков: ${initialUnconfirmed.length}`);
assert.strictEqual(initialUnconfirmed.length, 4, 'Должно быть ровно 4 неподтверждённых пропуска в I четверти');

const sidorovAbsences = initialUnconfirmed.filter(a => a.studentId === 'st-14');
const petrovaAbsences = initialUnconfirmed.filter(a => a.studentId === 'st-23');
assert.strictEqual(sidorovAbsences.length, 1, 'У Сидорова 1 неподтверждённый пропуск за период');
assert.strictEqual(petrovaAbsences.length, 1, 'У Петровой 1 неподтверждённый пропуск за период');
assert.strictEqual(sidorovAbsences[0].lessonId, 'lsn-37', 'Пропуск Сидорова относится к уроку lsn-37');
assert.strictEqual(petrovaAbsences[0].lessonId, 'lsn-39', 'Пропуск Петровой относится к уроку lsn-39');

// Проверяем динамический рендеринг исходного баннера (содержит ФИО всех учеников с пропусками)
const initialHtml = renderAttendanceView({ weekId: 'w8' });
assert(initialHtml.includes('Сидоров Никита (1 урок)'), 'Баннер должен содержать Сидорова');
assert(initialHtml.includes('Петрова Анна (1 урок)'), 'Баннер должен содержать Петрову');
assert(initialHtml.includes('ПН, 21 ОКТ'), 'Таблица недели w8 должна содержать даты 21-25 октября');

// 2. Подтверждение одиночного пропуска Сидорова со справкой
const targetRecord = sidorovAbsences[0];
console.log(`[TEST 2] Подтверждение пропуска Сидорова ID: ${targetRecord.id}`);
const confirmResult = confirmAbsenceRecord(targetRecord.id, {
  status: 'excused',
  reason: 'ОРВИ, осмотр педиатра',
  document: 'Справка № 142 от 25.10.2024 (ДГП № 1)',
  confirmedBy: 'Смирнова М. В.'
});

assert.strictEqual(confirmResult.success, true, 'Подтверждение должно пройти успешно');
assert.strictEqual(confirmResult.record.status, 'excused', 'Статус должен смениться на excused');
assert.strictEqual(confirmResult.record.code, 'УП', 'Код должен быть УП');
assert.strictEqual(confirmResult.record.document, 'Справка № 142 от 25.10.2024 (ДГП № 1)');

// 3. Проверка пересчёта неподтверждённых пропусков и динамического текста баннера
const updatedDB = getDB();
const updatedUnconfirmed = getUnconfirmedAbsences(updatedDB.attendance, updatedDB.lessons, updatedDB.students, { periodId: 'q1_2024' });
console.log(`[TEST 3] Неподтверждённых пропусков после 1 подтверждения: ${updatedUnconfirmed.length}`);
assert.strictEqual(updatedUnconfirmed.length, 3, 'Должно остаться 3 неподтверждённых пропуска');
assert.strictEqual(updatedDB.meta.unconfirmedAbsencesCount, 3, 'db.meta.unconfirmedAbsencesCount должен уменьшиться до 3');

const updatedHtml = renderAttendanceView({ weekId: 'w8' });
assert(!updatedHtml.includes('Сидоров Никита (1 урок)'), 'Сидоров должен исчезнуть из текста баннера после подтверждения');
assert(updatedHtml.includes('Петрова Анна (1 урок)'), 'Петрова должна оставаться в тексте баннера');
assert(updatedHtml.includes('>УП<'), 'В таблице должен появиться янтарный бейдж УП');

// 4. Массовое подтверждение пропусков Котова и Кузнецова
const batchTargetIds = ['att-0178', 'att-0655'];
console.log(`[TEST 4] Пакетное подтверждение для ${batchTargetIds.length} пропусков`);
const batchResult = batchConfirmAbsences(batchTargetIds, {
  status: 'excused',
  reason: 'Семейные обстоятельства (по заявлению)',
  document: 'Заявление родителей от 01.10.2024',
  confirmedBy: 'Смирнова М. В.'
});

assert.strictEqual(batchResult.success, true, 'Пакетное подтверждение должно пройти успешно');
assert.strictEqual(batchResult.updatedCount, 2, 'Должно обновиться 2 пропуска');

// 5. Проверка после пакетного подтверждения: текст баннера содержит только Петрову
const dbAfterBatch = getDB();
const unconfirmedAfterBatch = getUnconfirmedAbsences(dbAfterBatch.attendance, dbAfterBatch.lessons, dbAfterBatch.students, { periodId: 'q1_2024' });
console.log(`[TEST 5] Остался неподтверждённым только пропуск Петровой: ${unconfirmedAfterBatch.length}`);
assert.strictEqual(unconfirmedAfterBatch.length, 1, 'Должен остаться ровно 1 пропуск');
assert.strictEqual(unconfirmedAfterBatch[0].studentId, 'st-23', 'Оставшийся пропуск принадлежит Петровой');

const afterBatchHtml = renderAttendanceView({ weekId: 'w8' });
assert(afterBatchHtml.includes('Петрова Анна (1 урок) имеет пропуск уроков без подтверждающих документов'), 'Текст баннера должен динамически переключиться в единственное число');

// 6. Подтверждение пропуска Петровой как неуважительного (прогул)
const petrovaRecordId = unconfirmedAfterBatch[0].id;
const petrovaConfirmResult = confirmAbsenceRecord(petrovaRecordId, {
  status: 'unexcused',
  reason: 'Прогул урока',
  confirmedBy: 'Смирнова М. В.'
});
assert.strictEqual(petrovaConfirmResult.success, true);
assert.strictEqual(petrovaConfirmResult.record.status, 'unexcused');
assert.strictEqual(petrovaConfirmResult.record.code, 'Н');

const finalDB = getDB();
const finalUnconfirmed = getUnconfirmedAbsences(finalDB.attendance, finalDB.lessons, finalDB.students, { periodId: 'q1_2024' });
console.log(`[TEST 6] Неподтверждённых пропусков после полной обработки: ${finalUnconfirmed.length}`);
assert.strictEqual(finalUnconfirmed.length, 0, 'Все пропуски должны быть подтверждены');
assert.strictEqual(finalDB.meta.unconfirmedAbsencesCount, 0, 'db.meta.unconfirmedAbsencesCount должен стать 0');

const finalHtml = renderAttendanceView({ weekId: 'w8' });
assert(finalHtml.includes('Все пропуски подтверждены'), 'Баннер должен переключиться в зеленый блок «Все пропуски подтверждены»');

// 7. Проверка динамического переключения недель
const week2Html = renderAttendanceView({ weekId: 'w2' });
assert(week2Html.includes('ПН, 09 СЕН'), 'Неделя w2 должна отображать 09 сентября');
assert(week2Html.includes('ПТ, 13 СЕН'), 'Неделя w2 должна отображать 13 сентября');

// Восстанавливаем исходное состояние БД
resetDB();
console.log('✔ Все тесты бизнес-процесса «Посещаемость: подтверждение пропусков» успешно пройдены!');
