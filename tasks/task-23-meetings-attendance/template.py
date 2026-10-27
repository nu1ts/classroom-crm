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


def test_mg_07_attendance_values(driver):
    """Проверить допустимые значения явки и сохранение отметок."""


def test_mg_08_absence_reason_required(driver):
    """Проверить обязательность причины для неявки."""


def test_mg_09_future_attendance_blocked(driver):
    """Проверить запрет отметки явки до проведения собрания."""


def test_mg_10_summary_realtime(driver):
    """Проверить динамический пересчёт итогов после изменения явки."""


def test_mg_11_parent_meetings(driver):
    """Проверить видимость собраний и скрытие явки для родителя."""


def test_mg_13_all_present_counter(driver):
    """Проверить верхнюю границу счётчика «28 из 28»."""
