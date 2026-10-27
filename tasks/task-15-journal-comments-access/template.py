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


def test_tch_11_comment_keeps_author_and_time(driver):
    """Проверить, что комментарий предметника сохраняется с автором и
    временем и виден классному руководителю."""


def test_tch_12_foreign_comment_cannot_be_deleted(driver):
    """Проверить, что комментарий классного руководителя сохраняется с
    автором и недоступен для удаления предметником."""


def test_tch_13_subject_teacher_sees_own_classes(driver):
    """Проверить, что предметнику доступны только его занятия, а чужие
    журналы отклоняются."""


def test_tch_15_summary_journal_shows_all_subjects(driver):
    """Проверить сводный журнал по всем предметам и возврат к нему после
    выбора конкретного предмета."""
