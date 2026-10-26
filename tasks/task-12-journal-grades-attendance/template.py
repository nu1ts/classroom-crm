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


def test_tch_01_02_grades_saved_and_persisted(driver):
    """Проверить выставление оценок нескольким ученикам и их сохранение
    после перезагрузки."""


def test_tch_03_04_05_grade_validation_edit_delete(driver):
    """Проверить допустимые значения оценки, исправление и удаление оценки."""


def test_tch_06_closed_lesson_read_only_and_comment(driver):
    """Проверить запрет изменения закрытого занятия и возможность
    комментирования."""


def test_tch_07_08_09_absence_rules(driver):
    """Проверить снятие неподтверждённого пропуска, блокировку
    подтверждённого и запрет оценки отсутствующему."""


def test_tch_10_bulk_absence_idempotent(driver):
    """Проверить массовую отметку отсутствующих и повторное сохранение
    без дублей."""


def test_tch_11_14_roles_comments_and_homeroom(driver):
    """Проверить права предметника и классного руководителя, комментарии
    и подтверждение пропуска."""


def test_tch_15_16_full_grid_and_only_entries(driver):
    """Проверить сводный журнал и фильтр «Показывать только записи»."""
