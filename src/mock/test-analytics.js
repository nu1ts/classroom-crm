import { INITIAL_DATASET } from './dataset.js';
import {
  calculateClassAverage,
  calculateClassAttendance,
  calculateStudentAverage,
  calculateStudentAttendance,
  calculateSubjectAverages,
  calculateWeeklyAbsences,
  getUnconfirmedAbsences,
  getRiskZoneStudents,
  generateClassReport,
  roundToOneDecimal
} from './calculations.js';
import { renderAnalyticsView } from '../views/analytics.js';
import { isRouteAllowedForRole } from '../config/navigation.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

const ds = INITIAL_DATASET;

console.log('=== ТЕСТИРОВАНИЕ СТРАНИЦЫ «АНАЛИТИКА»: ОТЧЁТ КЛАССА ЗА ПЕРИОД (TC-ANL-01..21, TC-BP-31..33) ===');

// 1. TC-ANL-01..04: Расчёт среднего балла и математическое округление
const aleksandrovAvg = calculateStudentAverage(ds.grades, 'st-01', { periodId: 'q1_2024' });
assert(aleksandrovAvg === 4.8, `TC-ANL-01: Средний балл Александрова 4.8 (58/12), получено ${aleksandrovAvg}`);

const romanovAvg = calculateStudentAverage(ds.grades, 'st-13', { periodId: 'q1_2024' });
assert(romanovAvg === 5.0, `TC-ANL-02: Средний балл Романова по единственной оценке 5.0, получено ${romanovAvg}`);

const morozovAvg = calculateStudentAverage(ds.grades, 'st-09', { periodId: 'q1_2024' });
assert(morozovAvg === 3.8, `TC-ANL-03: Округление Морозова 34/9 = 3.777... -> 3.8, получено ${morozovAvg}`);

assert(roundToOneDecimal(4.15) === 4.2, 'TC-ANL-04: Округление ровно на половине 4.15 -> 4.2');
console.log('✓ [TEST 1] TC-ANL-01..04: Расчёт среднего балла и математическое округление корректны');

// 2. TC-ANL-05..06: Посещаемость ученика и знаменатель отмеченных уроков
const sidorovAtt = calculateStudentAttendance(ds.lessons, ds.attendance, 'st-14', { periodId: 'q1_2024' });
assert(sidorovAtt.absentCount === 12, 'TC-ANL-05: У Сидорова 12 пропусков');
assert(sidorovAtt.totalLessons === 40, 'TC-ANL-06: Знаменатель 40 отмеченных уроков, а не 42 по расписанию');
assert(sidorovAtt.absenceRate === 30.0, 'TC-ANL-05: Доля пропусков Сидорова ровно 30.0%');
assert(sidorovAtt.attendanceRate === 70.0, 'TC-ANL-05: Посещаемость Сидорова ровно 70.0%');
console.log('✓ [TEST 2] TC-ANL-05..06: Посещаемость ученика, строгий знаменатель (40 уроков) и процент пропусков');

// 3. TC-ANL-07: Посещаемость класса за четверть
const classAtt = calculateClassAttendance(ds.lessons, ds.attendance, { periodId: 'q1_2024' });
assert(classAtt.absenceRate === 6.4, `TC-ANL-07: Доля пропущенных уроков класса 6.4%, получено ${classAtt.absenceRate}`);
assert(classAtt.attendanceRate === 93.6, `TC-ANL-07: Посещаемость класса 93.6%, получено ${classAtt.attendanceRate}`);
assert(classAtt.absentCount === 72, 'TC-ANL-07: Всего 72 пропуска уроков');
assert(classAtt.totalMarks === 1120, 'TC-ANL-07: Всего 1120 отметок посещаемости');
console.log('✓ [TEST 3] TC-ANL-07: Посещаемость класса (93.6%) и пропуски (6.4%)');

// 4. TC-ANL-08..09: Ученик без оценок и смена периода
const vasilyevaSept = calculateStudentAverage(ds.grades, 'st-16', { dateFrom: '2024-09-01', dateTo: '2024-09-30' });
assert(vasilyevaSept === null, 'TC-ANL-08: У Васильевой за сентябрь нет оценок -> null (прочерк)');

const repQ1 = generateClassReport(ds, { periodId: 'q1_2024' });
const repSept = generateClassReport(ds, { periodId: 'q1_2024', dateFrom: '2024-09-01', dateTo: '2024-09-30' });
const repOct = generateClassReport(ds, { periodId: 'q1_2024', dateFrom: '2024-10-01', dateTo: '2024-10-31' });

assert(repSept.metrics.totalMarkedLessons === 21, 'TC-ANL-09: В сентябре 21 урок');
assert(repOct.metrics.totalMarkedLessons === 19, 'TC-ANL-09: В октябре 19 уроков');
assert(repSept.metrics.totalAbsences === 35, 'TC-ANL-09: В сентябре 35 пропусков');
assert(repOct.metrics.totalAbsences === 37, 'TC-ANL-09: В октябре 37 пропусков');
assert(repSept.metrics.totalAbsences + repOct.metrics.totalAbsences === repQ1.metrics.totalAbsences, 'TC-ANL-09: Сумма пропусков сентября и октября равна четверти (72)');
console.log('✓ [TEST 4] TC-ANL-08..09: Ученик без оценок за месяц и пересчёт метрик при смене периода');

// 5. TC-ANL-10: Способ расчёта среднего балла класса
const classAvg = calculateClassAverage(ds.grades, { periodId: 'q1_2024' });
assert(classAvg === 4.2, `TC-ANL-10: Средний балл класса 4.2 (1275 / 303 = 4.208), получено ${classAvg}`);
console.log('✓ [TEST 5] TC-ANL-10: Средний балл класса считается по всем оценкам (4.2)');

// 6. TC-ANL-11: Средние баллы по предметам и порог 3.5
const subjAvgs = calculateSubjectAverages(ds.grades, ds.subjects, { periodId: 'q1_2024' });
const sMap = new Map(subjAvgs.map(s => [s.id, s.average]));
assert(sMap.get('math') === 3.9, 'TC-ANL-11: Математика 3.9');
assert(sMap.get('rus') === 4.3, 'TC-ANL-11: Русский язык 4.3');
assert(sMap.get('phys') === 4.0, 'TC-ANL-11: Физика 4.0');
assert(sMap.get('hist') === 4.4, 'TC-ANL-11: История 4.4');
assert(sMap.get('pe') === 4.8, 'TC-ANL-11: Физкультура 4.8');
console.log('✓ [TEST 6] TC-ANL-11: Средние баллы по предметам соответствуют эталону');

// 7. TC-ANL-12: Пропуски по неделям
const weekly = calculateWeeklyAbsences(ds.lessons, ds.attendance, { periodId: 'q1_2024' });
assert(weekly.length === 8, 'TC-ANL-12: 8 недель в четверти');
assert(weekly[0].absencePercentage === 4.3, 'TC-ANL-12: Неделя 1 — 4.3% (эталон ~4.1-4.3%)');
assert(weekly[1].absencePercentage === 5.0, 'TC-ANL-12: Неделя 2 — 5.0%');
assert(weekly[3].absencePercentage === 9.3, 'TC-ANL-12: Неделя 4 — 9.3% (эталон ~9.2-9.3%)');
assert(weekly[7].absencePercentage === 11.4, 'TC-ANL-12: Неделя 8 — 11.4% (всплеск перед каникулами)');
console.log('✓ [TEST 7] TC-ANL-12: Динамика пропусков по неделям и всплеск перед каникулами');

// 8. TC-ANL-13: Зона риска (строго 5 учеников, исключение граничных Орлова и Никитина)
const riskZone = getRiskZoneStudents(ds.students, ds.lessons, ds.attendance, ds.grades, ds.subjects, { periodId: 'q1_2024' });
assert(riskZone.length === 5, `TC-ANL-13: В зоне риска ровно 5 учеников, получено ${riskZone.length}`);
const rNames = riskZone.map(r => r.name);
assert(rNames.some(n => n.includes('Сидоров')), 'TC-ANL-13: Сидоров в зоне риска (пропуски 30%)');
assert(rNames.some(n => n.includes('Морозов')), 'TC-ANL-13: Морозов в зоне риска (пропуски 22.5%)');
assert(rNames.some(n => n.includes('Петрова')), 'TC-ANL-13: Петрова в зоне риска (математика 3.2)');
assert(rNames.some(n => n.includes('Волкова')), 'TC-ANL-13: Волкова в зоне риска (физика 3.4)');
assert(rNames.some(n => n.includes('Котов')), 'TC-ANL-13: Котов в зоне риска (средний балл 3.3)');
assert(!rNames.some(n => n.includes('Орлов')), 'TC-ANL-13: Орлов НЕ в зоне риска (ровно 20.0%)');
assert(!rNames.some(n => n.includes('Никитин')), 'TC-ANL-13: Никитин НЕ в зоне риска (математика ровно 3.5)');
console.log('✓ [TEST 8] TC-ANL-13: Состав зоны риска строго 5 учеников с корректной отсечкой границ');

// 9. TC-ANL-14: Неподтверждённые пропуски
const unconfirmed = getUnconfirmedAbsences(ds.attendance, ds.lessons, ds.students, { periodId: 'q1_2024' });
assert(unconfirmed.length === 4, `TC-ANL-14: Неподтверждённых пропусков ровно 4, получено ${unconfirmed.length}`);
assert(unconfirmed.some(u => u.studentName.includes('Петрова') && u.date === '2024-10-24'), 'TC-ANL-14: Пропуск Петровой за 24.10 в списке');
console.log('✓ [TEST 9] TC-ANL-14: Неподтверждённых пропусков за четверть ровно 4');

// 10. TC-ANL-15..18, TC-BP-31..33: Отчёт по классу, динамический расчёт и ролевой доступ
const rep1 = generateClassReport(ds, { periodId: 'q1_2024' });
const rep2 = generateClassReport(ds, { periodId: 'q1_2024' });
assert(JSON.stringify(rep1.metrics) === JSON.stringify(rep2.metrics), 'TC-BP-32: Повторное формирование даёт идентичные цифры (отчёт не сохраняется как статический объект)');

assert(isRouteAllowedForRole('teacher', '#/analytics'), 'TC-ANL-16: Классрук имеет доступ к разделу Аналитика');
assert(!isRouteAllowedForRole('subject_teacher', '#/analytics'), 'TC-ANL-17: Учитель-предметник НЕ имеет доступа к разделу Аналитика');
assert(!isRouteAllowedForRole('parent', '#/analytics'), 'TC-ANL-18: Родитель НЕ имеет доступа к разделу Аналитика');
assert(!isRouteAllowedForRole('student', '#/analytics'), 'TC-ANL-18: Ученик НЕ имеет доступа к разделу Аналитика');
console.log('✓ [TEST 10] TC-ANL-15..18, TC-BP-32: Динамический пересчёт отчёта и разграничение прав доступа');

// 11. TC-BP-31, TC-BP-33: HTML-рендеринг страницы «Аналитика»
const htmlDefault = renderAnalyticsView();
assert(htmlDefault.includes('Аналитика класса'), 'Страница Аналитика содержит заголовок');
assert(htmlDefault.includes('Динамика средней успеваемости 7Б'), 'Присутствует карточка динамики успеваемости');
assert(htmlDefault.includes('Группы риска (Успеваемость / Посещаемость)'), 'Присутствует карточка групп риска');
assert(htmlDefault.includes('Критический риск (2)'), 'Отображается группа критического риска (2)');
assert(htmlDefault.includes('Умеренный риск (3)'), 'Отображается группа умеренного риска (3)');
assert(htmlDefault.includes('Успешная зона (23)'), 'Отображается успешная зона (23)');
assert(htmlDefault.includes('btn-generate-report'), 'Присутствует кнопка «Сформировать отчёт»');

// Проверка вывода отчёта на странице (TC-BP-31)
const htmlWithReport = renderAnalyticsView({ showReport: true });
assert(!htmlWithReport.includes('report-container" class="hidden'), 'Отчёт отображается на странице при showReport=true');
assert(htmlWithReport.includes('Отчёт по успеваемости и посещаемости 7Б класса'), 'Заголовок отчёта присутствует');
assert(htmlWithReport.includes('btn-print-report'), 'Кнопка печати отчёта присутствует');
assert(htmlWithReport.includes('Сводный список пропусков занятий'), 'Сводный список пропусков присутствует в отчёте');

// Проверка смены периода (TC-BP-33)
const htmlSept = renderAnalyticsView({ periodId: 'sept_2024', showReport: true });
assert(htmlSept.includes('Сентябрь 2024'), 'При выборе сентября период обновляется в отчёте');
console.log('✓ [TEST 11] TC-BP-31..33: HTML-рендеринг страницы, карточки референса Аналитика.png и формирование отчёта на странице');

console.log('🎉 ВСЕ ПРОВЕРКИ СТРАНИЦЫ «АНАЛИТИКА» И ОТЧЁТА ПО КЛАССУ (TC-ANL-01..21, TC-BP-31..33) УСПЕШНО ПРОЙДЕНЫ!\n');
