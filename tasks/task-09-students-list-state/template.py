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


def test_ov_05_status_and_risk_badge(driver):
    """Проверить, что статус ученика и бейдж зоны риска отображаются
    раздельно."""


def test_ov_07_empty_search_with_filter(driver):
    """Проверить пустой результат поиска при включённом фильтре и сброс
    фильтров."""


def test_ov_09_pagination_keeps_sort(driver):
    """Проверить сохранение поиска и сортировки при переходе по страницам."""


def test_ov_10_sort_by_average(driver):
    """Проверить сортировку списка по среднему баллу в обоих направлениях."""


def test_ov_11_summary_close_keeps_state(driver):
    """Проверить сохранение поиска и сортировки после закрытия сводки
    ученика."""
