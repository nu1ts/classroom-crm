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


def test_anl_05_student_attendance_percent(driver):
    """Проверить, что число пропусков ученика показано верно и пропуски
    выделяются в списке."""


def test_anl_06_unmarked_not_absent(driver):
    """Проверить, что неотмеченные уроки не попадают в знаменатель
    посещаемости."""


def test_anl_07_class_attendance_share(driver):
    """Проверить, что посещаемость класса считается по всем отметкам
    сразу."""


def test_anl_12_weekly_absences_share(driver):
    """Проверить, что доля пропусков за неделю считается от числа отметок
    этой недели."""


def test_anl_20_excused_is_absence(driver):
    """Проверить, что подтверждение пропуска справкой не убирает его из
    статистики."""
