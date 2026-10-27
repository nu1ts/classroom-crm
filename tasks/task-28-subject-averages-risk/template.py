import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

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


def test_bp_11_absences_breakdown(driver):
    """Проверить корректность отображения подтверждённых пропусков."""


def test_bp_12_subject_average_threshold(driver):
    """Проверить отображение порога внимания по среднему баллу."""


def test_bp_13_risk_by_absences(driver):
    """Проверить попадание в зону риска по доле пропусков."""


def test_bp_14_risk_by_average(driver):
    """Проверить попадание в зону риска по среднему баллу."""


def test_bp_15_risk_both_reasons(driver):
    """Проверить объединение причин риска в одной карточке ученика."""
