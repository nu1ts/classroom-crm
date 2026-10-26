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


def test_ov_01_default_list(driver):
    """Проверить состав, колонки и алфавитный порядок списка, основной
    контакт родителя и сортировку по фамилии после зачисления ученика."""


def test_ov_02_list_matches_summary(driver):
    """Проверить, что средний балл и пропуски в списке совпадают со сводкой
    ученика."""


def test_ov_03_search_case_insensitive(driver):
    """Проверить поиск по фамилии без учёта регистра и восстановление списка
    после очистки поиска."""


def test_ov_04_absences_filter(driver):
    """Проверить фильтр по пропускам: ученики без пропусков не попадают
    в выборку."""


def test_ov_05_status_and_risk_badge(driver):
    """Проверить, что статус ученика и бейдж зоны риска отображаются
    раздельно."""


def test_ov_06_search_with_filter(driver):
    """Проверить одновременное применение поиска и фильтра по пропускам."""


def test_ov_07_empty_result_state(driver):
    """Проверить пустое состояние списка при включённом фильтре и сброс
    фильтров."""
