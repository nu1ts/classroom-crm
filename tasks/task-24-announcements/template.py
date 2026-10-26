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


def test_an_01_list_audience(driver):
    """Проверить состав ленты, адресатов и действия классного руководителя."""


def test_an_02_publish_keeps_read_counts(driver):
    """Проверить публикацию объявления без изменения счётчиков прочтений
    исходных карточек."""


def test_an_03_required_fields(driver):
    """Проверить обязательность заголовка и текста при публикации."""


def test_an_04_edit_keeps_date(driver):
    """Проверить изменение текста без смены даты, счётчика и создания
    дубликата."""


def test_an_05_delete_confirmation(driver):
    """Проверить отмену и подтверждение удаления объявления."""


def test_an_07_delete_keeps_meeting(driver):
    """Проверить независимость удаления объявления и родительского
    собрания."""
