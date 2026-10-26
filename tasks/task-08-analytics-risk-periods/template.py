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


def test_anl_08_no_grades_no_average(driver):
    """Проверить, что при отсутствии оценок за период среднего балла нет,
    а вместо него прочерк."""


def test_anl_09_period_switch(driver):
    """Проверить, что отчёт пересчитывается под выбранный период."""


def test_anl_11_subject_averages_threshold(driver):
    """Проверить, что средние баллы по предметам считаются по оценкам своего
    класса."""


def test_anl_13_risk_zone_recalculated(driver):
    """Проверить, что зона риска пересчитывается по актуальным данным."""


def test_anl_22_empty_period(driver):
    """Проверить, что за период без данных отчёт не показывает выдуманные
    числа."""
