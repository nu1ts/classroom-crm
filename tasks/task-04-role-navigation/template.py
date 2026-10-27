import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

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


def test_rm_01_admin_navigation(driver):
    """Проверить пять разделов администратора, отсутствие разделов класса и
    переход из каждого пункта меню."""


def test_rm_02_teacher_navigation(driver):
    """Проверить девять разделов классного руководителя, отсутствие разделов
    администратора и переход из каждого пункта меню."""


def test_rm_03_subject_teacher_navigation(driver):
    """Проверить набор разделов учителя-предметника и отсутствие разделов
    ведения родителей, собраний и объявлений."""


def test_rm_04_parent_navigation(driver):
    """Проверить разделы родителя, отсутствие отдельного раздела собраний и
    элементов управления собраниями."""


def test_rm_05_student_navigation(driver):
    """Проверить разделы ученика, пометку режима только для просмотра и
    отсутствие раздела родителя."""
