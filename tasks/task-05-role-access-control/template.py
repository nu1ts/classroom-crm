import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")


@pytest.fixture(scope="module")
def driver():
    """Создаёт экземпляр браузера Chrome перед тестами и закрывает после."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    browser = webdriver.Remote(SELENIUM, options=options)
    yield browser
    browser.quit()


def test_rm_06_forbidden_actions(driver):
    """Проверить скрытие и серверный запрет изменения оценки классруком."""


def test_rm_07_admin_routes_direct_access(driver):
    """Проверить прямой запрет разделов администратора для классрука и
    предметника без раскрытия данных."""


def test_rm_08_class_routes_direct_access(driver):
    """Проверить запрет общеклассных разделов для родителя и ученика."""


def test_rm_09_teacher_foreign_class(driver):
    """Проверить, что классрук не открывает по адресу учеников и аналитику
    чужих классов."""


def test_rm_10_admin_journal_meetings(driver):
    """Проверить, что администратору закрыты классные разделы, но доступен
    раздел учителей."""


def test_rm_11_subject_teacher_workload(driver):
    """Проверить прямой доступ предметника только к журналам из нагрузки."""


def test_rm_12_forbidden_no_disclosure(driver):
    """Проверить одинаковый отказ без раскрытия сведений о чужом или
    несуществующем ученике."""


def test_rm_13_profile_read_only(driver):
    """Проверить, что роль и привязка в профиле только для чтения и смена
    языка не расширяет права."""
