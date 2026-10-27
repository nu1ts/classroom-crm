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


def test_bp_06_unconfirmed_list_link(driver):
    """Проверить переход из предупреждения к подсвеченной строке ученика."""


def test_bp_07_no_warning_without_unconfirmed(driver):
    """Проверить отсутствие предупреждения и нулевую метрику без
    неподтверждённых пропусков."""


def test_bp_08_confirm_author(driver):
    """Проверить запись классного руководителя и основания подтверждения."""


def test_bp_09_confirmed_not_editable(driver):
    """Проверить запрет предметнику изменять или удалять подтверждённый
    пропуск."""


def test_bp_10_refusal_keeps_absence(driver):
    """Проверить сохранение неуважительного пропуска в списке и зоне риска."""


def test_bp_34_subject_teacher_api_denied(driver):
    """Проверить отказ API подтверждения для учителя-предметника."""
