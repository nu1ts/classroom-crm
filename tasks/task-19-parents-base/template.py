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
    """Проверить счётчик родителей и учеников: он считает людей, а не число связей."""


def test_pr_02_search_name_phone(driver):
    """Проверить поиск по ФИО и телефону без учёта регистра."""


def test_pr_03_filter_reset(driver):
    """Проверить фильтр «Без связи» и сброс фильтров."""


def test_pr_04_add_parent_link(driver):
    """Проверить добавление родителя со связью с учеником."""


def test_pr_05_phone_required(driver):
    """Проверить обязательность телефона при создании родителя."""


def test_pr_06_parent_card_edit(driver):
    """Проверить изменение анкетных данных и их отображение в сводке."""
