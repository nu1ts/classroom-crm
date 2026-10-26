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
TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"
NEW_PASSWORD = "Novy#2025"
WRONG_CURRENT = "Test#2025"
LOCKED_USER = "osipov.k@school.ru"
LOCKED_USER_PASSWORD = "Osipov#2024"
WRONG_PASSWORD = "WrongPass123"
BLOCK_MESSAGE = "Учётная запись заблокирована из-за 5 неудачных попыток входа"


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


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


def wait_for_login_form(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
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


def assert_route(driver, route, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: current_path(d).rstrip("/").endswith(route)
        )
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
    return driver.execute_script("return window.crmApi.getSession();")


def get_user_password(driver, username):
    return driver.execute_script(
        "return window.crmApi.getDB().users.find("
        "u => u.username === arguments[0]).password;",
        username,
    )


def get_user_class_id(driver, username):
    return driver.execute_script(
        "return window.crmApi.getDB().users.find("
        "u => u.username === arguments[0]).classId;",
        username,
    )


def remove_session_and_open_login(driver):
    driver.execute_script(
        "window.localStorage.removeItem('classroom_crm_session');"
    )
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


def open_profile(driver):
    driver.get(app_url("profile/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "profile-password-form"))
    )


def logout_via_sidebar(driver):
    driver.find_element(By.ID, "btn-sidebar-logout").click()
    WebDriverWait(driver, 10).until(EC.alert_is_present()).accept()
    assert_route(driver, "/login")
    wait_for_login_form(driver)


def fill_password_form(driver, current, new, confirm):
    for field_id, value in (
        ("pwd-current", current),
        ("pwd-new", new),
        ("pwd-confirm", confirm),
    ):
        field = driver.find_element(By.ID, field_id)
        field.clear()
        field.send_keys(value)
    driver.find_element(By.ID, "btn-save-password").click()


def wait_password_feedback(driver, expected, timeout=10):
    def feedback_with_text(d):
        element = d.find_element(By.ID, "password-feedback")
        if not element.is_displayed():
            return False
        text = element.text.strip()
        if expected not in text:
            return False
        return text

    try:
        return WebDriverWait(driver, timeout).until(feedback_with_text)
    except TimeoutException:
        pytest.fail(
            f"Не появилось сообщение «{expected}», адрес: {current_path(driver)}"
        )


def test_auth_07_lockout_after_failed_attempts(driver):
    """Проверяет счётчик неудачных попыток и блокировку учётной записи."""
    reset_all(driver)

    for _ in range(4):
        submit_login(driver, LOCKED_USER, WRONG_PASSWORD)
        message = wait_login_error(driver)
        assert message == "Неверный логин или пароль", (
            f"Неожиданный текст ошибки: «{message}»"
        )

    submit_login(driver, LOCKED_USER, LOCKED_USER_PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/schedule")

    driver.find_element(By.ID, "btn-sidebar-logout").click()
    WebDriverWait(driver, 10).until(EC.alert_is_present()).accept()
    assert_route(driver, "/login")
    wait_for_login_form(driver)

    for _ in range(5):
        submit_login(driver, LOCKED_USER, WRONG_PASSWORD)
        blocked_message = wait_login_error(driver)

    assert BLOCK_MESSAGE in blocked_message, (
        f"Пятая неудачная попытка не заблокировала учётную запись: "
        f"«{blocked_message}»"
    )

    submit_login(driver, LOCKED_USER, LOCKED_USER_PASSWORD)
    after_block_message = wait_login_error(driver)
    assert BLOCK_MESSAGE in after_block_message, (
        f"Верный пароль принят у заблокированной учётной записи: "
        f"«{after_block_message}»"
    )
    assert "/login" in current_path(driver), (
        f"Заблокированный пользователь попал в кабинет: {current_path(driver)}"
    )
    assert get_session(driver) is None, "Создана сессия для заблокированной учётной записи"


def test_auth_10_change_password_success(driver):
    """Проверяет успешную смену пароля и сохранение сессии."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    open_profile(driver)
    fill_password_form(driver, PASSWORD, NEW_PASSWORD, NEW_PASSWORD)

    feedback = wait_password_feedback(driver, "Пароль успешно изменён")
    assert "Пароль успешно изменён" in feedback, (
        f"Неожиданное сообщение: «{feedback}»"
    )
    assert "/profile" in current_path(driver), (
        f"Сессия прервана, открылся {current_path(driver)}"
    )
    assert get_session(driver) is not None, "После смены пароля сессия пропала"

    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Смирнова М. В." in profile, f"Пропало ФИО пользователя: «{profile}»"
    assert "Классный руководитель" in profile, f"Пропала роль: «{profile}»"

    assert get_user_password(driver, TEACHER) == NEW_PASSWORD, (
        "Новый пароль не сохранён в учётной записи"
    )

    page_text = driver.find_element(By.ID, "app-content").text
    assert NEW_PASSWORD not in page_text, "Новый пароль показан открытым текстом"
    assert driver.find_element(By.ID, "pwd-new").get_attribute("value") == "", (
        "Поле нового пароля не очищено после сохранения"
    )

    logout_via_sidebar(driver)
    submit_login(driver, TEACHER, NEW_PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")
    restored_profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Смирнова М. В." in restored_profile, (
        f"Вход с новым паролем открыл не ту учётную запись: «{restored_profile}»"
    )
    assert "Классный руководитель" in restored_profile, (
        f"После входа с новым паролем пропала роль: «{restored_profile}»"
    )

    # Последующая проверка начинает с чистого localStorage, поэтому изменённый
    # пароль не влияет на независимые сценарии этой задачи.
    reset_all(driver)


def test_auth_11_change_password_wrong_current(driver):
    """Проверяет отказ при неверном текущем пароле."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")
    open_profile(driver)

    fill_password_form(driver, WRONG_CURRENT, NEW_PASSWORD, NEW_PASSWORD)

    feedback = wait_password_feedback(driver, "Текущий пароль указан неверно")
    assert "Текущий пароль указан неверно" in feedback, (
        f"Неожиданное сообщение: «{feedback}»"
    )
    assert get_session(driver) is not None, "Сессия прервана при ошибке пароля"
    assert get_user_password(driver, TEACHER) == PASSWORD, (
        "Пароль изменился, хотя текущий пароль указан неверно"
    )

    remove_session_and_open_login(driver)
    submit_login(driver, TEACHER, NEW_PASSWORD)
    new_password_message = wait_login_error(driver)
    assert new_password_message == "Неверный логин или пароль", (
        f"Новый пароль применён вопреки ошибке: «{new_password_message}»"
    )
    assert get_session(driver) is None, "Вход с неприменённым паролем создал сессию"

    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")


def test_auth_13_old_password_invalid(driver):
    """Проверяет, что после смены пароля старый пароль не работает."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    session = get_session(driver)
    result = driver.execute_script(
        "return window.crmApi.changePassword("
        "arguments[0], arguments[1], arguments[2], arguments[3]);",
        session["userId"],
        PASSWORD,
        NEW_PASSWORD,
        NEW_PASSWORD,
    )
    assert result["success"], f"Не удалось сменить пароль: {result}"
    assert get_user_password(driver, TEACHER) == NEW_PASSWORD, (
        "Новый пароль не сохранён перед проверкой"
    )

    remove_session_and_open_login(driver)
    submit_login(driver, TEACHER, PASSWORD)
    old_password_message = wait_login_error(driver)
    assert old_password_message == "Неверный логин или пароль", (
        f"Старый пароль продолжает работать: «{old_password_message}»"
    )
    assert get_session(driver) is None, "Старый пароль создал сессию"

    submit_login(driver, TEACHER, NEW_PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Смирнова М. В." in profile, f"Изменилось ФИО: «{profile}»"
    assert "Классный руководитель" in profile, f"Изменилась роль: «{profile}»"
    assert get_user_class_id(driver, TEACHER) == "class-7b", (
        "После смены пароля изменилась привязка к классу"
    )

    nav_titles = [
        link.text.strip()
        for link in driver.find_elements(By.CSS_SELECTOR, "#app-sidebar nav a[href]")
    ]
    expected_nav_titles = {
        "Обзор класса",
        "Ученики",
        "Журнал",
        "Посещаемость",
        "Расписание",
        "Родители",
        "Собрания",
        "Объявления",
        "Аналитика",
    }
    assert set(nav_titles) == expected_nav_titles, (
        "После смены пароля изменился состав доступных разделов: "
        f"{nav_titles}"
    )
