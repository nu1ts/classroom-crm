import assert from 'node:assert';
import { getDB, resetDB, addJournalComment, getJournalComments, confirmAbsenceRecord } from '../services/storage.js';
import { renderJournalView } from '../views/journal.js';

console.log('=== ТЕСТИРОВАНИЕ СТРАНИЦЫ «ЖУРНАЛ КЛАССА» (TC-TCH-12..16, БП-ПРОПУСКИ) ===');

resetDB();
const db = getDB();

// 1. Проверка рендеринга страницы журнала по умолчанию
const htmlDefault = renderJournalView();
console.log('✓ [TEST 1] Рендеринг журнала по умолчанию');
assert(htmlDefault.includes('Журнал класса 7Б'), 'Должен содержать заголовок «Журнал класса 7Б»');
assert(htmlDefault.includes('Режим классрука (просмотр и комментарии)'), 'Должен быть бейдж режима классного руководителя');
assert(htmlDefault.includes('Все предметы'), 'По умолчанию выбран фильтр «Все предметы»');
assert(htmlDefault.includes('Найти пропуски за период'), 'Должна присутствовать кнопка шага БП «Найти пропуски за период»');

// 2. Проверка метрик журнала в шапке
assert(htmlDefault.includes('303'), 'Всего выставлено 303 оценки в I четверти');
assert(htmlDefault.includes('4.2'), 'Средний балл класса равен 4.2');
assert(htmlDefault.includes('72'), 'Всего 72 пропуска за период');
assert(htmlDefault.includes('4 не подтверждено'), '4 неподтверждённых пропуска требуют справку');
console.log('✓ [TEST 2] Сводные метрики журнала (303 оценки, ср. балл 4.2, 72 пропуска, 4 неподтверждённых) корректны');

// 3. Шаг БП: поиск пропусков за период
const htmlAbsences = renderJournalView({ filterOnlyAbsences: true });
console.log('✓ [TEST 3] Шаг БП: поиск пропусков за период (filterOnlyAbsences=true)');
assert(htmlAbsences.includes('Шаг БП: Поиск пропусков за период активирован'), 'Должен появиться баннер шага БП');
assert(htmlAbsences.includes('Показаны только пропуски'), 'Кнопка поиска пропусков активна');
assert(htmlAbsences.includes('Только неподтверждённые («Н»)'), 'Должна быть кнопка фильтрации только неподтверждённых');

// 4. Фильтр только неподтверждённых пропусков («Н»)
const htmlUnconfirmed = renderJournalView({ filterOnlyAbsences: true, filterUnconfirmedOnly: true });
console.log('✓ [TEST 4] Фильтр только неподтверждённых пропусков («Н»)');
assert(htmlUnconfirmed.includes('Сидоров Никита'), 'Сидоров имеет неподтверждённый пропуск');
assert(htmlUnconfirmed.includes('Петрова Анна'), 'Петрова имеет неподтверждённый пропуск');

// 5. TC-TCH-16: Фильтр «Показывать только записи»
const htmlOnlyEntries = renderJournalView({ filterOnlyEntries: true });
console.log('✓ [TEST 5] Фильтр «Показывать только записи» (TC-TCH-16)');
assert(htmlOnlyEntries.includes('Показывать только записи'), 'Чекбокс фильтра только записей должен отображаться');

// 6. TC-TCH-12: Добавление комментария классного руководителя к записи журнала
const testLessonId = 'lsn-37'; // 24.10.2024
const testStudentId = 'st-14'; // Сидоров Никита
const commentResult = addJournalComment({
  lessonId: testLessonId,
  studentId: testStudentId,
  text: 'Родители уведомлены, справка ожидается',
  author: 'Смирнова М. В.',
  role: 'teacher'
});

assert.strictEqual(commentResult.success, true, 'Комментарий должен успешно добавиться');
assert.strictEqual(commentResult.comment.text, 'Родители уведомлены, справка ожидается');
assert.strictEqual(commentResult.comment.author, 'Смирнова М. В.');
assert.strictEqual(commentResult.comment.role, 'teacher');

const savedComments = getJournalComments(testLessonId, testStudentId);
assert.strictEqual(savedComments.length, 1, 'В БД должен сохраниться ровно 1 комментарий');
assert.strictEqual(savedComments[0].text, 'Родители уведомлены, справка ожидается');
console.log('✓ [TEST 6] TC-TCH-12: Комментарий классного руководителя успешно сохранён и прочитан из хранилища');

// 7. Проверка отображения индикатора комментария в ячейке
const htmlWithComments = renderJournalView();
assert(htmlWithComments.includes('bg-brand-500 ring-2 ring-white'), 'В ячейке должен появиться индикатор комментария');
console.log('✓ [TEST 7] Индикатор комментария отображается в сетке журнала');

// 8. Подтверждение уважительной причины пропуска прямо из записи журнала
const confirmRes = confirmAbsenceRecord('att-1031', {
  status: 'excused',
  reason: 'Справка ОРВИ',
  document: 'Справка № 142 от 25.10.2024 (ДГП № 1)',
  confirmedBy: 'Смирнова М. В.'
});
assert.strictEqual(confirmRes.success, true, 'Пропуск успешно подтверждён');
assert.strictEqual(confirmRes.record.status, 'excused');
assert.strictEqual(confirmRes.record.code, 'УП');

const htmlAfterConfirm = renderJournalView();
assert(htmlAfterConfirm.includes('3 не подтверждено'), 'Счётчик неподтверждённых пропусков уменьшился до 3');
console.log('✓ [TEST 8] Подтверждение пропуска из журнала пересчитывает метрики и меняет статус на уважительный');

console.log('🎉 ВСЕ 8 ПРОВЕРОК МОДУЛЯ «ЖУРНАЛ КЛАССА» УСПЕШНО ПРОЙДЕНЫ!\n');
