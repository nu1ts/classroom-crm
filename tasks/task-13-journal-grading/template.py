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


def test_tch_01_single_grade_saved(driver):
    """Проверить выставление оценки одному ученику и её сохранение после
    перезагрузки страницы."""


def test_tch_02_bulk_grades_saved(driver):
    """Проверить выставление оценок нескольким ученикам за один урок без
    дублей и потерь."""


def test_tch_03_grade_value_validation(driver):
    """Проверить допустимые значения оценки и неизменность данных при
    недопустимом значении."""


def test_tch_04_grade_edit_overwrites(driver):
    """Проверить изменение своей оценки: запись перезаписывается, а не
    добавляется."""


def test_tch_05_deleted_grade_leaves_average(driver):
    """Проверить удаление своей оценки: клетка очищается, а средний балл и
    счётчик уменьшаются."""


def test_tch_06_closed_lesson_is_read_only(driver):
    """Проверить, что закрытое занятие доступно только для просмотра, а
    комментарий к нему добавить можно."""


def test_tch_09_grade_blocked_for_absent(driver):
    """Проверить, что ученику с отметкой отсутствия оценка не выставляется."""
