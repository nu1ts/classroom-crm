// ВНЕ ТАБЛИЦЫ ТЕСТ-КЕЙСОВ — внести в таблицу вручную.
// Кейсы TC-DIR покрывают UC «Сервис управления справочниками»
import { test, expect } from '../fixtures/base-test.js';
import { LoginPage } from '../page-objects/LoginPage.js';

async function openDirectoriesAsAdmin(page, query = '') {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs('admin');
  await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });
  await page.goto(`directories/${query}`);
  await expect(page.locator('h1')).toContainText('Справочники');
}

test.describe('Админ: страница «Справочники»', () => {
  test('[TC-DIR-01] Навигация: администратор переходит в «Справочники» через меню', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs('admin');
    await page.waitForURL(/\/accounts\/?/, { timeout: 7000 });

    const menuLink = page.locator('#nav-directories');
    await expect(menuLink).toBeVisible();
    await menuLink.click();

    await page.waitForURL(/\/directories\/?/, { timeout: 7000 });
    await expect(page.locator('h1')).toContainText('Справочники');
    await expect(page.locator('#directories-view')).toBeVisible();
    await expect(page.locator('[data-action="switch-tab"]')).toHaveCount(3);
    await expect(page.locator('[data-tab-panel="subjects"]')).toBeVisible();
  });

  test('[TC-DIR-02] Предметы: отображается справочник с статусами и признаком использования', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    const rows = page.locator('[data-tab-panel="subjects"] tbody tr');
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toContainText('Математика (Алгебра)');
    await expect(rows.first()).toContainText('Математика');
    await expect(rows.first()).toContainText('Есть связанные данные');
    await expect(rows.first()).toContainText('Активна');
    await expect(page.locator('#directories-total-subtitle')).toContainText(
      '15 записей',
    );
  });

  test('[TC-DIR-03] Добавление предмета: новая запись появляется в справочнике', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    await page.click('#btn-open-create-entry');
    await expect(page.locator('#directory-modal-title')).toContainText(
      'Добавить предмет',
    );

    await page.fill('#input-directory-name', 'Информатика');
    await page.fill('#input-directory-short-name', 'Информатика');
    await page.click('#btn-save-directory-entry');

    await expect(page.locator('#directories-toast-message')).toContainText(
      'Информатика',
    );
    const rows = page.locator('[data-tab-panel="subjects"] tbody tr');
    await expect(rows).toHaveCount(7);
    await expect(rows.last()).toContainText('Информатика');
  });

  test('[TC-DIR-04] Дубликат предмета: сохранение отклоняется с сообщением', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    await page.click('#btn-open-create-entry');
    await page.fill('#input-directory-name', 'Физика');
    await page.click('#btn-save-directory-entry');

    await expect(page.locator('#directory-modal-error')).toBeVisible();
    await expect(page.locator('#directory-modal-error')).toContainText(
      'уже есть',
    );
  });

  test('[TC-DIR-05] Переименование предмета: новое название применяется в справочнике', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    const row = page.locator('tr[data-row-id="phys"]');
    await row.locator('[data-action="edit-entry"]').click();
    await expect(page.locator('#directory-modal-title')).toContainText(
      'Изменить предмет',
    );
    await expect(page.locator('#input-directory-name')).toHaveValue('Физика');

    await page.fill('#input-directory-name', 'Физика и астрономия');
    await page.click('#btn-save-directory-entry');

    await expect(page.locator('#directories-toast-message')).toContainText(
      'обновлена',
    );
    await expect(page.locator('tr[data-row-id="phys"]')).toContainText(
      'Физика и астрономия',
    );
  });

  test('[TC-DIR-06] Деактивация предмета: статус меняется, занятия и оценки сохраняются', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    const before = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('classroom_crm_db'));
      return {
        lessons: db.lessons.filter((l) => l.subjectId === 'phys').length,
        grades: db.grades.filter((g) => {
          const lesson = db.lessons.find((l) => l.id === g.lessonId);
          return lesson && lesson.subjectId === 'phys';
        }).length,
      };
    });
    expect(before.lessons).toBeGreaterThan(0);
    expect(before.grades).toBeGreaterThan(0);

    const row = page.locator('tr[data-row-id="phys"]');
    await row.locator('[data-action="toggle-entry"]').click();

    await expect(page.locator('#directories-toast-message')).toContainText(
      'деактивирована',
    );
    await expect(row).toContainText('Деактивирована');

    const after = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('classroom_crm_db'));
      return {
        lessons: db.lessons.filter((l) => l.subjectId === 'phys').length,
        grades: db.grades.filter((g) => {
          const lesson = db.lessons.find((l) => l.id === g.lessonId);
          return lesson && lesson.subjectId === 'phys';
        }).length,
      };
    });
    expect(after.lessons).toBe(before.lessons);
    expect(after.grades).toBe(before.grades);

    // Возврат записи
    await row.locator('[data-action="toggle-entry"]').click();
    await expect(page.locator('#directories-toast-message')).toContainText(
      'снова активна',
    );
    await expect(row).toContainText('Активна');
  });

  test('[TC-DIR-07] Аудитории: вкладка, добавление и сохранность занятий', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page, '?tab=rooms');

    const rows = page.locator('[data-tab-panel="rooms"] tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(page.locator('[data-tab-panel="rooms"]')).toContainText(
      'Каб. 401',
    );

    await page.click('#btn-open-create-entry');
    await expect(page.locator('#directory-modal-title')).toContainText(
      'Добавить аудиторию',
    );
    await page.fill('#input-directory-name', 'Каб. 105');
    await page.click('#btn-save-directory-entry');

    await expect(page.locator('#directories-toast-message')).toContainText(
      'Каб. 105',
    );
    await expect(rows).toHaveCount(5);

    const roomInLessons = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('classroom_crm_db'));
      return db.lessons.filter((l) => l.room === 'Каб. 401').length;
    });
    expect(roomInLessons).toBeGreaterThan(0);
  });

  test('[TC-DIR-08] Классы: отображение справочника и поиск по названию', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page, '?tab=classes');

    const rows = page.locator('[data-tab-panel="classes"] tbody tr');
    await expect(rows).toHaveCount(5);

    await page.fill('#input-directories-search', '7Б');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('7Б');

    await page.fill('#input-directories-search', 'несуществующий');
    await expect(page.locator('[data-tab-panel="classes"]')).toContainText(
      'Записи не найдены',
    );
  });

  test('[TC-DIR-09] Деактивация класса не удаляет учеников и оценки класса', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page, '?tab=classes');

    const before = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('classroom_crm_db'));
      const studentIds = new Set(
        db.students.filter((s) => s.classId === 'class-7b').map((s) => s.id),
      );
      return {
        students: studentIds.size,
        grades: db.grades.filter((g) => studentIds.has(g.studentId)).length,
      };
    });
    expect(before.students).toBeGreaterThan(0);

    const row = page.locator('tr[data-row-id="class-7b"]');
    await row.locator('[data-action="toggle-entry"]').click();

    await expect(page.locator('#directories-toast-message')).toContainText(
      'деактивирована',
    );
    await expect(row).toContainText('Деактивирована');

    const after = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('classroom_crm_db'));
      const studentIds = new Set(
        db.students.filter((s) => s.classId === 'class-7b').map((s) => s.id),
      );
      return {
        students: studentIds.size,
        grades: db.grades.filter((g) => studentIds.has(g.studentId)).length,
      };
    });
    expect(after.students).toBe(before.students);
    expect(after.grades).toBe(before.grades);

    await row.locator('[data-action="toggle-entry"]').click();
    await expect(row).toContainText('Активна');
  });

  test('[TC-DIR-10] Ссылка «Учебные годы и четверти» ведёт на страницу «Учебный год»', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    const link = page.locator('#directories-view a[href="/school-year"]');
    await expect(link).toBeVisible();
    await link.click();

    await page.waitForURL(/\/school-year\/?/, { timeout: 7000 });
    await expect(page.locator('h1')).toContainText('Учебный год');
  });

  test('[TC-DIR-11] Деактивированный предмет недоступен для назначения в карточке учителя и в нагрузке', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    await page.click('#btn-open-create-entry');
    await page.fill('#input-directory-name', 'Химия');
    await page.fill('#input-directory-short-name', 'Химия');
    await page.click('#btn-save-directory-entry');
    const row = page.locator('tr[data-row-id]').filter({ hasText: 'Химия' });
    await row.locator('[data-action="toggle-entry"]').click();
    await expect(page.locator('#directories-toast-message')).toContainText(
      'деактивирована',
    );

    await page.goto('teachers');
    await expect(page.locator('h1')).toContainText('Учителя');
    await page.click('#btn-open-create-teacher');
    const subjectsBox = page.locator('#teacher-subjects');
    await expect(subjectsBox).toBeVisible();
    await expect(
      subjectsBox.locator('label', { hasText: 'Химия' }),
    ).toHaveCount(0);

    await page.goto('workload');
    await expect(page.locator('h1')).toContainText('Нагрузка');
    await page.click('#btn-open-add-workload');
    const subjectOptions = await page
      .locator('#select-workload-subject-modal option')
      .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
    expect(subjectOptions).not.toContain('Химия');
  });

  test('[TC-DIR-12] Переименование предмета отражается в матрице нагрузки', async ({
    page,
  }) => {
    await openDirectoriesAsAdmin(page);

    const row = page.locator('tr[data-row-id="hist"]');
    await row.locator('[data-action="edit-entry"]').click();
    await page.fill('#input-directory-name', 'История Древнего мира');
    await page.fill('#input-directory-short-name', 'История Др. мира');
    await page.click('#btn-save-directory-entry');
    await expect(page.locator('#directories-toast-message')).toContainText(
      'обновлена',
    );

    await page.goto('workload');
    await expect(page.locator('h1')).toContainText('Нагрузка');
    await expect(page.locator('#workload-table-area')).toContainText(
      'История Др. мира',
      { timeout: 5000 },
    );
  });
});
