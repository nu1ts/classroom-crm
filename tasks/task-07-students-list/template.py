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


def test_ov_01_students_list_order(driver):
    """Проверить состав, колонки и алфавитный порядок списка, а также
    основного родителя Петровой Анны."""


def test_ov_02_list_matches_summary(driver):
    """Проверить, что средний балл и пропуски в списке совпадают со сводкой
    ученика."""


def test_ov_03_search_case_insensitive(driver):
    """Проверить поиск по фамилии без учёта регистра и восстановление списка
    после очистки поиска."""


def test_ov_04_absences_filter(driver):
    """Проверить фильтр по пропускам: ученики без пропусков не попадают
    в выборку."""


def test_ov_06_search_and_filter_combined(driver):
    """Проверить одновременное применение поиска и фильтра, пустой результат
    и сброс фильтров."""


def test_ov_08_pagination(driver):
    """Проверить размер страницы, счётчик и отсутствие повторов учеников
    между страницами."""
