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
    """Проверить пустой список внимания и переход к отчёту."""


def test_bp_21_attention_cycle(driver):
    """Проверить обработку всех карточек списка внимания и итоговое сообщение."""


def test_bp_22_student_journal_all_subjects(driver):
    """Проверить, что в сводке ученика журнал содержит все предметы за период."""


def test_bp_23_contacts_by_student(driver):
    """Проверить, что история общения в сводке содержит только контакты этого ученика."""


def test_bp_24_primary_contact_first(driver):
    """Проверить, что основной контакт родителя отображается первым."""
