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


def test_mg_01_meetings_order(driver):
    """Проверить разделение ближайшего и прошедшего собраний по дате."""


def test_mg_02_create_meeting_room(driver):
    """Проверить создание собрания с сохранением места и повестки."""


def test_mg_03_required_fields(driver):
    """Проверить обязательность темы, даты и времени без обязательной повестки."""


def test_mg_04_agenda_edit(driver):
    """Проверить изменение состава и порядка пунктов повестки."""


def test_mg_05_reschedule(driver):
    """Проверить перенос существующего собрания без создания дубликата."""


def test_mg_06_cancel_keeps_announcement(driver):
    """Проверить, что отмена собрания не удаляет опубликованное объявление."""


def test_mg_12_subject_teacher_forbidden(driver):
    """Проверить запрет раздела и создания собраний для предметника."""
