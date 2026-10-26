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


def test_ov_08_pagination_page_size(driver):
    """Проверить размер страницы, счётчик и отсутствие повторов учеников
    между страницами."""


def test_ov_09_pagination_keeps_state(driver):
    """Проверить сохранение поиска и сортировки при переходе по страницам."""


def test_ov_10_sort_columns(driver):
    """Проверить сортировку списка по среднему баллу в обоих направлениях."""


def test_ov_11_back_keeps_state(driver):
    """Проверить сохранение поиска, сортировки и номера страницы после
    закрытия сводки ученика."""
