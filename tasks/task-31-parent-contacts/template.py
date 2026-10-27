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


def test_bp_25_contact_linked_to_parent(driver):
    """Проверка TC-BP-25."""


def test_bp_26_contact_summary_required(driver):
    """Проверка TC-BP-26."""


def test_bp_27_note_not_contact(driver):
    """Проверка TC-BP-27."""


def test_bp_28_agreement_reached(driver):
    """Проверка TC-BP-28."""


def test_bp_29_repeat_contact_reminder(driver):
    """Проверка TC-BP-29."""


def test_bp_30_notes_private(driver):
    """Проверка TC-BP-30."""
