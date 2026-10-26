import os
import re

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
ADMIN = "admin@school.ru"
PARENT = "petrov@mail.ru"
STUDENT = "osipov.k@school.ru"
PASSWORD = "Test#2024"
STUDENT_PASSWORD = "Osipov#2024"
PERMANENT_PASSWORD = "Postoyan#2025"

SHORT_PASSWORD = "Abcdef1"
WEAK_PASSWORD = "abcdefgh"
BOUNDARY_PASSWORD = "Abcdef12"
MISMATCH_PASSWORD = "Qwerty12"
MISMATCH_CONFIRM = "Qwerty13"

BLOCK_MESSAGE = "Учётная запись заблокирована"


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
        pytest.fail(f"Ожидался раздел {route}, открылся {current_path(driver)}")


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


def get_user_field(driver, username, field):
    return driver.execute_script(
        "return window.crmApi.getDB().users.find("
        "u => u.username === arguments[0])[arguments[1]];",
        username,
        field,
    )


def logout_via_sidebar(driver):
    driver.find_element(By.ID, "btn-sidebar-logout").click()
    WebDriverWait(driver, 10).until(EC.alert_is_present()).accept()
    assert_route(driver, "/login")
    wait_for_login_form(driver)


def open_login_page(driver):
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


def sidebar_nav_titles(driver):
    links = driver.find_elements(By.CSS_SELECTOR, "#app-sidebar nav a[href]")
    return [link.text.strip() for link in links]


def wait_for_content(driver, expected, timeout=10):
    def content_with_text(d):
        content = d.find_element(By.ID, "app-content")
        text = content.text.strip()
        return text if expected in text else False

    try:
        return WebDriverWait(driver, timeout).until(content_with_text)
    except TimeoutException:
        pytest.fail(
            f"На странице нет текста «{expected}», адрес: {current_path(driver)}"
        )


def wait_for_forbidden(driver, timeout=10):
    return wait_for_content(driver, "Доступ ограничен", timeout)


def open_accounts(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "accounts-view"))
    )
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-account-row="user-osipov"]')
        )
    )


def account_status_text(driver):
    row = driver.find_element(
        By.CSS_SELECTOR, '[data-account-row="user-osipov"]'
    )
    return row.find_element(By.CSS_SELECTOR, "td:nth-child(4)").text.strip()


def toggle_osipov_status(driver, expected_status, timeout=10):
    row = driver.find_element(
        By.CSS_SELECTOR, '[data-account-row="user-osipov"]'
    )
    row.find_element(By.CSS_SELECTOR, '[data-action="toggle-status"]').click()

    def status_applied(d):
        return expected_status in account_status_text(d)

    try:
        WebDriverWait(driver, timeout).until(status_applied)
    except TimeoutException:
        pytest.fail(
            f"Статус учётной записи не стал «{expected_status}»: "
            f"«{account_status_text(driver)}»"
        )


def open_profile(driver):
    driver.get(app_url("profile/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "profile-password-form"))
    )


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
        return text if expected in text else False

    try:
        return WebDriverWait(driver, timeout).until(feedback_with_text)
    except TimeoutException:
        text = driver.find_element(By.ID, "password-feedback").text.strip()
        pytest.fail(f"Ожидалось сообщение «{expected}», получено «{text}»")


def wait_for_modal_state(driver, modal_id, state, timeout=10):
    def state_applied(d):
        classes = d.find_element(By.ID, modal_id).get_attribute("class") or ""
        return state in classes.split()

    WebDriverWait(driver, timeout).until(state_applied)


def test_auth_09_switch_user_role_context(driver):
    """Проверяет пересчёт роли и доступных разделов после смены пользователя."""
    reset_all(driver)

    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")

    driver.find_element(By.ID, "nav-students").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "students-table-wrapper"))
    )
    students_text = driver.find_element(By.ID, "students-table-wrapper").text
    assert "28 учеников 7Б класса" in students_text, (
        f"Не найден список 28 учеников: «{students_text[:200]}»"
    )

    driver.find_element(By.ID, "nav-analytics").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "analytics-view"))
    )
    analytics_text = driver.find_element(By.ID, "analytics-view").text
    assert "Аналитика класса" in analytics_text, "Не открылась аналитика класса"
    assert "28 учеников 7Б класса" in analytics_text, (
        "В аналитике нет данных о 28 учениках"
    )

    logout_via_sidebar(driver)

    submit_login(driver, PARENT, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/child")

    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Петров С. В." in profile, f"Открыт не тот пользователь: «{profile}»"
    assert "Родитель" in profile, f"Не пересчитана роль пользователя: «{profile}»"

    nav_titles = sidebar_nav_titles(driver)
    assert set(nav_titles) == {"Ребёнок", "Расписание", "Объявления"}, (
        f"Родителю доступны лишние разделы: {nav_titles}"
    )
    for link_id in ("nav-analytics", "nav-students", "nav-overview"):
        assert not driver.find_elements(By.ID, link_id), (
            f"Родителю показан раздел классного руководителя: {link_id}"
        )

    child_text = driver.find_element(By.ID, "app-content").text
    assert "Петрова Анна" in child_text, (
        f"Не открылась карточка ребёнка: «{child_text[:200]}»"
    )

    for route in ("analytics/", "students/"):
        driver.get(app_url(route))
        forbidden_text = wait_for_forbidden(driver)
        assert "Аналитика класса" not in forbidden_text, (
            f"По адресу {route} показана аналитика классного руководителя"
        )
        assert "28 учеников" not in forbidden_text, (
            f"По адресу {route} показан список учеников классного руководителя"
        )
        assert set(sidebar_nav_titles(driver)) == {
            "Ребёнок",
            "Расписание",
            "Объявления",
        }, "После прямого адреса вернулись разделы классного руководителя"

    driver.back()
    wait_for_forbidden(driver)
    back_text = driver.find_element(By.ID, "app-content").text
    assert "Аналитика класса" not in back_text, (
        "Кнопка «назад» вернула данные классного руководителя"
    )

    session = get_session(driver)
    assert session is not None, "Сессия родителя пропала"
    assert session.get("username") == PARENT, (
        f"Активна сессия другого пользователя: {session}"
    )
    assert session.get("role") == "parent", (
        f"Роль в сессии не пересчитана: {session}"
    )


def test_auth_12_new_password_policy(driver):
    """Проверяет требования к длине, составу и подтверждению нового пароля."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/overview")
    open_profile(driver)

    fill_password_form(driver, PASSWORD, SHORT_PASSWORD, SHORT_PASSWORD)
    short_message = wait_password_feedback(driver, "не менее 8 символов")
    assert "не менее 8 символов" in short_message, (
        f"Не указано требование к длине: «{short_message}»"
    )
    assert get_user_password(driver, TEACHER) == PASSWORD, (
        "Пароль из 7 символов изменил учётную запись"
    )

    fill_password_form(driver, PASSWORD, WEAK_PASSWORD, WEAK_PASSWORD)
    weak_message = wait_password_feedback(driver, "регистрах")
    assert "регистрах" in weak_message and "цифру" in weak_message, (
        f"Не указано требование к составу: «{weak_message}»"
    )
    assert get_user_password(driver, TEACHER) == PASSWORD, (
        "Пароль без цифры и верхнего регистра изменил учётную запись"
    )

    fill_password_form(driver, PASSWORD, BOUNDARY_PASSWORD, BOUNDARY_PASSWORD)
    success_message = wait_password_feedback(driver, "Пароль успешно изменён")
    assert "Пароль успешно изменён" in success_message, (
        f"Граничный пароль не принят: «{success_message}»"
    )
    assert get_user_password(driver, TEACHER) == BOUNDARY_PASSWORD, (
        "Граничный пароль не сохранён в учётной записи"
    )
    assert get_session(driver) is not None, "После смены пароля пропала сессия"

    fill_password_form(
        driver, BOUNDARY_PASSWORD, MISMATCH_PASSWORD, MISMATCH_CONFIRM
    )
    mismatch_message = wait_password_feedback(driver, "Пароли не совпадают")
    assert "Пароли не совпадают" in mismatch_message, (
        f"Несовпадение повтора не отклонено: «{mismatch_message}»"
    )
    assert get_user_password(driver, TEACHER) == BOUNDARY_PASSWORD, (
        "При несовпадении повтора пароль всё равно изменился"
    )
    assert "/profile" in current_path(driver), (
        f"При ошибке пароля открылся другой раздел: {current_path(driver)}"
    )


def test_auth_14_blocked_account_rejected(driver):
    """Проверяет блокировку и разблокировку учётной записи администратором."""
    reset_all(driver)

    submit_login(driver, ADMIN, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/accounts")
    open_accounts(driver)
    assert "Активен" in account_status_text(driver), (
        "Тестовая учётная запись должна быть активна"
    )

    toggle_osipov_status(driver, "Заблокирован")
    assert get_user_field(driver, STUDENT, "status") == "blocked", (
        "Блокировка не сохранена в учётной записи"
    )

    logout_via_sidebar(driver)
    open_login_page(driver)

    submit_login(driver, STUDENT, STUDENT_PASSWORD)
    blocked_message = wait_login_error(driver)
    assert BLOCK_MESSAGE in blocked_message, (
        f"Заблокированная учётная запись не отклонена: «{blocked_message}»"
    )
    assert "Неверный логин или пароль" not in blocked_message, (
        "Сообщение не объясняет блокировку, а маскирует её под неверный пароль"
    )
    assert "администратору" in blocked_message.lower(), (
        f"Нет указания обратиться к администратору: «{blocked_message}»"
    )
    assert driver.find_element(By.ID, "login-password").get_attribute("value") == "", (
        "Поле пароля сохранило введённое значение"
    )
    assert get_session(driver) is None, "Заблокированный пользователь получил сессию"
    assert_route(driver, "/login")

    submit_login(driver, ADMIN, PASSWORD)
    wait_for_app(driver)
    open_accounts(driver)
    toggle_osipov_status(driver, "Активен")
    assert get_user_field(driver, STUDENT, "status") == "active", (
        "Разблокировка не сохранена в учётной записи"
    )

    logout_via_sidebar(driver)
    open_login_page(driver)

    submit_login(driver, STUDENT, STUDENT_PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/schedule")

    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Осипов К." in profile, f"Открыт не тот пользователь: «{profile}»"
    assert "Ученик" in profile, f"Изменилась роль пользователя: «{profile}»"

    session = get_session(driver)
    assert session is not None, "После разблокировки не создана сессия"
    assert session.get("role") == "student", f"Неверная роль в сессии: {session}"


def test_auth_15_self_reset_unavailable(driver):
    """Проверяет отсутствие самостоятельного сброса и сброс через администратора."""
    reset_all(driver)

    driver.find_element(By.ID, "btn-forgot-password").click()
    wait_for_modal_state(driver, "modal-forgot-password", "opacity-100")

    modal = driver.find_element(By.ID, "modal-forgot-password")
    dialog_text = driver.find_element(By.ID, "modal-forgot-dialog").text
    assert "Самостоятельный сброс пароля недоступен" in dialog_text, (
        f"Нет пояснения о порядке восстановления: «{dialog_text}»"
    )
    assert "admin@school.ru" in dialog_text, (
        "Не указаны контакты администратора для сброса пароля"
    )
    assert not modal.find_elements(By.CSS_SELECTOR, "input, textarea, select, form"), (
        "Открылась форма самостоятельного сброса пароля"
    )
    assert "Отправить письмо" not in dialog_text, (
        "Ссылка предлагает отправку письма для сброса пароля"
    )

    driver.find_element(By.ID, "btn-close-modal-forgot").click()
    wait_for_modal_state(driver, "modal-forgot-password", "opacity-0")

    submit_login(driver, ADMIN, PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/accounts")
    open_accounts(driver)

    driver.find_element(
        By.CSS_SELECTOR,
        '[data-account-row="user-osipov"] [data-action="edit-account"]',
    ).click()
    wait_for_modal_state(driver, "modal-edit-account", "opacity-100")
    driver.find_element(By.ID, "btn-reset-account-password").click()

    def reset_result_text(d):
        element = d.find_element(By.ID, "reset-password-result")
        if not element.is_displayed():
            return False
        text = element.text.strip()
        return text if "Временный пароль:" in text else False

    result_text = WebDriverWait(driver, 10).until(reset_result_text)
    match = re.search(r"Temp#\d+", result_text)
    assert match, f"Не удалось прочитать временный пароль: «{result_text}»"
    temp_password = match.group(0)

    driver.find_element(
        By.CSS_SELECTOR,
        '#modal-edit-account [data-action="close-edit-modal"]',
    ).click()
    wait_for_modal_state(driver, "modal-edit-account", "opacity-0")
    logout_via_sidebar(driver)
    open_login_page(driver)

    submit_login(driver, STUDENT, temp_password)
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "change-password-form"))
    )
    assert_route(driver, "/change-password")
    assert "Смена временного пароля" in driver.find_element(
        By.ID, "app-content"
    ).text, "Система не требует сменить временный пароль"

    for field_id, value in (
        ("cp-current", temp_password),
        ("cp-new", PERMANENT_PASSWORD),
        ("cp-confirm", PERMANENT_PASSWORD),
    ):
        field = driver.find_element(By.ID, field_id)
        field.clear()
        field.send_keys(value)
    driver.find_element(By.ID, "btn-cp-submit").click()

    assert_route(driver, "/schedule")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "schedule-week-title"))
    )
    assert get_user_password(driver, STUDENT) == PERMANENT_PASSWORD, (
        "Постоянный пароль не сохранён"
    )
    assert get_user_field(driver, STUDENT, "mustChangePassword") is False, (
        "Флаг обязательной смены пароля не снят"
    )

    logout_via_sidebar(driver)
    open_login_page(driver)

    submit_login(driver, STUDENT, temp_password)
    temp_message = wait_login_error(driver)
    assert temp_message == "Неверный логин или пароль", (
        f"Временный пароль продолжает работать: «{temp_message}»"
    )
    assert get_session(driver) is None, "Временный пароль создал сессию"

    submit_login(driver, STUDENT, PERMANENT_PASSWORD)
    wait_for_app(driver)
    assert_route(driver, "/schedule")
    profile = driver.find_element(By.ID, "sidebar-profile-link").text
    assert "Осипов К." in profile, f"Открыт не тот пользователь: «{profile}»"
