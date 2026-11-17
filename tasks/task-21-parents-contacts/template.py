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


def test_pr_13_summary_read_only(driver):
    """Проверить, что анкетные данные в сводке родителя доступны только для чтения."""


def test_pr_14_summary_all_children(driver):
    """Проверить отображение всех связанных учеников, включая ребёнка из другого класса."""


def test_pr_15_contact_agreement(driver):
    """Проверить сохранение контакта с отметкой о достигнутой договорённости."""


def test_pr_16_contact_required_fields(driver):
    """Проверить обязательность канала и итога контакта."""


def test_pr_17_contact_without_student(driver):
    """Проверить общий контакт без привязки к ученику."""


def test_pr_18_history_order(driver):
    """Проверить порядок истории общения от новых записей к старым."""


def test_pr_19_parents_route_denied(driver):
    """Проверить запрет доступа родителя к разделу «Родители»."""


def test_pr_20_history_hidden_from_parent(driver):
    """Проверить, что родитель не видит внутреннюю историю общения и заметки классрука."""
