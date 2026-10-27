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


def test_pr_01_parents_list_counter(driver):
    """Проверка TC-PR-01."""


def test_pr_02_search_name_phone(driver):
    """Проверка TC-PR-02."""


def test_pr_03_filter_reset(driver):
    """Проверка TC-PR-03."""


def test_pr_04_add_parent_link(driver):
    """Проверка TC-PR-04."""


def test_pr_05_phone_required(driver):
    """Проверка TC-PR-05."""


def test_pr_06_parent_card_edit(driver):
    """Проверка TC-PR-06."""
