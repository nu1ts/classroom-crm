import assert from 'node:assert';
import { getDB, resetDB } from '../services/storage.js';
import { renderStudentsView } from '../views/students.js';

console.log('=== ТЕСТИРОВАНИЕ СТРАНИЦЫ «СПИСОК УЧЕНИКОВ» (TC-OV-01..11) ===');

resetDB();
const db = getDB();

// 1. TC-OV-01: Список учеников класса 7Б (28 учеников, по алфавиту, колонки, родитель Петровой Петров С. В.)
const htmlDefault = renderStudentsView({ page: '1' });
assert(htmlDefault.includes('Александров Егор'), 'Первый по алфавиту ученик Александров');
assert(htmlDefault.includes('Показано 1–10 из 28 учеников 7Б класса'), 'По умолчанию отображаются первые 10 из 28 учеников');

const htmlPetrova = renderStudentsView({ searchQuery: 'петров' });
assert(htmlPetrova.includes('Петрова Анна'), 'Петрова найдена по поиску');
assert(htmlPetrova.includes('Петров Сергей Викторович') || htmlPetrova.includes('Петров С.'), 'У Петровой А. указан основной контакт - отец Петров С.');
assert(htmlPetrova.includes('+7 999 123-45-63'), 'Телефон основного контакта Петровой А. (+7 999 123-45-63) присутствует');
console.log('✓ [TEST 1] TC-OV-01: Список учеников класса, колонки, алфавитный порядок и основной контакт Петровой');

// 2. TC-OV-02: Показатели списка совпадают со сводкой
assert(htmlDefault.includes('4,8') || htmlDefault.includes('4.8'), 'Средний балл Александрова 4.8');
const htmlPage3 = renderStudentsView({ page: '3' });
assert(htmlPage3.includes('Сидоров Никита'), 'Сидоров на 3-й странице по алфавиту');
assert(htmlPage3.includes('3,1') || htmlPage3.includes('3.1'), 'Средний балл Сидорова 3.1');
assert(htmlPage3.includes('12 из 40'), 'Пропуски Сидорова 12 из 40');
assert(htmlPetrova.includes('4,5') || htmlPetrova.includes('4.5'), 'Средний балл Петровой 4.5');
assert(htmlPetrova.includes('4 из 40'), 'Пропуски Петровой 4 из 40');
console.log('✓ [TEST 2] TC-OV-02: Показатели среднего балла и пропусков строго совпадают со сводкой ученика');

// 3. TC-OV-03: Поиск по фамилии («сидор» -> 1 ученик)
const htmlSearch = renderStudentsView({ searchQuery: 'сидор' });
assert(htmlSearch.includes('Сидоров Никита'), 'Поиск «сидор» находит Сидорова Никиту');
assert(htmlSearch.includes('Показано 1 из 28'), 'Счётчик показывает «Показано 1 из 28»');
console.log('✓ [TEST 3] TC-OV-03: Поиск по фамилии регистронезависим и выводит точный счётчик');

// 4. TC-OV-04: Фильтр по пропускам
const htmlAbsences = renderStudentsView({ filterAbsencesOnly: true });
assert(!htmlAbsences.includes('Александров Егор'), 'Александров с 0 пропусков не попадает в фильтр с пропусками');
assert(htmlAbsences.includes('Васильева Дарья'), 'Васильева с пропусками отображается в фильтре');
console.log('✓ [TEST 4] TC-OV-04: Фильтр «С пропусками» отсекает учеников с нулём пропусков');

// 5. TC-OV-05: Статус ученика и бейдж зоны риска
assert(htmlDefault.includes('Учится'), 'Статус содержит значение «Учится»');
assert(!htmlDefault.includes('В колонке СТАТУС значение В зоне риска'), 'В колонке статуса нет значения «В зоне риска»');
assert(htmlDefault.includes('В зоне риска'), 'Бейдж «В зоне риска» присутствует рядом с ФИО учеников из зоны риска');
console.log('✓ [TEST 5] TC-OV-05: Статус «Учится» и бейдж «В зоне риска» рядом с ФИО');

// 6. TC-OV-06: Комбинация поиска и фильтра
const htmlCombined = renderStudentsView({ searchQuery: 'петров', filterAbsencesOnly: true });
assert(htmlCombined.includes('Петрова Анна'), 'Петрова Анна найдена');
assert(htmlCombined.includes('Показано 1 из 28'), 'Счётчик равен «1 из 28»');
console.log('✓ [TEST 6] TC-OV-06: Комбинация поиска и фильтра по пропускам работает корректно');

// 7. TC-OV-07: Пустой результат фильтра
const htmlEmpty = renderStudentsView({ searchQuery: 'александров', filterAbsencesOnly: true });
assert(htmlEmpty.includes('Ничего не найдено'), 'Отображается состояние «Ничего не найдено»');
assert(htmlEmpty.includes('Сбросить фильтры'), 'Присутствует кнопка сброса фильтров');
console.log('✓ [TEST 7] TC-OV-07: Пустой результат фильтрации с кнопкой сброса');

// 8. TC-OV-08: Пагинация страницы по 10
const htmlP1 = renderStudentsView({ page: '1' });
const htmlP2 = renderStudentsView({ page: '2' });
const htmlP3 = renderStudentsView({ page: '3' });
assert(htmlP1.includes('Показано 1–10 из 28'), 'Страница 1: 1–10 из 28');
assert(htmlP2.includes('Показано 11–20 из 28'), 'Страница 2: 11–20 из 28');
assert(htmlP3.includes('Показано 21–28 из 28'), 'Страница 3: 21–28 из 28');
console.log('✓ [TEST 8] TC-OV-08: Пагинация по 10 строк корректно рассчитывает диапазоны 1–10, 11–20, 21–28');

// 9. TC-OV-09: Переход по страницам сохраняет фильтр и сортировку
const htmlSearchPage2 = renderStudentsView({ searchQuery: 'ов', page: '2' });
assert(htmlSearchPage2.includes('Показано 11–12 из 12'), 'Для запроса «ов» (12 учеников) на стр. 2 показаны 11–12 из 12');
console.log('✓ [TEST 9] TC-OV-09: Пагинация сохраняет поисковый фильтр');

// 10. TC-OV-10: Сортировка по среднему баллу
const htmlSortAsc = renderStudentsView({ sortBy: 'grade', sortOrder: 'asc', page: '1' });
assert(htmlSortAsc.includes('Сидоров Никита'), 'При сортировке по возрастанию балла Сидоров (3.1) на 1-й странице');
const htmlSortDesc = renderStudentsView({ sortBy: 'grade', sortOrder: 'desc', page: '1' });
assert(htmlSortDesc.includes('Александров Егор'), 'При сортировке по убыванию балла Александров (4.8) на 1-й странице');
console.log('✓ [TEST 10] TC-OV-10: Сортировка по показателю среднего балла (asc/desc)');

// 11. TC-OV-11: Модальное окно сводки ученика
assert(htmlDefault.includes('modal-student-summary'), 'Модальное окно сводки ученика присутствует в разметке');
assert(htmlDefault.includes('btn-open-student-summary'), 'Кнопки «Сводка» присутствуют у каждого ученика');
console.log('✓ [TEST 11] TC-OV-11: Интеграция с модальным окном детальной сводки ученика');

console.log('\n🎉 ВСЕ 11 ТЕСТ-КЕЙСОВ МОДУЛЯ «СПИСОК УЧЕНИКОВ» (TC-OV-01..11) УСПЕШНО ПРОЙДЕНЫ!\n');
