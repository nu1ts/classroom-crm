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


def test_anl_01_student_average_period(driver):
    """Проверить, что средний балл ученика за период одинаков в списке
    «Ученики» и в «Сводке», а отметки о присутствии в расчёт не входят."""


def test_anl_02_single_grade_average(driver):
    """Проверить, что единственная оценка даёт полноценный средний балл, а не
    прочерк, ноль или сумму баллов."""


def test_anl_03_average_rounding(driver):
    """Проверить округление среднего балла до десятых вверх и ровный расчёт
    без округления на примере двух учеников."""


def test_anl_04_half_rounding(driver):
    """Проверить, что ровно половина при округлении среднего балла
    округляется вверх, а не вниз."""


def test_anl_05_student_attendance(driver):
    """Проверить пропуски и посещаемость ученика, бейдж зоны риска и
    отсутствие красной подсветки у пропусков ниже порога 20 %."""
