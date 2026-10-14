import { INITIAL_DATASET } from './dataset.js';
import {
  roundToOneDecimal,
  calculateAttendanceForDay,
  calculateStudentAverage,
  calculateClassAverage,
  calculateSubjectAverages,
  calculateStudentAttendance,
  calculateClassAttendance,
  calculateWeeklyAbsences,
  getUnconfirmedAbsences,
  getRiskZoneStudents,
  generateClassReport,
  getSurveyReport,
  getMeetingAttendanceReport
} from './calculations.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

const ds = INITIAL_DATASET;

console.log('=== ТЕСТИРОВАНИЕ РАСЧЁТНЫХ ФУНКЦИЙ ПОКАЗАТЕЛЕЙ БП ===');

// 1. Проверка функции математического округления (TC-ANL-03, TC-ANL-04)
assert(roundToOneDecimal(4.15) === 4.2, '4.15 должно округляться вверх до 4.2');
assert(roundToOneDecimal(3.7777) === 3.8, '3.7777 должно округляться до 3.8');
assert(roundToOneDecimal(3.2) === 3.2, '3.2 должно оставаться 3.2');
assert(roundToOneDecimal(5.0) === 5.0, '5.0 должно оставаться 5.0');
assert(roundToOneDecimal(null) === null, 'null должен возвращать null');
console.log('✓ roundToOneDecimal: ОК');

// 2. Посещаемость за день (демо-день 28.10.2024: 1-й урок vs все проведенные уроки)
const dayFirstLesson = calculateAttendanceForDay(ds.lessons, ds.attendance, '2024-10-28', { onlyFirstLesson: true });
assert(dayFirstLesson.totalMarks === 28, `На 1-м уроке должно быть 28 отметок, получено ${dayFirstLesson.totalMarks}`);
assert(dayFirstLesson.presentCount === 28, `На 1-м уроке должны присутствовать все 28`);
assert(dayFirstLesson.attendanceRate === 100.0, `Посещаемость 1-го урока 100.0%, получено ${dayFirstLesson.attendanceRate}`);

const dayAllLessons = calculateAttendanceForDay(ds.lessons, ds.attendance, '2024-10-28', { onlyFirstLesson: false });
assert(dayAllLessons.totalMarks === 56, `За 2 проведенных урока должно быть 56 отметок, получено ${dayAllLessons.totalMarks}`);
assert(dayAllLessons.presentCount === 54, `Присутствовало 54 из 56`);
assert(dayAllLessons.absentCount === 2, `Отсутствовало 2 (Сидоров и Котов на 2-м уроке)`);
assert(dayAllLessons.attendanceRate === 96.4, `Посещаемость за день 96.4%, получено ${dayAllLessons.attendanceRate}`);
assert(dayFirstLesson.attendanceRate !== dayAllLessons.attendanceRate, 'Показатель по 1-му уроку (100%) отличается от показателя за день (96.4%)');
console.log('✓ calculateAttendanceForDay (1-й урок и весь день): ОК');

// 3. Средний балл ученика за период
// Романов Илья (1 оценка 5) -> 5.0 (TC-ANL-02)
const romanovAvg = calculateStudentAverage(ds.grades, 'st-13', { periodId: 'q1_2024' });
assert(romanovAvg === 5.0, `Средний балл Романова должен быть 5.0, получено ${romanovAvg}`);

// Васильева Дарья за сентябрь: оценок нет -> null (TC-ANL-08)
const vasilyevaSeptAvg = calculateStudentAverage(ds.grades, 'st-16', { dateTo: '2024-09-30' });
assert(vasilyevaSeptAvg === null, 'У Васильевой за сентябрь должно возвращаться null (нет данных)');

// Морозов Артём (34 / 9 = 3.777... -> 3.8, TC-ANL-03)
const morozovAvg = calculateStudentAverage(ds.grades, 'st-09', { periodId: 'q1_2024' });
assert(morozovAvg === 3.8, `Средний балл Морозова должен быть 3.8, получено ${morozovAvg}`);

// Петрова Анна по математике (16 / 5 = 3.2, TC-ANL-03)
const petrovaMathAvg = calculateStudentAverage(ds.grades, 'st-23', { periodId: 'q1_2024', subjectId: 'math' });
assert(petrovaMathAvg === 3.2, `Средний балл Петровой по математике должен быть 3.2, получено ${petrovaMathAvg}`);

// Никитин Илья по математике (14 / 4 = 3.5 — граница)
const nikitinMathAvg = calculateStudentAverage(ds.grades, 'st-10', { periodId: 'q1_2024', subjectId: 'math' });
assert(nikitinMathAvg === 3.5, `Средний балл Никитина по математике должен быть 3.5, получено ${nikitinMathAvg}`);

// Александров Егор (58 / 12 = 4.833... -> 4.8, TC-ANL-01)
const aleksandrovAvg = calculateStudentAverage(ds.grades, 'st-01', { periodId: 'q1_2024' });
assert(aleksandrovAvg === 4.8, `Средний балл Александрова должен быть 4.8, получено ${aleksandrovAvg}`);
console.log('✓ calculateStudentAverage (включая пустые и граничные кейсы): ОК');

// 4. Средний балл класса за период (TC-ANL-04, TC-ANL-10)
const classQ1Avg = calculateClassAverage(ds.grades, { periodId: 'q1_2024' });
assert(classQ1Avg === 4.2, `Средний балл класса за I четверть должен быть 4.2, получено ${classQ1Avg}`);

// Неделя 21-25.10: 20 оценок, сумма 83 -> 4.15 -> 4.2 (TC-ANL-04)
const classW8Avg = calculateClassAverage(ds.grades, { dateFrom: '2024-10-21', dateTo: '2024-10-25' });
assert(classW8Avg === 4.2, `Средний балл за неделю 21-25.10 должен быть 4.2 (из 4.15), получено ${classW8Avg}`);
console.log('✓ calculateClassAverage (по всем оценкам класса и округление половины вверх): ОК');

// 5. Средние баллы класса по предметам (TC-ANL-11)
const subjectAverages = calculateSubjectAverages(ds.grades, ds.subjects, { periodId: 'q1_2024' });
const subjMap = new Map(subjectAverages.map(s => [s.id, s.average]));
assert(subjMap.get('math') === 3.9, `Математика должна быть 3.9, получено ${subjMap.get('math')}`);
assert(subjMap.get('rus') === 4.3, `Русский язык должен быть 4.3, получено ${subjMap.get('rus')}`);
assert(subjMap.get('phys') === 4.0, `Физика должна быть 4.0, получено ${subjMap.get('phys')}`);
assert(subjMap.get('hist') === 4.4, `История должна быть 4.4, получено ${subjMap.get('hist')}`);
assert(subjMap.get('pe') === 4.8, `Физкультура должна быть 4.8, получено ${subjMap.get('pe')}`);
console.log('✓ calculateSubjectAverages: ОК');

// 6. Посещаемость ученика за период (TC-ANL-05, TC-ANL-06)
// Знаменатель: 40 отмеченных уроков (не 42 по расписанию)
const sidorovAtt = calculateStudentAttendance(ds.lessons, ds.attendance, 'st-14', { periodId: 'q1_2024' });
assert(sidorovAtt.totalLessons === 40, `Знаменатель должен быть 40 уроков, получено ${sidorovAtt.totalLessons}`);
assert(sidorovAtt.absentCount === 12, `У Сидорова 12 пропусков`);
assert(sidorovAtt.absenceRate === 30.0, `Процент пропусков Сидорова 30.0%, получено ${sidorovAtt.absenceRate}`);
assert(sidorovAtt.attendanceRate === 70.0, `Посещаемость Сидорова 70.0%, получено ${sidorovAtt.attendanceRate}`);

const morozovAtt = calculateStudentAttendance(ds.lessons, ds.attendance, 'st-09', { periodId: 'q1_2024' });
assert(morozovAtt.absentCount === 9 && morozovAtt.absenceRate === 22.5, 'Морозов: 9 из 40 = 22.5%');

const orlovAtt = calculateStudentAttendance(ds.lessons, ds.attendance, 'st-11', { periodId: 'q1_2024' });
assert(orlovAtt.absentCount === 8 && orlovAtt.absenceRate === 20.0, 'Орлов: ровно 8 из 40 = 20.0%');

const petrovaAtt = calculateStudentAttendance(ds.lessons, ds.attendance, 'st-23', { periodId: 'q1_2024' });
assert(petrovaAtt.absentCount === 4 && petrovaAtt.absenceRate === 10.0, 'Петрова: 4 из 40 = 10.0%');
console.log('✓ calculateStudentAttendance: ОК');

// 7. Посещаемость класса за период (TC-ANL-07)
const classAtt = calculateClassAttendance(ds.lessons, ds.attendance, { periodId: 'q1_2024' });
assert(classAtt.totalMarks === 1120, `Всего отметок за четверть 1120, получено ${classAtt.totalMarks}`);
assert(classAtt.absentCount === 72, `Всего пропусков 72, получено ${classAtt.absentCount}`);
assert(classAtt.absenceRate === 6.4, `Процент пропусков 6.4%, получено ${classAtt.absenceRate}`);
assert(classAtt.attendanceRate === 93.6, `Посещаемость класса 93.6%, получено ${classAtt.attendanceRate}`);
console.log('✓ calculateClassAttendance: ОК');

// 8. Динамика пропусков по неделям (TC-ANL-12)
const weekly = calculateWeeklyAbsences(ds.lessons, ds.attendance, { periodId: 'q1_2024' });
assert(weekly.length === 8, `Должно быть 8 недель четверти, получено ${weekly.length}`);
assert(weekly[0].absencePercentage === 4.3, `Неделя 1: 4.3%, получено ${weekly[0].absencePercentage}`);
assert(weekly[1].absencePercentage === 5.0, `Неделя 2: 5.0%, получено ${weekly[1].absencePercentage}`);
assert(weekly[3].absencePercentage === 9.3, `Неделя 4: 9.3%, получено ${weekly[3].absencePercentage}`);
assert(weekly[7].absencePercentage === 11.4, `Неделя 8 (всплеск перед каникулами): 11.4%, получено ${weekly[7].absencePercentage}`);
assert(weekly[7].absencePercentage > weekly[0].absencePercentage, 'Доля пропусков растёт к концу четверти (всплеск перед каникулами)');
console.log('✓ calculateWeeklyAbsences (динамика роста и всплеск перед каникулами): ОК');

// 9. Неподтверждённые пропуски (TC-ANL-14)
const q1Unconfirmed = getUnconfirmedAbsences(ds.attendance, ds.lessons, ds.students, { periodId: 'q1_2024' });
assert(q1Unconfirmed.length === 4, `Неподтверждённых пропусков за I четверть должно быть ровно 4, получено ${q1Unconfirmed.length}`);
assert(q1Unconfirmed.some(u => u.studentName.includes('Петрова') && u.date === '2024-10-24'), 'Пропуск Петровой за 24.10 должен быть в списке');
assert(q1Unconfirmed.some(u => u.studentName.includes('Сидоров') && u.lessonId === 'lsn-37'), 'Пропуск Сидорова за lsn-37 должен быть в списке');
console.log('✓ getUnconfirmedAbsences: ОК');

// 10. Зона риска (строго 5 учеников, TC-ANL-13, лист «Тестовые данные»)
const riskZone = getRiskZoneStudents(ds.students, ds.lessons, ds.attendance, ds.grades, ds.subjects, { periodId: 'q1_2024' });
assert(riskZone.length === 5, `В зоне риска должно быть строго 5 учеников, получено ${riskZone.length}`);

const riskStudentNames = riskZone.map(r => r.name);
assert(riskStudentNames.some(n => n.includes('Сидоров')), 'Сидоров в зоне риска (пропуски 30%)');
assert(riskStudentNames.some(n => n.includes('Морозов')), 'Морозов в зоне риска (пропуски 22.5%)');
assert(riskStudentNames.some(n => n.includes('Петрова')), 'Петрова в зоне риска (математика 3.2)');
assert(riskStudentNames.some(n => n.includes('Волкова')), 'Волкова в зоне риска (физика 3.4)');
assert(riskStudentNames.some(n => n.includes('Котов')), 'Котов в зоне риска (средний балл 3.3)');

// Граничные проверки:
assert(!riskStudentNames.some(n => n.includes('Орлов')), 'Орлов НЕ должен быть в зоне риска (ровно 20% пропусков)');
assert(!riskStudentNames.some(n => n.includes('Никитин')), 'Никитин НЕ должен быть в зоне риска (математика ровно 3.5)');

// Проверка уровней риска:
const criticals = riskZone.filter(r => r.riskLevel === 'critical').map(r => r.name);
assert(criticals.some(n => n.includes('Сидоров')) && criticals.some(n => n.includes('Котов')), 'Критический риск: Сидоров и Котов');
console.log('✓ getRiskZoneStudents (строгие пороги, исключение границ Орлова и Никитина): ОК');

// 11. Комплексный отчёт по классу за период (TC-BP-31, TC-ANL-15)
const report = generateClassReport(ds, { periodId: 'q1_2024' });
assert(report.metrics.classAverageGrade === 4.2, 'Отчёт: средний балл 4.2');
assert(report.metrics.attendanceRate === 93.6, 'Отчёт: посещаемость 93.6%');
assert(report.metrics.absenceRate === 6.4, 'Отчёт: пропуски 6.4%');
assert(report.metrics.riskZoneCount === 5, 'Отчёт: 5 учеников в зоне риска');
assert(report.metrics.unconfirmedAbsencesCount === 4, 'Отчёт: 4 неподтверждённых пропуска');
console.log('✓ generateClassReport: ОК');

// 12. Отчёт по опросу родителей (макет Объявления.png, сбор согласий на экскурсию)
const surveyReport = getSurveyReport('srv-01', ds);
assert(surveyReport !== null, 'Отчёт по опросу srv-01 должен формироваться');
assert(surveyReport.totalTarget === 28, `Опрошено 28 родителей, получено ${surveyReport.totalTarget}`);
assert(surveyReport.totalResponded === 25, `Ответили 25 родителей из 28, получено ${surveyReport.totalResponded}`);
assert(surveyReport.responseRate === 89.3, `Процент ответов 89.3%, получено ${surveyReport.responseRate}%`);
const yesOpt = surveyReport.distribution.find(d => d.optionId === 'opt-yes');
assert(yesOpt && yesOpt.count === 22, `Согласились 22 родителя`);
console.log('✓ getSurveyReport: ОК');

// 13. Отчёт по явке родителей на собрание (TC-MG-07, макет Собрания.png: 23 ответа из 28)
const meetingReport = getMeetingAttendanceReport('mtg-01', ds);
assert(meetingReport !== null, 'Отчёт по собранию mtg-01 должен формироваться');
assert(meetingReport.totalInvited === 28, 'Приглашено 28 родителей');
assert(meetingReport.totalResponded === 23, `Ответили 23 из 28, получено ${meetingReport.totalResponded}`);
assert(meetingReport.responseRate === 82.1, `Процент ответивших 82.1%, получено ${meetingReport.responseRate}`);
assert(meetingReport.stats.presentCount === 19, 'Придут 19 родителей');
assert(meetingReport.stats.absentCount === 4, 'Не придут 4 родителя');
assert(meetingReport.stats.noAnswerCount === 5, 'Не ответили 5 родителей');
console.log('✓ getMeetingAttendanceReport: ОК');

console.log('🎉 ВСЕ ПРОВЕРКИ РАСЧЁТНЫХ ФУНКЦИЙ ПОКАЗАТЕЛЕЙ БП ПРОЙДЕНЫ УСПЕШНО!');
