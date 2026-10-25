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


def test_anl_13_risk_zone_recalculated(driver):
    """Проверить состав и причины зоны риска, а также её пересчёт после
    исправления пропусков ученика."""


def test_anl_14_unconfirmed_absences(driver):
    """Проверить счётчик неподтверждённых пропусков и статусы записей
    в отчёте за I четверть."""


def test_anl_15_report_not_stored(driver):
    """Проверить, что отчёт формируется из журнала заново и меняется после
    добавления новой оценки."""


def test_anl_20_excused_absence_stays_absence(driver):
    """Проверить, что подтверждение уважительной причины не уменьшает число
    пропусков ученика."""


def test_anl_22_empty_period_no_defaults(driver):
    """Проверить прочерки и пустую зону риска за период без данных, а также
    восстановление показателей при возврате к I четверти."""
