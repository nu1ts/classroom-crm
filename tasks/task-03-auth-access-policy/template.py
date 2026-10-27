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


def test_auth_09_switch_user_role_context(driver):
    """Проверить, что после смены пользователя доступные разделы и данные
    пересчитываются по новой роли, а сессия прежнего пользователя закрыта."""


def test_auth_12_new_password_policy(driver):
    """Проверить требования к длине и составу нового пароля, а также проверку
    совпадения пароля и его повтора."""


def test_auth_14_blocked_account_rejected(driver):
    """Проверить, что заблокированная администратором учётная запись не может
    войти, а после разблокировки входит с прежним паролем и данными."""


def test_auth_15_self_reset_unavailable(driver):
    """Проверить отсутствие самостоятельного сброса пароля и полный цикл
    восстановления через администратора с временным паролем."""
