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


def test_pr_13_summary_read_only(driver):
    """Проверка TC-PR-13."""


def test_pr_14_summary_all_children(driver):
    """Проверка TC-PR-14."""


def test_pr_15_contact_agreement(driver):
    """Проверка TC-PR-15."""


def test_pr_16_contact_required_fields(driver):
    """Проверка TC-PR-16."""


def test_pr_17_contact_without_student(driver):
    """Проверка TC-PR-17."""


def test_pr_18_history_order(driver):
    """Проверка TC-PR-18."""


def test_pr_19_parents_route_denied(driver):
    """Проверка TC-PR-19."""


def test_pr_20_history_hidden_from_parent(driver):
    """Проверка TC-PR-20."""
