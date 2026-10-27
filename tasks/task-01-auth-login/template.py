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


def test_auth_01_successful_login(driver):
    """Проверить, что вход классного руководителя открывает стартовый раздел
    и показывает ФИО и роль пользователя в боковой панели."""


def test_auth_02_password_toggle_preserves_value(driver):
    """Проверить, что кнопка показа пароля переключает тип поля и сохраняет
    введённое значение."""


def test_auth_03_all_roles_default_screens(driver):
    """Проверить, что каждая роль после входа попадает на свой стартовый
    раздел."""


def test_auth_04_wrong_password_rejected(driver):
    """Проверить, что неверный пароль не создаёт сессию и показывает ошибку,
    оставляя пользователя на странице входа."""


def test_auth_05_unknown_login_generic_error(driver):
    """Проверить, что несуществующий логин и неверный пароль дают одинаковое
    сообщение об ошибке."""


def test_auth_06_empty_fields_and_whitespace(driver):
    """Проверить обработку пустых полей, пробелов по краям логина и пустого
    пароля при прямом вызове API входа."""


def test_auth_08_logout_clears_session(driver):
    """Проверить, что выход из системы очищает сессию и закрывает доступ к
    защищённым разделам."""
