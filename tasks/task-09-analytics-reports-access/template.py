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


def test_anl_14_unconfirmed_counter(driver):
    """Проверить, что счётчик неподтверждённых пропусков в отчёте считает
    только пропуски без подтверждённой причины."""


def test_anl_15_report_not_cached(driver):
    """Проверить, что отчёт строится по актуальным данным журнала, а не
    хранится в базе."""


def test_anl_16_teacher_own_class_only(driver):
    """Проверить, что классный руководитель не открывает аналитику чужого
    класса."""


def test_anl_17_subject_teacher_subjects(driver):
    """Проверить, что учитель-предметник не получает доступ к аналитике
    класса."""


def test_anl_18_parent_child_metrics(driver):
    """Проверить, что родитель видит показатели своего ребёнка, а не
    показатели класса."""
