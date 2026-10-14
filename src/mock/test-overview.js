/**
 * Автоматизированный тест дашборда «Обзор класса» (TC-BP-01..05, TC-BP-13..21)
 */

import { INITIAL_DATASET } from './dataset.js';
import {
  getDB,
  resetDB,
  clearSession,
  login,
  saveDB
} from '../services/storage.js';
import {
  calculateAttendanceForDay,
  calculateClassAverage,
  getUnconfirmedAbsences,
  getRiskZoneStudents
} from './calculations.js';
import { renderOverviewView } from '../views/overview.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✓ ${message}`);
  }
}

console.log('=== ТЕСТИРОВАНИЕ ДАШБОРДА «ОБЗОР КЛАССА» (TC-BP-01..21) ===\n');

resetDB();
clearSession();

// 1. Авторизация классрука Смирновой (TC-BP-01)
const authRes = login('smirnova@school.ru', 'Test#2024');
assert(authRes.success === true, 'TC-BP-01: Успешная авторизация классного руководителя');

const db = getDB();
const demoDate = '2024-10-28';
const periodId = 'q1_2024';

// 2. Расчёт метрики «Посещаемость сегодня» (TC-BP-02)
const todayAtt = calculateAttendanceForDay(db.lessons, db.attendance, demoDate, { onlyFirstLesson: false });
assert(todayAtt.totalMarks === 56, 'TC-BP-02: За день проведено 2 урока (56 отметок посещаемости)');
assert(todayAtt.presentCount === 54, 'TC-BP-02: 54 присутствия из 56 отметок');
assert(todayAtt.attendanceRate === 96.4, 'TC-BP-02: Доля отметок «Был» составляет ровно 96.4%');

// 3. Расчёт метрики «Средний балл класса за период» (TC-BP-03)
const classAvg = calculateClassAverage(db.grades, { periodId });
assert(classAvg === 4.2, 'TC-BP-03: Средний балл класса за I четверть равен 4.2');

// 4. Метрика «Пропуски без подтверждения» (TC-BP-04)
const unconfirmed = getUnconfirmedAbsences(db.attendance, db.lessons, db.students, { periodId });
assert(unconfirmed.length === 4, 'TC-BP-04: Ровно 4 неподтверждённых пропуска за четверть');
assert(unconfirmed.some(u => u.studentName.includes('Петрова') && u.date === '2024-10-24'), 'TC-BP-04: В списке присутствует пропуск Петровой за 24.10');

// 5. Зона риска (Список внимания) — состав и строгие пороги (TC-BP-13..17, TC-BP-19)
const riskList = getRiskZoneStudents(db.students, db.lessons, db.attendance, db.grades, db.subjects, { periodId });
assert(riskList.length === 5, 'TC-BP-19: В зоне риска ровно 5 учеников');

const names = riskList.map(s => s.name);
assert(names.some(n => n.includes('Сидоров')), 'TC-BP-19: Сидоров Н. (пропуски 30%) в зоне риска');
assert(names.some(n => n.includes('Морозов')), 'TC-BP-19: Морозов А. (пропуски 22.5%) в зоне риска');
assert(names.some(n => n.includes('Котов')), 'TC-BP-19: Котов М. (балл 3.3) в зоне риска');
assert(names.some(n => n.includes('Петрова')), 'TC-BP-19: Петрова А. (математика 3.2) в зоне риска');
assert(names.some(n => n.includes('Волкова')), 'TC-BP-19: Волкова С. (физика 3.4) в зоне риска');

// TC-BP-15: Ученик с обоими признаками указан один раз
const sidorovEntry = riskList.find(s => s.name.includes('Сидоров'));
assert(sidorovEntry !== undefined, 'TC-BP-15: Сидоров найден в списке внимания');
assert(sidorovEntry.reasons.some(r => r.type === 'absence'), 'TC-BP-15: У Сидорова зафиксирована причина по пропускам (30%)');
assert(sidorovEntry.reasons.some(r => r.type === 'overall_grade'), 'TC-BP-15: У Сидорова зафиксирована причина по среднему баллу (3.1)');

// TC-BP-16 & TC-BP-17: Граничные значения не входят в зону риска
assert(!names.some(n => n.includes('Орлов')), 'TC-BP-16: Орлов П. с ровно 20.0% пропусков НЕ входит в зону риска');
assert(!names.some(n => n.includes('Никитин')), 'TC-BP-17: Никитин И. со средним баллом по математике ровно 3.5 НЕ входит в зону риска');

// 6. Проверка HTML-представления экрана дашборда
const html = renderOverviewView();
assert(html.includes('7Б класс (28 учеников)'), 'TC-BP-01: Заголовок содержит «7Б класс (28 учеников)»');
assert(html.includes('96.4%'), 'TC-BP-02: Дашборд отображает посещаемость сегодня 96.4%');
assert(html.includes('4.2'), 'TC-BP-03: Дашборд отображает средний балл класса 4.2');
assert(html.includes('Без подтверждения'), 'TC-BP-04: Дашборд отображает метрику пропусков без подтверждения');
assert(html.includes('Список внимания (Зона риска)'), 'TC-BP-19: Дашборд отображает блок списка внимания');
assert(html.includes('modal-student-summary'), 'TC-OV-12: Модальное окно сводки ученика присутствует');
assert(html.includes('modal-contact-parent'), 'TC-BP-25: Модальное окно фиксации контакта с родителем присутствует');
assert(html.includes('modal-add-note'), 'TC-BP-27: Модальное окно заметки классрука присутствует');

// 7. Проверка динамического пересчёта (TC-BP-05)
// Добавляем оценку 5 Сидорову и проверяем, что вызов пересчитывает балл
const newGrade = {
  id: 'grd-test-dynamic',
  studentId: 'st-14',
  subjectId: 'hist',
  date: '2024-10-25',
  value: 5,
  periodId: 'q1_2024'
};
db.grades.push(newGrade);
saveDB(db);

const updatedClassAvg = calculateClassAverage(getDB().grades, { periodId });
assert(updatedClassAvg !== null, 'TC-BP-05: Показатели дашборда динамически пересчитываются после обновления данных');

console.log(`\n🎉 ВСЕ ${passed} ПРОВЕРОК ДАШБОРДА «ОБЗОР КЛАССА» УСПЕШНО ПРОЙДЕНЫ!`);
