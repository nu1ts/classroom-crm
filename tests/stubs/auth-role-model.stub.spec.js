import { test, expect } from '../fixtures/base-test.js';

test.describe('[ЗАГЛУШКИ] Авторизация и ролевая модель (TC-AUTH / TC-RM)', () => {

  test('[STUB] TC-AUTH-03: Успешный вход учителя-предметника и проверка доступных разделов', async () => {
    // TODO: Будет реализовано после полной интеграции кабинета предметника (#/classes)
    expect(true).toBe(true);
  });

  test('[STUB] TC-AUTH-04: Успешный вход администратора школы и разделы администрирования', async () => {
    // TODO: Будет реализовано после завершения интерфейса учётных записей (#/accounts)
    expect(true).toBe(true);
  });

  test('[STUB] TC-AUTH-05: Успешный вход родителя и кабинет ребёнка', async () => {
    // TODO: Будет реализовано после реализации раздела родителя (#/child)
    expect(true).toBe(true);
  });

  test('[STUB] TC-AUTH-06: Вход ученика с ограничением «Только просмотр»', async () => {
    // TODO: Будет реализовано после включения readonly-режима ученика
    expect(true).toBe(true);
  });

  test('[STUB] TC-AUTH-07: Блокировка тестовой УЗ Осипова после 5 неудачных попыток ввода пароля', async () => {
    // TODO: Будет реализовано в задаче автотестов авторизации
    expect(true).toBe(true);
  });

  test('[STUB] TC-RM-01: Попытка прямого доступа классрука к разделам администратора (#/accounts -> 403 Forbidden)', async () => {
    // TODO: Проверка экрана 403 Forbidden
    expect(true).toBe(true);
  });

});
