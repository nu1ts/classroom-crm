import { ROLE_NAVIGATION, isRouteAllowedForRole, getDefaultRouteForRole } from '../config/navigation.js';
import { INITIAL_DATASET } from './dataset.js';

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

console.log('=== ТЕСТИРОВАНИЕ РОЛЕВОЙ МОДЕЛИ И НАВИГАЦИИ КАРКАСА ===\n');

// 1. TC-RM-01: Навигация администратора
{
  const adminNav = ROLE_NAVIGATION.admin;
  assert(adminNav !== undefined, 'Конфигурация навигации для роли admin существует');
  assert(adminNav.items.length === 5, 'У администратора ровно 5 пунктов меню');
  const expectedAdminTitles = ['Учётные записи', 'Учителя', 'Справочники', 'Нагрузка', 'Учебный год'];
  const actualTitles = adminNav.items.map(i => i.title);
  assert(JSON.stringify(actualTitles) === JSON.stringify(expectedAdminTitles), 'Пункты меню администратора строго соответствуют TC-RM-01');
  assert(adminNav.defaultRoute === '#/accounts', 'Стартовый раздел администратора — #/accounts');
  // Проверка отсутствия разделов класса
  assert(!isRouteAllowedForRole('admin', '#/journal'), 'Администратор не имеет доступа к журналу класса (#/journal)');
  assert(!isRouteAllowedForRole('admin', '#/overview'), 'Администратор не имеет доступа к обзору класса (#/overview)');
  assert(!isRouteAllowedForRole('admin', '#/meetings'), 'Администратор не имеет доступа к собраниям (#/meetings)');
}

// 2. TC-RM-02: Навигация классного руководителя
{
  const teacherNav = ROLE_NAVIGATION.teacher;
  assert(teacherNav !== undefined, 'Конфигурация навигации для роли teacher существует');
  assert(teacherNav.items.length === 9, 'У классного руководителя ровно 9 пунктов меню');
  const expectedTeacherTitles = [
    'Обзор класса', 'Ученики', 'Журнал', 'Посещаемость', 'Расписание',
    'Родители', 'Собрания', 'Объявления', 'Аналитика'
  ];
  const actualTitles = teacherNav.items.map(i => i.title);
  assert(JSON.stringify(actualTitles) === JSON.stringify(expectedTeacherTitles), 'Пункты меню классрука строго соответствуют TC-RM-02');
  assert(teacherNav.defaultRoute === '#/overview', 'Стартовый раздел классрука — #/overview');
  // Проверка отсутствия разделов администратора
  assert(!isRouteAllowedForRole('teacher', '#/accounts'), 'Классрук не имеет доступа к учётным записям (#/accounts)');
  assert(!isRouteAllowedForRole('teacher', '#/directories'), 'Классрук не имеет доступа к справочникам (#/directories)');
  assert(!isRouteAllowedForRole('teacher', '#/workload'), 'Классрук не имеет доступа к нагрузке (#/workload)');
}

// 3. TC-RM-03: Навигация учителя-предметника
{
  const subjNav = ROLE_NAVIGATION.subject_teacher;
  assert(subjNav !== undefined, 'Конфигурация навигации для роли subject_teacher существует');
  assert(subjNav.items.length === 4, 'У учителя-предметника ровно 4 пункта меню');
  const expectedSubjTitles = ['Мои классы', 'Расписание', 'Посещаемость', 'Профиль'];
  const actualTitles = subjNav.items.map(i => i.title);
  assert(JSON.stringify(actualTitles) === JSON.stringify(expectedSubjTitles), 'Пункты меню предметника строго соответствуют TC-RM-03');
  assert(subjNav.defaultRoute === '#/classes', 'Стартовый раздел предметника — #/classes');
  // Проверка отсутствия классных разделов
  assert(!isRouteAllowedForRole('subject_teacher', '#/parents'), 'Предметник не имеет доступа к разделу Родители');
  assert(!isRouteAllowedForRole('subject_teacher', '#/meetings'), 'Предметник не имеет доступа к разделу Собрания');
  assert(!isRouteAllowedForRole('subject_teacher', '#/analytics'), 'Предметник не имеет доступа к разделу Аналитика');
}

// 4. TC-RM-04: Навигация родителя
{
  const parentNav = ROLE_NAVIGATION.parent;
  assert(parentNav !== undefined, 'Конфигурация навигации для роли parent существует');
  assert(parentNav.items.length === 4, 'У родителя ровно 4 пункта меню');
  const expectedParentTitles = ['Ребёнок', 'Расписание', 'Объявления', 'Профиль'];
  const actualTitles = parentNav.items.map(i => i.title);
  assert(JSON.stringify(actualTitles) === JSON.stringify(expectedParentTitles), 'Пункты меню родителя строго соответствуют TC-RM-04');
  assert(parentNav.defaultRoute === '#/child', 'Стартовый раздел родителя — #/child');
  // Защита данных
  assert(!isRouteAllowedForRole('parent', '#/journal'), 'Родитель не имеет прямого доступа к общему журналу класса');
  assert(!isRouteAllowedForRole('parent', '#/parents'), 'Родитель не имеет доступа к базе контактов родителей');
}

// 5. TC-RM-05: Навигация ученика
{
  const studentNav = ROLE_NAVIGATION.student;
  assert(studentNav !== undefined, 'Конфигурация навигации для роли student существует');
  assert(studentNav.items.length === 4, 'У ученика ровно 4 пункта меню');
  assert(studentNav.isReadOnly === true, 'У роли ученика установлен флаг isReadOnly: true');
  const expectedStudentTitles = ['Расписание', 'Оценки', 'Объявления', 'Профиль'];
  const actualTitles = studentNav.items.map(i => i.title);
  assert(JSON.stringify(actualTitles) === JSON.stringify(expectedStudentTitles), 'Пункты меню ученика строго соответствуют TC-RM-05');
  assert(studentNav.defaultRoute === '#/schedule', 'Стартовый раздел ученика — #/schedule');
}

// 6. Проверка соответствия пользователей стенда
{
  const users = INITIAL_DATASET.users;
  const smirnova = users.find(u => u.username === 'smirnova@school.ru');
  const kozlov = users.find(u => u.username === 'kozlov@school.ru');
  const admin = users.find(u => u.username === 'admin@school.ru');
  const petrov = users.find(u => u.username === 'petrov@mail.ru');
  const petrova = users.find(u => u.username === 'petrova.a@school.ru');
  const osipov = users.find(u => u.username === 'osipov.k@school.ru');

  assert(smirnova && smirnova.role === 'teacher' && smirnova.password === 'Test#2024', 'УЗ классрука Смирновой настроена');
  assert(kozlov && kozlov.role === 'subject_teacher' && kozlov.password === 'Test#2024', 'УЗ предметника Козлова настроена');
  assert(admin && admin.role === 'admin' && admin.password === 'Test#2024', 'УЗ администратора Никитина настроена');
  assert(petrov && petrov.role === 'parent' && petrov.password === 'Test#2024', 'УЗ родителя Петрова настроена');
  assert(petrova && petrova.role === 'student' && petrova.password === 'Test#2024', 'УЗ ученицы Петровой настроена');
  assert(osipov && osipov.role === 'student' && osipov.password === 'Osipov#2024', 'Тестовая УЗ ученика Осипова настроена');
}

console.log(`\n🎉 ВСЕ ${passed} ПРОВЕРОК РОЛЕВОЙ НАВИГАЦИИ И КАРКАСА УСПЕШНО ПРОЙДЕНЫ!`);
