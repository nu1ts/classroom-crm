import os
from urllib.parse import urlsplit

import pytest
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
PASSWORD = "Test#2024"

ROLE_ACCOUNTS = {
    "admin": "admin@school.ru",
    "teacher": "smirnova@school.ru",
    "subject_teacher": "kozlov@school.ru",
    "parent": "petrov@mail.ru",
    "student": "petrova.a@school.ru",
}


@pytest.fixture(scope="module")
def driver():
    """Создаёт экземпляр браузера Chrome перед тестами и закрывает после."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    browser = webdriver.Remote(SELENIUM, options=options)
    yield browser
    browser.quit()


def app_url(path=""):
    if not path:
        return BASE_URL + "/"
    return f"{BASE_URL}/{path.lstrip('/')}"


def reset_app(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def login_as(driver, role):
    reset_app(driver)
    email = driver.find_element(By.ID, "login-email")
    email.send_keys(ROLE_ACCOUNTS[role])
    password = driver.find_element(By.ID, "login-password")
    password.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def main_menu_links(driver):
    return driver.find_elements(By.CSS_SELECTOR, "#app-sidebar nav a[href]")


def main_menu_titles(driver):
    return [link.text.strip() for link in main_menu_links(driver)]


def current_path(driver):
    path = urlsplit(driver.current_url).path.rstrip("/")
    base_path = urlsplit(BASE_URL).path.rstrip("/")
    if base_path and path.startswith(base_path + "/"):
        path = path[len(base_path) :]
    return path or "/"


def assert_menu(driver, expected_titles, forbidden_titles=()):
    actual = main_menu_titles(driver)
    assert actual == expected_titles, (
        f"Ожидалось меню {expected_titles}, получено {actual}"
    )
    for title in forbidden_titles:
        assert title not in actual, f"В меню не должно быть пункта «{title}»"


def assert_each_menu_route_opens(driver):
    items = [
        (link.text.strip(), link.get_dom_attribute("href").rstrip("/"))
        for link in main_menu_links(driver)
    ]
    for title, expected_path in items:
        driver.find_element(
            By.CSS_SELECTOR, f'#app-sidebar nav a[href="{expected_path}"]'
        ).click()
        try:
            WebDriverWait(driver, 10).until(
                lambda d: current_path(d) == expected_path
            )
        except TimeoutException:
            pytest.fail(
                f"Пункт «{title}» должен открыть {expected_path}, "
                f"но открылся {current_path(driver)}"
            )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "app-content"))
        )


def test_rm_01_admin_navigation(driver):
    """Проверяет меню администратора и переход по каждому его пункту."""
    login_as(driver, "admin")
    assert_menu(
        driver,
        [
            "Учётные записи",
            "Учителя",
            "Справочники",
            "Нагрузка",
            "Учебный год",
        ],
        ("Журнал", "Ученики", "Собрания", "Аналитика"),
    )
    assert_each_menu_route_opens(driver)


def test_rm_02_teacher_navigation(driver):
    """Проверяет меню классного руководителя и переход по каждому пункту."""
    login_as(driver, "teacher")
    assert_menu(
        driver,
        [
            "Обзор класса",
            "Ученики",
            "Журнал",
            "Посещаемость",
            "Расписание",
            "Родители",
            "Собрания",
            "Объявления",
            "Аналитика",
        ],
        ("Учётные записи", "Справочники", "Нагрузка"),
    )
    assert_each_menu_route_opens(driver)


def test_rm_03_subject_teacher_navigation(driver):
    """Проверяет ограниченное меню учителя-предметника."""
    login_as(driver, "subject_teacher")
    assert_menu(
        driver,
        ["Мои классы", "Посещаемость", "Расписание", "Аналитика"],
        ("Родители", "Собрания", "Объявления"),
    )
    assert_each_menu_route_opens(driver)


def test_rm_04_parent_navigation(driver):
    """Проверяет меню родителя без управления родительскими собраниями."""
    login_as(driver, "parent")
    assert_menu(
        driver,
        ["Ребёнок", "Расписание", "Объявления"],
        ("Журнал", "Родители", "Собрания", "Аналитика"),
    )
    assert not driver.find_elements(By.ID, "btn-create-meeting"), (
        "Родителю не должна быть доступна кнопка создания собрания"
    )
    assert not driver.find_elements(By.CSS_SELECTOR, ".btn-mark-attendance"), (
        "Родителю не должна быть доступна отметка явки"
    )
    assert_each_menu_route_opens(driver)


def test_rm_05_student_navigation(driver):
    """Проверяет меню ученика и пометку режима только для просмотра."""
    login_as(driver, "student")
    assert_menu(
        driver,
        ["Расписание", "Оценки", "Объявления"],
        ("Ребёнок", "Журнал", "Родители", "Собрания"),
    )
    badge = driver.find_element(By.XPATH, "//*[normalize-space()='Только для просмотра']")
    assert badge.is_displayed(), "Пометка режима только для просмотра не видна"
    assert_each_menu_route_opens(driver)
