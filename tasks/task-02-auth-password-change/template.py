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


def test_auth_07_lockout_after_failed_attempts(driver):
    """Проверить счётчик неудачных попыток и блокировку учётной записи после
    пятой неудачной попытки подряд."""


def test_auth_10_change_password_success(driver):
    """Проверить успешную смену пароля, сохранение сессии, вход с новым
    паролем через интерфейс и отсутствие пароля на экране."""


def test_auth_11_change_password_wrong_current(driver):
    """Проверить отказ при неверном текущем пароле и сохранение прежнего
    пароля."""


def test_auth_13_old_password_invalid(driver):
    """Проверить, что после смены пароля старый пароль не работает, а новый
    открывает кабинет с прежними правами."""
