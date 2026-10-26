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


def test_ov_12_summary_content(driver):
    """Проверить основные показатели сводки ученика: средний балл, пропуски
    и список предметов."""


def test_ov_13_subject_threshold_highlight(driver):
    """Проверить средние баллы по предметам и выделение предметов ниже
    порога 3,5."""


def test_ov_14_last_absences_details(driver):
    """Проверить статусы подтверждения пропусков и кнопку подтверждения
    только у неподтверждённой записи."""


def test_ov_15_notes_persisted(driver):
    """Проверить добавление приватной заметки, её отображение и сохранение
    после перезагрузки страницы."""


def test_ov_16_contact_history_order(driver):
    """Проверить порядок истории контактов с родителями от новых записей
    к старым и форму добавления записи."""


def test_ov_17_summary_read_only(driver):
    """Проверить режим только для чтения в карточке ученика другого класса."""


def test_ov_18_parent_child_summary(driver):
    """Проверить сводку ребёнка в разделе родителя и недоступность приватных
    заметок классрука."""


def test_ov_19_student_and_parent_summary_denied(driver):
    """Проверить запрет ученику смотреть чужую карточку и родителю — маршрут
    карточки ученика."""
