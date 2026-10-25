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


def test_anl_06_attendance_denominator(driver):
    """Проверить, что пропуски ученика считаются от отмеченных уроков, а не
    от всех уроков по расписанию."""


def test_anl_08_student_without_grades(driver):
    """Проверить, что ученик без оценок за период получает прочерк, не ноль,
    и не попадает в зону риска по баллу."""


def test_anl_09_period_switch_recalculates(driver):
    """Проверить, что смена периода в аналитике пересчитывает показатели
    класса и возврат к исходному периоду восстанавливает значения."""


def test_anl_11_subject_averages(driver):
    """Проверить средние баллы по предметам за период, порог зоны риска и
    подпись о способе расчёта."""


def test_anl_12_weekly_absences(driver):
    """Проверить доли пропусков по неделям и подпись о знаменателе расчёта."""
