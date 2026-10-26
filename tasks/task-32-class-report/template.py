import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")


@pytest.fixture(scope="module")
def driver():
    """Создаёт браузер Chrome и закрывает его после выполнения проверок."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    browser = webdriver.Remote(SELENIUM, options=options)
    yield browser
    browser.quit()


def test_bp_31_report_period(driver):
    """Проверить отчёт по классу за I четверть и доступность печати."""


def test_bp_32_report_not_cached(driver):
    """Проверить динамический пересчёт отчёта без сохранённого кэша."""


def test_bp_33_report_period_boundaries(driver):
    """Проверить включение последнего дня выбранного периода в посещаемость."""


def test_bp_35_teacher_own_class(driver):
    """Проверить запрет классному руководителю на данные чужого класса."""
