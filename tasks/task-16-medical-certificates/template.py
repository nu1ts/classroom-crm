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


def test_med_01_confirm_certificate(driver):
    """Проверить подтверждение справки и отображение её реквизитов."""


def test_med_02_certificate_multiple_days(driver):
    """Проверить отдельное подтверждение каждого дня болезни своей справкой."""


def test_med_03_refuse_confirmation(driver):
    """Проверить сохранение неподтверждённой причины без справки."""


def test_med_04_subject_teacher_forbidden(driver):
    """Проверить запрет подтверждения причины для предметника."""


def test_med_05_journal_entry_preserved(driver):
    """Проверить сохранение отметки пропуска в журнале после подтверждения."""
