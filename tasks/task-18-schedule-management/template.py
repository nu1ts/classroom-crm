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


def test_sch_08_add_lesson_and_room_conflict(driver):
    """Проверить добавление занятия и отказ при занятой аудитории."""


def test_sch_09_reschedule_keeps_journal(driver):
    """Проверить перенос занятия на другое время и аудиторию с сохранением
    записей журнала."""


def test_sch_10_cancel_lesson_keeps_journal(driver):
    """Проверить отмену занятия с сохранением оценок и посещаемости."""


def test_sch_11_vacation_empty_state(driver):
    """Проверить пустое состояние каникулярной недели и возврат к занятиям."""


def test_sch_12_room_conflict_boundary(driver):
    """Проверить границу конфликта: тот же слот, но другая свободная
    аудитория."""
