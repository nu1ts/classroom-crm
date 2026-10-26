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


def test_pr_01_02_list_and_phone_search(driver):
    """Проверить состав базы родителей и поиск по фамилии и телефону."""


def test_pr_03_04_05_filter_add_and_phone_validation(driver):
    """Проверить фильтр «Без связи», добавление родителя и обязательность
    телефона."""


def test_pr_06_07_edit_phone_single_record(driver):
    """Проверить изменение телефона и его отображение во всех разделах."""


def test_pr_08_09_link_and_primary_contact(driver):
    """Проверить связывание родителя с учеником и перенос основного
    контакта."""


def test_pr_10_11_12_unlink_and_delete_rules(driver):
    """Проверить снятие связи и правила удаления родителя."""


def test_pr_13_14_parent_summary_children(driver):
    """Проверить состав сводки родителя и детей из разных классов."""


def test_pr_15_16_17_18_contacts_history(driver):
    """Проверить фиксацию контактов, их порядок и общий контакт без
    ученика."""


def test_pr_19_20_role_access_and_privacy(driver):
    """Проверить доступ к базе родителей и приватность истории общения."""
