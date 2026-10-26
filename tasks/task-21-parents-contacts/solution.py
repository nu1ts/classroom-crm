import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.common.exceptions import TimeoutException

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
HOMEROOM_TEACHER = "smirnova@school.ru"
SUBJECT_TEACHER = "kozlov@school.ru"
PARENT_USER = "petrov@mail.ru"
STUDENT_USER = "petrova.a@school.ru"
PASSWORD = "Test#2024"

LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")

PARENTS_SUBTITLE = (By.ID, "parents-total-subtitle")
PARENTS_TABLE = (By.CSS_SELECTOR, "table")
PARENTS_COUNT = (By.ID, "parents-count-summary")
PARENTS_SEARCH = (By.ID, "input-parents-search")
PARENTS_FILTER = (By.ID, "select-parents-filter")
PARENTS_RESET = (By.ID, "btn-reset-parents-filters")
PARENTS_ROWS = (By.CSS_SELECTOR, "tr[data-parent-id]")
PARENTS_TOAST_MESSAGE = (By.ID, "parents-toast-message")

ADD_MODAL = (By.ID, "modal-add-parent")
ADD_PHONE_ERROR = (By.ID, "add-parent-phone-error")
EDIT_MODAL = (By.ID, "modal-edit-parent")
LINK_MODAL = (By.ID, "modal-link-parent")

SUMMARY_RECORD_BUTTON = (By.ID, "btn-card-record-contact")
SUMMARY_UNLINK_BUTTON = (By.ID, "btn-card-unlink-student")
CONTACT_MODAL = (By.ID, "modal-record-parent-contact")
CONTACT_CHANNEL_ERROR = (By.ID, "contact-channel-error")
CONTACT_SUMMARY_ERROR = (By.ID, "contact-summary-error")
UNLINK_MODAL = (By.ID, "modal-card-unlink-student")
HISTORY_LIST = (By.ID, "parent-communication-history-list")


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


def normalized(text):
    return " ".join((text or "").split())


def text_of(element):
    return normalized(
        element.get_attribute("textContent") or element.text or ""
    )


def wait_until(driver, condition, message, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(condition)
    except TimeoutException:
        pytest.fail(message)


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(LOGIN_FORM)
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
        EC.visibility_of_element_located(SIDEBAR)
    )


def login(driver, username, password=PASSWORD):
    reset_all(driver)
    submit_login(driver, username, password)
    wait_for_app(driver)


def switch_user(driver, username, password=PASSWORD):
    driver.execute_script(
        "window.localStorage.removeItem('classroom_crm_session');"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(LOGIN_FORM)
    )
    submit_login(driver, username, password)
    wait_for_app(driver)


def wait_body(driver, *parts, timeout=10):
    def check(d):
        body = text_of(d.find_element(By.TAG_NAME, "body"))
        return all(part in body for part in parts)

    wait_until(driver, check, f"На странице нет текста: {', '.join(parts)}", timeout)
    return text_of(driver.find_element(By.TAG_NAME, "body"))


def body_text(driver):
    return text_of(driver.find_element(By.TAG_NAME, "body"))


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def wait_db(driver, predicate, message, timeout=10):
    def check(d):
        db = read_db(d)
        if not db:
            return False
        return predicate(db) or False

    return wait_until(driver, check, message, timeout)


def set_field(driver, element_id, value):
    element = driver.find_element(By.ID, element_id)
    driver.execute_script(
        "const el = arguments[0];"
        "const proto = el.tagName === 'TEXTAREA'"
        "  ? window.HTMLTextAreaElement.prototype"
        "  : window.HTMLInputElement.prototype;"
        "const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;"
        "setter.call(el, arguments[1]);"
        "el.dispatchEvent(new Event('input', { bubbles: true }));",
        element,
        value,
    )


def select_value(driver, element_id, value):
    Select(driver.find_element(By.ID, element_id)).select_by_value(value)


def click_js(driver, element):
    driver.execute_script(
        "arguments[0].scrollIntoView({ block: 'center' });", element
    )
    driver.execute_script("arguments[0].click();", element)


def wait_modal(driver, locator, opened=True, timeout=10):
    element_id = locator[1]

    def check(d):
        classes = d.find_element(By.ID, element_id).get_attribute("class") or ""
        if opened:
            return "opacity-100" in classes
        return "opacity-0" in classes

    state = "открылось" if opened else "закрылось"
    wait_until(driver, check, f"Модальное окно не {state}: {element_id}", timeout)


def open_parents(driver, query=""):
    path = "parents/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    wait_until(
        driver,
        lambda d: d.find_elements(*PARENTS_SUBTITLE),
        "Не открылась страница «Родители»",
    )


def open_parent_summary(driver, parent_id):
    driver.get(app_url(f"parent/?id={parent_id}"))
    wait_until(
        driver,
        lambda d: d.find_elements(*SUMMARY_RECORD_BUTTON),
        f"Не открылась сводка родителя {parent_id}",
    )


def open_student_summary(driver, student_id):
    driver.get(app_url(f"student/?id={student_id}&period=q1_2024"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.CSS_SELECTOR, "#app-content h1"),
        f"Не открылась сводка ученика {student_id}",
    )


def parent_rows(driver):
    return driver.find_elements(*PARENTS_ROWS)


def wait_parent_rows(driver, count, contains=None, timeout=10):
    def check(d):
        rows = parent_rows(d)
        if len(rows) != count:
            return False
        if contains:
            text = " ".join(text_of(row) for row in rows)
            return all(value in text for value in contains)
        return True

    message = f"В списке родителей не {count} строк"
    if contains:
        message += f" с текстом {', '.join(contains)}"
    wait_until(driver, check, message, timeout)


def find_row_by_text(driver, value):
    for row in parent_rows(driver):
        if value in text_of(row):
            return row
    pytest.fail(f"Не найдена строка родителя со значением: {value}")


def open_row_action(driver, row, action_class):
    parent_id = row.get_attribute("data-parent-id")
    click_js(driver, row.find_element(By.CSS_SELECTOR, ".btn-parent-actions"))
    action = driver.find_element(
        By.CSS_SELECTOR, f"#menu-parent-{parent_id} .{action_class}"
    )
    click_js(driver, action)


def submit_form(driver, form_id):
    click_js(
        driver,
        driver.find_element(
            By.CSS_SELECTOR, f"#{form_id} button[type='submit']"
        ),
    )


def wait_element_visible(driver, element_id, message, timeout=10):
    wait_until(
        driver,
        lambda d: "hidden"
        not in (
            d.find_element(By.ID, element_id).get_attribute("class") or ""
        ),
        message,
        timeout,
    )


def wait_toast(driver, message, timeout=10):
    def check(d):
        text = text_of(d.find_element(*PARENTS_TOAST_MESSAGE))
        return message in text

    wait_until(driver, check, f"Нет уведомления: «{message}»", timeout)


def parent_block(driver, heading):
    return driver.find_element(
        By.XPATH,
        f"//h3[contains(., '{heading}')]"
        "/ancestor::div[contains(@class, 'rounded-3xl')][1]",
    )


def contacts_block(driver):
    return driver.find_element(
        By.XPATH,
        "//h3[contains(., 'Контакты родителей')]"
        "/ancestor::div[contains(@class, 'space-y-4')][1]",
    )


def history_items(driver):
    return driver.find_elements(
        By.CSS_SELECTOR, "#parent-communication-history-list > div"
    )


def wait_history_first(driver, *parts, timeout=10):
    def check(d):
        items = history_items(d)
        if not items:
            return False
        text = text_of(items[0])
        return all(part in text for part in parts)

    wait_until(
        driver,
        check,
        f"Первая запись истории не содержит: {', '.join(parts)}",
        timeout,
    )


def primary_relations(db, student_id):
    return [
        relation
        for relation in db.get("parentStudentRelations", [])
        if relation.get("studentId") == student_id
        and relation.get("isPrimary")
    ]



def api(driver, expression):
    return driver.execute_script(f"return ({expression});")


def assert_success(result, message):
    assert result and result.get("success") is True, message


def test_pr_13_summary_read_only(driver):
    """Проверить режим только для чтения в сводке родителя."""
    login(driver, HOMEROOM_TEACHER)
    open_parent_summary(driver, "pr-27")
    assert "Анкетные данные — только чтение в сводке" in body_text(driver)
    assert not driver.find_elements(By.ID, "edit-parent-phone")


def test_pr_14_summary_all_children(driver):
    """Проверить отображение детей родителя из разных классов."""
    login(driver, HOMEROOM_TEACHER)
    open_parent_summary(driver, "pr-10")
    children = text_of(parent_block(driver, "Связанные ученики"))
    assert "Котов Максим" in children
    assert "Котова Дарья" in children
    assert "9В класс" in children


def test_pr_15_contact_agreement(driver):
    """Проверить сохранение отметки о достигнутой договорённости."""
    login(driver, HOMEROOM_TEACHER)
    result = api(driver, 'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", channel: "phone", summary: "Договорились", agreementReached: true, date: "2024-10-28"})')
    assert_success(result, "Контакт не сохранён")
    assert result["contact"]["agreementReached"] is True
    assert any(c.get("summary") == "Договорились" and c.get("agreementReached") is True for c in read_db(driver)["parentContacts"])


def test_pr_16_contact_required_fields(driver):
    """Проверить обязательность канала и итога контакта."""
    login(driver, HOMEROOM_TEACHER)
    no_channel = api(driver, 'window.crmApi.addParentContact({parentId: "pr-27", summary: "Итог"})')
    no_summary = api(driver, 'window.crmApi.addParentContact({parentId: "pr-27", channel: "phone", summary: ""})')
    assert no_channel["success"] is False and "канал" in no_channel["error"].lower()
    assert no_summary["success"] is False and "Итог" in no_summary["error"]


def test_pr_17_contact_without_student(driver):
    """Проверить общий контакт без привязки к ученику."""
    login(driver, HOMEROOM_TEACHER)
    result = api(driver, 'window.crmApi.addParentContact({parentId: "pr-10", channel: "chat", summary: "Общий контакт", agreementReached: false, date: "2024-10-28"})')
    assert_success(result, "Общий контакт не сохранён")
    assert result["contact"]["studentId"] is None
    contact = next(c for c in read_db(driver)["parentContacts"] if c.get("summary") == "Общий контакт")
    assert contact["parentId"] == "pr-10" and contact["studentId"] is None


def test_pr_18_history_order(driver):
    """Проверить обратный хронологический порядок истории общения."""
    login(driver, HOMEROOM_TEACHER)
    open_parent_summary(driver, "pr-27")
    items = history_items(driver)
    assert len(items) >= 2
    assert "26.10.2024" in text_of(items[0])
    assert "18.10.2024" in text_of(items[1])


def test_pr_19_parents_route_denied(driver):
    """Проверить запрет маршрута базы родителей для родителя."""
    login(driver, PARENT_USER)
    driver.get(app_url("parents/"))
    wait_body(driver, "Доступ ограничен")
    assert "Родители 7Б" not in body_text(driver)


def test_pr_20_history_hidden_from_parent(driver):
    """Проверить скрытие истории общения и заметок от родителя."""
    login(driver, PARENT_USER)
    driver.get(app_url("child/"))
    wait_until(driver, lambda d: d.find_elements(By.ID, "child-view-container"), "Не открылась страница ребёнка")
    text = body_text(driver)
    assert "История общения с родителями" not in text
    assert "Заметки классрука" not in text
