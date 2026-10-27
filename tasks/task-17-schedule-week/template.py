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


def test_sch_01_week_grid(driver):
    """Проверить недельную сетку расписания и состав занятий 7Б."""


def test_sch_02_week_switch(driver):
    """Проверить переключение недель кнопками и восстановление текущей
    недели."""


def test_sch_03_parent_readonly(driver):
    """Проверить расписание родителя в режиме только для просмотра."""


def test_sch_04_student_today_highlight(driver):
    """Проверить подсветку текущего дня в расписании ученика."""


def test_sch_05_foreign_class_denied(driver):
    """Проверить отказ в доступе к расписанию чужого класса."""


def test_sch_06_same_schedule_all_roles(driver):
    """Проверить совпадение занятий у классрука, родителя и ученика."""


def test_sch_07_subject_teacher_all_classes(driver):
    """Проверить расписание учителя-предметника по всем его классам."""
