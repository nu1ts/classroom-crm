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


def test_bp_01_teacher_default_screen(driver):
    """Проверить стартовый экран после входа классного руководителя."""


def test_bp_02_dashboard_attendance(driver):
    """Проверить расчёт посещаемости на дашборде по всем урокам дня."""


def test_bp_03_dashboard_average_delta(driver):
    """Проверить сравнение среднего балла с прошлой неделей."""


def test_bp_04_unconfirmed_metric(driver):
    """Проверить счётчик неподтверждённых пропусков и переход к журналу."""


def test_bp_05_metrics_recalculated(driver):
    """Проверить пересчёт метрик после изменения данных журнала."""


def test_bp_36_attendance_boundaries(driver):
    """Проверить значения посещаемости без отметок и при полной явке."""
