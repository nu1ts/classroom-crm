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


def test_bp_16_absence_threshold_20(driver):
    """Проверить, что ровно 20 % пропусков не включают ученика в список внимания."""


def test_bp_17_grade_threshold_3_5(driver):
    """Проверить, что средний балл ровно 3,5 не включает ученика в список внимания."""


def test_bp_18_risk_not_cached(driver):
    """Проверить, что состав списка внимания пересчитывается после изменения данных."""


def test_bp_19_risk_order(driver):
    """Проверить порядок учеников в списке внимания."""


def test_bp_37_single_student_report(driver):
    """Проверить переход к отчёту после обработки единственного ученика."""
