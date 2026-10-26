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


def test_tch_07_unconfirmed_absence_can_be_removed(driver):
    """Проверить снятие неподтверждённой отметки отсутствия и сохранение
    этого изменения."""


def test_tch_08_confirmed_absence_locked_and_grid_refreshed(driver):
    """Проверить блокировку подтверждённой отметки отсутствия и обновление
    сетки журнала после подтверждения причины."""


def test_tch_10_bulk_absence_saved_without_duplicates(driver):
    """Проверить массовую отметку отсутствующих и повторное сохранение без
    дублей."""


def test_tch_14_homeroom_journal_is_read_only(driver):
    """Проверить, что классный руководитель просматривает журнал по всем
    предметам, но не меняет записи."""


def test_tch_16_only_entries_filter_keeps_marks(driver):
    """Проверить сводный журнал и фильтр «Показывать только записи»."""
