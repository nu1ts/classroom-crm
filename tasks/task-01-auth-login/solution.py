import json
import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
PASSWORD = "Test#2024"
TEACHER = "smirnova@school.ru"


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


def open_login(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def submit_login(driver, username, password):
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(password)
    driver.find_element(By.ID, "btn-login-submit").click()


def wait_for_app(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def current_path(driver):
    return driver.current_url.split("?")[0]


def wait_for_route(driver, route, timeout=10):
    WebDriverWait(driver, timeout).until(
        lambda d: current_path(d).rstrip("/").endswith(route)
    )


def assert_route(driver, route, timeout=10):
    try:
        wait_for_route(driver, route, timeout)
    except TimeoutException:
        pytest.fail(
            f"Ожидался раздел {route}, открылся {current_path(driver)}"
        )


def wait_login_error(driver, timeout=10):
    def visible_error(d):
        box = d.find_element(By.ID, "login-error-box")
        if not box.is_displayed():
            return False
        text = d.find_element(By.ID, "login-error-text").text.strip()
        return text or False

    try:
        return WebDriverWait(driver, timeout).until(visible_error)
    except TimeoutException:
        pytest.fail(
            f"Сообщение об ошибке не появилось, адрес: {current_path(driver)}"
        )


def get_session(driver):
    return driver.execute_script(
        "return window.localStorage.getItem('classroom_crm_session');"
    )


def test_auth_01_successful_login(driver):
    """Проверяет вход классного руководителя и данные пользователя в панели."""
    open_login(driver)
    submit_login(driver, TEACHER, PASSWORD)

    wait_for_app(driver)
    assert_route(driver, "/overview")

    content = driver.find_element(By.ID, "app-content").text
    assert "7Б класс (28 учеников)" in content, (
        "Открылся не обзор класса 7Б"
    )

    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Смирнова М. В." in profile, f"В панели нет ФИО: «{profile}»"
    assert "Классный руководитель" in profile, f"В панели нет роли: «{profile}»"
    assert not driver.find_elements(By.ID, "login-form"), (
        "После входа форма авторизации осталась на странице"
    )


def test_auth_02_password_toggle_preserves_value(driver):
    """Проверяет переключение видимости пароля без потери значения."""
    open_login(driver)
    field = driver.find_element(By.ID, "login-password")
    field.send_keys(PASSWORD)
    toggle = driver.find_element(By.ID, "btn-toggle-password")

    toggle.click()
    assert field.get_attribute("type") == "text", "Пароль не стал видимым"
    assert field.get_attribute("value") == PASSWORD, (
        "При показе пароля введённое значение изменилось"
    )

    toggle.click()
    assert field.get_attribute("type") == "password", "Пароль не скрылся"
    assert field.get_attribute("value") == PASSWORD, (
        "При скрытии пароля введённое значение изменилось"
    )


def test_auth_03_all_roles_default_screens(driver):
    """Проверяет стартовый раздел для каждой роли."""
    cases = [
        (TEACHER, "/overview"),
        ("kozlov@school.ru", "/classes"),
        ("petrov@mail.ru", "/child"),
        ("petrova.a@school.ru", "/schedule"),
        ("admin@school.ru", "/accounts"),
    ]

    for username, route in cases:
        open_login(driver)
        submit_login(driver, username, PASSWORD)
        wait_for_app(driver)
        assert_route(driver, route)


def test_auth_04_wrong_password_rejected(driver):
    """Проверяет отказ во входе при неверном пароле."""
    open_login(driver)
    submit_login(driver, TEACHER, "Wrong#2024")

    message = wait_login_error(driver)
    assert message, "Сообщение об ошибке пустое"
    assert "/login" in current_path(driver), (
        f"Пользователь ушёл со страницы входа: {current_path(driver)}"
    )
    assert get_session(driver) is None, "При неверном пароле создана сессия"


def test_auth_05_unknown_login_generic_error(driver):
    """Проверяет одинаковый текст ошибки для неизвестного логина и пароля."""
    open_login(driver)
    submit_login(driver, "unknown-user@school.ru", "Wrong#2024")
    unknown_message = wait_login_error(driver)

    open_login(driver)
    submit_login(driver, TEACHER, "Wrong#2024")
    wrong_password_message = wait_login_error(driver)

    assert unknown_message == "Неверный логин или пароль", (
        f"Неизвестный логин раскрывает своё состояние: «{unknown_message}»"
    )
    assert unknown_message == wrong_password_message, (
        "Сообщения для неизвестного логина и неверного пароля различаются: "
        f"«{unknown_message}» и «{wrong_password_message}»"
    )


def test_auth_06_empty_fields_and_whitespace(driver):
    """Проверяет пустые поля, пробелы по краям логина и пустой пароль."""
    open_login(driver)
    driver.find_element(By.ID, "btn-login-submit").click()
    empty_message = wait_login_error(driver)
    assert empty_message == "Заполните логин и пароль", (
        f"Неожиданный текст ошибки для пустых полей: «{empty_message}»"
    )

    api_result = driver.execute_script("return window.crmApi.login('', '');")
    assert api_result["success"] is False, "API принял пустые логин и пароль"
    assert api_result["error"] == "Заполните все поля", (
        f"API вернул неожиданную ошибку: «{api_result['error']}»"
    )

    open_login(driver)
    driver.find_element(By.ID, "login-email").send_keys(TEACHER)
    driver.find_element(By.ID, "btn-login-submit").click()
    password_message = wait_login_error(driver)
    assert password_message == "Заполните логин и пароль", (
        f"Пустой пароль не отклонён: «{password_message}»"
    )

    open_login(driver)
    submit_login(driver, "  smirnova@school.ru  ", PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    raw_session = get_session(driver)
    assert raw_session, "Логин с пробелами по краям не создал сессию"
    session = json.loads(raw_session)
    assert session["username"] == TEACHER, (
        f"Логин сохранён с пробелами: «{session['username']}»"
    )


def test_auth_08_logout_clears_session(driver):
    """Проверяет очистку сессии при выходе и закрытие защищённых разделов."""
    open_login(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    driver.find_element(By.ID, "btn-sidebar-logout").click()
    WebDriverWait(driver, 10).until(EC.alert_is_present()).accept()

    assert_route(driver, "/login")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )
    assert get_session(driver) is None, "После выхода сессия осталась в хранилище"

    driver.back()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )
    assert "/login" in current_path(driver), (
        f"Кнопка «Назад» вернула в кабинет: {current_path(driver)}"
    )

    driver.get(app_url("students/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )
    assert "/login" in current_path(driver), (
        f"Защищённый раздел открылся без сессии: {current_path(driver)}"
    )
    assert get_session(driver) is None, "Сессия восстановилась после выхода"
