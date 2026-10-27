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


def test_pr_07_unique_phone(driver):
    """Проверка TC-PR-07."""


def test_pr_08_link_existing_parent(driver):
    """Проверка TC-PR-08."""


def test_pr_09_single_primary(driver):
    """Проверка TC-PR-09."""


def test_pr_10_unlink_keeps_card(driver):
    """Проверка TC-PR-10."""


def test_pr_11_delete_linked_forbidden(driver):
    """Проверка TC-PR-11."""


def test_pr_12_delete_unlinked(driver):
    """Проверка TC-PR-12."""
