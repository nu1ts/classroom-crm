import { INITIAL_DATASET } from './dataset.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

const ds = INITIAL_DATASET;

// 1. Проверка учеников
assert(ds.students.length === 28, `Должно быть 28 учеников, получено ${ds.students.length}`);
const boys = ds.students.filter(s => s.gender === 'M');
const girls = ds.students.filter(s => s.gender === 'F');
assert(boys.length === 15, `Должно быть 15 мальчиков, получено ${boys.length}`);
assert(girls.length === 13, `Должно быть 13 девочек, получено ${girls.length}`);

// Поиск по "ов" (TC-OV-09: должно быть ровно 12 учеников)
const ovStudents = ds.students.filter(s => s.lastName.toLowerCase().includes('ов'));
assert(ovStudents.length === 12, `Поиск "ов" должен находить 12 учеников, найдено ${ovStudents.length}`);

// Поиск по "сидор" (TC-OV-03: ровно 1 ученик - Сидоров Никита)
const sidorStudents = ds.students.filter(s => s.lastName.toLowerCase().includes('сидор'));
assert(sidorStudents.length === 1 && sidorStudents[0].lastName === 'Сидоров', `Поиск "сидор" должен находить только Сидорова Н., найдено: ${sidorStudents.length}`);

// 2. Проверка родителей
assert(ds.parents.length === 32, `Должно быть 32 родителя, получено ${ds.parents.length}`);

// Ровно 1 родитель без связи (TC-PR-03: Орлова Н. П.)
const parentsWithoutLinks = ds.parents.filter(p => {
  return !ds.parentStudentRelations.some(rel => rel.parentId === p.id);
});
assert(parentsWithoutLinks.length === 1, `Должен быть ровно 1 родитель без связи, найдено ${parentsWithoutLinks.length}`);
assert(parentsWithoutLinks[0].lastName === 'Орлова', `Родитель без связи должен быть Орлова Н. П., получено ${parentsWithoutLinks[0].lastName}`);

// Поиск родителя "сидор" (TC-PR-02: ровно 1 родитель)
const sidorParents = ds.parents.filter(p => p.lastName.toLowerCase().includes('сидор'));
assert(sidorParents.length === 1 && sidorParents[0].lastName === 'Сидорова', `Поиск "сидор" среди родителей должен находить только Сидорову О. Н.`);

// Поиск родителя по телефону "123-45-62" (Котова Е. П.)
const phoneParents = ds.parents.filter(p => p.phone.includes('123-45-62'));
assert(phoneParents.length === 1 && phoneParents[0].lastName === 'Котова', `Поиск по телефону "123-45-62" должен находить Котову Е. П.`);

// У Петровой Анны 2 родителя, отец Петров С. В. - основной контакт
const petrovaRel = ds.parentStudentRelations.filter(rel => rel.studentId === 'st-23');
assert(petrovaRel.length === 2, `У Петровой А. должно быть 2 родителя`);
const petrovFatherRel = petrovaRel.find(r => r.relationRole === 'Отец');
assert(petrovFatherRel && petrovFatherRel.isPrimary === true, `Отец Петровой А. должен быть основным контактом`);
const petrovFather = ds.parents.find(p => p.id === petrovFatherRel.parentId);
assert(petrovFather.phone === '+7 999 123-45-63', `Телефон отца Петровой А. должен быть +7 999 123-45-63`);

// 3. Проверка предметов (subjects)
const talksSubject = ds.subjects.find(s => s.id === 'talks');
assert(talksSubject !== undefined, 'В справочнике subjects должен присутствовать предмет с id "talks"');
assert(talksSubject.name.includes('Разговоры о важном') || talksSubject.name.includes('Классный час'), 'Предмет talks должен называться "Разговоры о важном" / "Классный час"');

// 4. Проверка занятий (lessons)
assert(ds.lessons.length === 47, `Всего должно быть 47 занятий (40 в I четв + 7 в демо-день), получено ${ds.lessons.length}`);
const lsn41 = ds.lessons.find(l => l.id === 'lsn-41');
assert(lsn41 && lsn41.subjectId === 'talks', 'lsn-41 должен ссылаться на существующий предмет "talks"');

// Демо-день: 2 проведенных урока + 3 запланированных
const demoLessons = ds.lessons.filter(l => l.date === '2024-10-28');
assert(demoLessons.length === 5, `На демо-день 28.10 должно быть 5 уроков в расписании, получено ${demoLessons.length}`);
const demoConductedLessons = demoLessons.filter(l => l.status === 'closed' || l.isMarked);
assert(demoConductedLessons.length === 2, `На демо-день должно быть 2 проведённых урока, получено ${demoConductedLessons.length}`);

// 5. Проверка оценок и их согласованности с уроками и посещаемостью
assert(ds.grades.length === 303, `Всего должно быть 303 оценки, получено ${ds.grades.length}`);
const totalGradeSum = ds.grades.reduce((sum, g) => sum + g.value, 0);
assert(totalGradeSum === 1275, `Сумма оценок должна быть 1275, получено ${totalGradeSum}`);
const classAvg = (totalGradeSum / ds.grades.length).toFixed(1);
assert(classAvg === '4.2', `Средний балл класса должен быть 4.2, получено ${classAvg}`);

// Словарь уроков и посещаемости для быстрой проверки
const lessonMap = new Map(ds.lessons.map(l => [l.id, l]));
const attMap = new Map(ds.attendance.map(a => [`${a.lessonId}_${a.studentId}`, a]));

// Каждая оценка ДОЛЖНА иметь lessonId, совпадать по предмету/дате и не выставляться отсутствующему
for (const grade of ds.grades) {
  assert(grade.lessonId, `Оценка ${grade.id} должна иметь lessonId`);
  const lsn = lessonMap.get(grade.lessonId);
  assert(lsn !== undefined, `Урок ${grade.lessonId} для оценки ${grade.id} должен существовать`);
  assert(lsn.subjectId === grade.subjectId, `Предмет урока (${lsn.subjectId}) должен совпадать с предметом оценки (${grade.subjectId}) для ${grade.id}`);
  assert(lsn.date === grade.date, `Дата урока (${lsn.date}) должна совпадать с датой оценки (${grade.date}) для ${grade.id}`);

  const att = attMap.get(`${grade.lessonId}_${grade.studentId}`);
  assert(att !== undefined, `Отметка посещаемости для урока ${grade.lessonId} и ученика ${grade.studentId} должна существовать`);
  assert(att.value === 'present', `Оценка ${grade.id} не может выставляться отсутствующему ученику (TC-TCH-09)! Статус: ${att.value}`);
}

// Конкретный кейс: Сидоров 24.10 и 25.10 отсутствовал, оценок быть не должно
const sidorovAbsentLessons = ['lsn-39', 'lsn-40'];
for (const lid of sidorovAbsentLessons) {
  const sidorovGrade = ds.grades.find(g => g.studentId === 'st-14' && g.lessonId === lid);
  assert(sidorovGrade === undefined, `У Сидорова (st-14) не должно быть оценки за урок ${lid}, на котором он отсутствовал`);
}

// Неделя 8 (21-25.10): 20 оценок, сумма 83 -> 4.2
const w8Grades = ds.grades.filter(g => g.date >= '2024-10-21' && g.date <= '2024-10-25');
assert(w8Grades.length === 20, `На неделе 21-25.10 должно быть 20 оценок, получено ${w8Grades.length}`);
const w8Sum = w8Grades.reduce((sum, g) => sum + g.value, 0);
assert(w8Sum === 83, `Сумма оценок за неделю 21-25.10 должна быть 83, получено ${w8Sum}`);
assert((w8Sum / 20).toFixed(1) === '4.2', `Средний балл за неделю 21-25.10 должен округляться до 4.2`);

// Романов Илья (переведен 23.10, ровно 1 оценка — 5)
const romanovGrades = ds.grades.filter(g => g.studentId === 'st-13');
assert(romanovGrades.length === 1 && romanovGrades[0].value === 5, `Романов Илья должен иметь 1 оценку 5`);

// Васильева Дарья (за сентябрь 0 оценок)
const vasilyevaSept = ds.grades.filter(g => g.studentId === 'st-16' && g.date < '2024-10-01');
assert(vasilyevaSept.length === 0, `У Васильевой Д. за сентябрь должно быть 0 оценок`);

// Морозов Артём (средний балл 3.8)
const morozovGrades = ds.grades.filter(g => g.studentId === 'st-09');
assert(morozovGrades.length === 9, `У Морозова должно быть 9 оценок`);
const morozovAvg = (morozovGrades.reduce((sum, g) => sum + g.value, 0) / morozovGrades.length).toFixed(1);
assert(morozovAvg === '3.8', `Средний балл Морозова должен быть 3.8, получено ${morozovAvg}`);

// Петрова Анна (математика 3.2)
const petrovaMath = ds.grades.filter(g => g.studentId === 'st-23' && g.subjectId === 'math');
const petrovaMathAvg = (petrovaMath.reduce((sum, g) => sum + g.value, 0) / petrovaMath.length).toFixed(1);
assert(petrovaMathAvg === '3.2', `Средний балл Петровой по математике должен быть 3.2, получено ${petrovaMathAvg}`);

// Никитин Илья (математика ровно 3.5 — граница, НЕ зона риска)
const nikitinMath = ds.grades.filter(g => g.studentId === 'st-10' && g.subjectId === 'math');
const nikitinMathAvg = (nikitinMath.reduce((sum, g) => sum + g.value, 0) / nikitinMath.length).toFixed(1);
assert(nikitinMathAvg === '3.5', `Средний балл Никитина по математике должен быть 3.5, получено ${nikitinMathAvg}`);

// Волкова София (физика 3.4 — зона риска)
const volkovaPhys = ds.grades.filter(g => g.studentId === 'st-17' && g.subjectId === 'phys');
const volkovaPhysAvg = (volkovaPhys.reduce((sum, g) => sum + g.value, 0) / volkovaPhys.length).toFixed(1);
assert(volkovaPhysAvg === '3.4', `Средний балл Волковой по физике должен быть 3.4, получено ${volkovaPhysAvg}`);

// 6. Проверка посещаемости I четверти
const q1Attendance = ds.attendance.filter(a => a.date < '2024-10-28');
assert(q1Attendance.length === 1120, `Всего отметок посещаемости за I четверть должно быть 1120, получено ${q1Attendance.length}`);
const absences = q1Attendance.filter(a => a.value === 'absent');
assert(absences.length === 72, `Всего пропусков в I четверти должно быть 72, получено ${absences.length}`);
const absenceRate = (absences.length / q1Attendance.length * 100).toFixed(1);
assert(absenceRate === '6.4', `Процент пропусков должен быть 6.4%, получено ${absenceRate}%`);

// Неподтверждённых пропусков за I четверть на утро 28.10.2024 ровно 4
const q1Unconfirmed = q1Attendance.filter(a => a.status === 'unconfirmed');
assert(q1Unconfirmed.length === 4, `Неподтверждённых пропусков за I четверть должно быть ровно 4, получено ${q1Unconfirmed.length}`);
const totalUnconfirmed = ds.attendance.filter(a => a.status === 'unconfirmed');
assert(totalUnconfirmed.length === 6, `Суммарно с сегодняшними двумя отсутствующими на уроке 2 должно быть 6 неподтверждённых пропусков, получено ${totalUnconfirmed.length}`);

// Проверка пропусков по ключевым ученикам:
const sidorovAbs = absences.filter(a => a.studentId === 'st-14').length;
assert(sidorovAbs === 12, `У Сидорова должно быть 12 пропусков из 40 (30%), получено ${sidorovAbs}`);

const morozovAbs = absences.filter(a => a.studentId === 'st-09').length;
assert(morozovAbs === 9, `У Морозова должно быть 9 пропусков из 40 (22.5%), получено ${morozovAbs}`);

const orlovAbs = absences.filter(a => a.studentId === 'st-11').length;
assert(orlovAbs === 8, `У Орлова должно быть ровно 8 пропусков из 40 (20.0%), получено ${orlovAbs}`);

const petrovaAbs = absences.filter(a => a.studentId === 'st-23').length;
assert(petrovaAbs === 4, `У Петровой должно быть 4 пропуска из 40 (10%), получено ${petrovaAbs}`);

// 7. Проверка посещаемости демо-дня (28.10.2024) в общей модели attendance
const todayAttendanceInMain = ds.attendance.filter(a => a.date === '2024-10-28');
assert(todayAttendanceInMain.length === 56, `В общей модели посещаемости за 28.10 должно быть 56 записей (2 урока по 28 уч.), получено ${todayAttendanceInMain.length}`);

// Урок 1 (talks): 28 из 28 (100%)
const lesson1Att = ds.attendance.filter(a => a.lessonId === 'lsn-today-01');
assert(lesson1Att.length === 28, 'На 1-м уроке 28 отметок');
const lesson1Present = lesson1Att.filter(a => a.value === 'present').length;
assert(lesson1Present === 28, `На 1-м уроке должны присутствовать все 28 учеников (100%), присутствовало ${lesson1Present}`);
const lesson1Rate = (lesson1Present / 28 * 100).toFixed(1);
assert(lesson1Rate === '100.0', `Посещаемость 1-го урока 100.0%`);

// Урок 2 (math): 26 из 28 (92.9%, отсутствуют Сидоров и Котов)
const lesson2Att = ds.attendance.filter(a => a.lessonId === 'lsn-today-02');
assert(lesson2Att.length === 28, 'На 2-м уроке 28 отметок');
const lesson2Present = lesson2Att.filter(a => a.value === 'present').length;
assert(lesson2Present === 26, `На 2-м уроке должны присутствовать 26 учеников, присутствовало ${lesson2Present}`);
const lesson2Rate = (lesson2Present / 28 * 100).toFixed(1);
assert(lesson2Rate === '92.9', `Посещаемость 2-го урока 92.9%`);

// Итого за демо-день в общей модели: 54 из 56 = 96.4%
const todayTotalPresent = todayAttendanceInMain.filter(a => a.value === 'present').length;
assert(todayTotalPresent === 54, `Всего за 28.10 должно быть 54 присутствия из 56`);
const todayMainRate = (todayTotalPresent / todayAttendanceInMain.length * 100).toFixed(1);
assert(todayMainRate === '96.4', `Посещаемость за все проведенные уроки сегодня должна быть 96.4%, получено ${todayMainRate}%`);

// Проверка различия между расчётом по 1-му уроку и за весь день
assert(lesson1Rate !== todayMainRate, `Расчёт по первому уроку (${lesson1Rate}%) должен отличаться от расчёта за весь день (${todayMainRate}%)!`);

// 8. Проверка зоны риска (строго 5 учеников)
assert(ds.riskZone.length === 5, `В зоне риска должно быть ровно 5 учеников, получено ${ds.riskZone.length}`);
const riskNames = ds.riskZone.map(r => r.name);
assert(riskNames.some(n => n.includes('Сидоров')), 'Сидоров должен быть в зоне риска');
assert(riskNames.some(n => n.includes('Морозов')), 'Морозов должен быть в зоне риска');
assert(riskNames.some(n => n.includes('Петрова')), 'Петрова должна быть в зоне риска');
assert(riskNames.some(n => n.includes('Волкова')), 'Волкова должна быть в зоне риска');
assert(riskNames.some(n => n.includes('Котов')), 'Котов должен быть в зоне риска');
assert(!riskNames.some(n => n.includes('Орлов')), 'Орлов НЕ должен быть в зоне риска (ровно 20%)');
assert(!riskNames.some(n => n.includes('Никитин')), 'Никитин НЕ должен быть в зоне риска (ровно 3.5)');

console.log('✅ ВСЕ ПРОВЕРКИ ТЕСТ-КЕЙСОВ И СОГЛАСОВАННОСТИ ДАТАСЕТА 7Б ПРОЙДЕНЫ УСПЕШНО!');
