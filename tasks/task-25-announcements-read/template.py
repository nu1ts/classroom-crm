import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")


@pytest.fixture(scope="module")
def driver():
    """Создаёт браузер для проверок интерфейса."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    browser = webdriver.Remote(SELENIUM, options=options)
    yield browser
    browser.quit()


def test_an_06_parent_student_see(driver):
    """Проверить видимость объявления и общий семейный счётчик прочтений."""


def test_an_08_publish_from_meeting(driver):
    """Проверить публикацию объявления из карточки собрания."""


def test_an_09_read_counter(driver):
    """Проверить границу и повторные открытия счётчика прочтений."""


def test_an_10_empty_state(driver):
    """Проверить пустое состояние списка объявлений для всех ролей."""
