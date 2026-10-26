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


def test_bp_20_empty_attention_report(driver):
    """Проверка TC-BP-20."""


def test_bp_21_attention_cycle(driver):
    """Проверка TC-BP-21."""


def test_bp_22_student_journal_all_subjects(driver):
    """Проверка TC-BP-22."""


def test_bp_23_contacts_by_student(driver):
    """Проверка TC-BP-23."""


def test_bp_24_primary_contact_first(driver):
    """Проверка TC-BP-24."""
