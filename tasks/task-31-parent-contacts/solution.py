import os

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
TEACHER = "smirnova@school.ru"
PARENT = "petrov@mail.ru"
STUDENT = "petrova.a@school.ru"
PASSWORD = "Test#2024"

LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")


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
    return f"{BASE_URL}/{path.lstrip('/')}" if path else f"{BASE_URL}/"


def normalized(text):
    return " ".join((text or "").split())


def text_of(element):
    return normalized(element.get_attribute("textContent") or element.text or "")


def wait_until(driver, condition, message, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(condition)
    except TimeoutException:
        pytest.fail(message)


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    driver.get(app_url("login/"))
    wait_until(driver, EC.visibility_of_element_located(LOGIN_FORM), "Не открылась форма входа")


def submit_login(driver, username):
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    wait_until(driver, EC.visibility_of_element_located(SIDEBAR), "После входа не открылось приложение")


def login(driver, username):
    reset_all(driver)
    submit_login(driver, username)


def switch_user(driver, username):
    driver.execute_script("window.localStorage.removeItem('classroom_crm_session');")
    driver.get(app_url("login/"))
    wait_until(driver, EC.visibility_of_element_located(LOGIN_FORM), "Не открылась форма повторного входа")
    submit_login(driver, username)


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def api(driver, expression):
    return driver.execute_script(f"return ({expression});")


def assert_success(result, message):
    assert result and result.get("success") is True, message


def open_student_summary(driver, student_id):
    driver.get(app_url(f"student/?id={student_id}&period=q1_2024"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "student-summary-view"),
        "Не открылась сводка ученика",
    )


def open_parent_summary(driver, parent_id):
    driver.get(app_url(f"parent/?id={parent_id}"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "parent-communication-history-list"),
        "Не открылась сводка родителя",
    )


def history_text(driver):
    return text_of(driver.find_element(By.ID, "parent-communication-history-list"))


def teacher_note(driver, student_id, text):
    result = api(
        driver,
        "window.crmApi.addStudentNote({"
        f'studentId: "{student_id}", '
        f'text: "{text}", '
        'date: "2024-10-28 10:00"'
        "})",
    )
    assert_success(result, "Педагогическая заметка не сохранена")


def test_bp_25_contact_linked_to_parent(driver):
    """Контакт хранит связь одновременно с учеником и родителем."""
    login(driver, TEACHER)
    result = api(
        driver,
        'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", '
        'channel: "phone", summary: "Обсудили пропуски, справку принесут после каникул", '
        'agreementReached: true, date: "2024-10-28", time: "10:00"})',
    )
    assert_success(result, "Контакт не сохранён")
    assert result["contact"]["parentId"] == "pr-27"
    assert result["contact"]["studentId"] == "st-14"

    open_student_summary(driver, "st-14")
    assert "Обсудили пропуски, справку принесут после каникул" in text_of(
        driver.find_element(By.ID, "parent-contacts-history-container")
    )

    open_parent_summary(driver, "pr-27")
    text = history_text(driver)
    assert "Обсудили пропуски, справку принесут после каникул" in text
    assert "Смирнова М. В." in text
    assert "Звонок" in text


def test_bp_26_contact_summary_required(driver):
    """Контакт не создаётся без итога или канала связи."""
    login(driver, TEACHER)
    before = len(read_db(driver).get("parentContacts", []))

    no_summary = api(
        driver,
        'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", '
        'channel: "phone", summary: ""})',
    )
    no_channel = api(
        driver,
        'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", '
        'channel: "", summary: "Итог разговора"})',
    )

    assert no_summary["success"] is False
    assert "Итог" in no_summary["error"]
    assert no_channel["success"] is False
    assert "канал" in no_channel["error"].lower()
    assert len(read_db(driver).get("parentContacts", [])) == before


def test_bp_27_note_not_contact(driver):
    """Педагогическая заметка не попадает в историю контактов."""
    login(driver, TEACHER)
    note = "Стал замкнут, нужна беседа с психологом"
    before = len(read_db(driver).get("parentContacts", []))
    teacher_note(driver, "st-14", note)

    db = read_db(driver)
    assert any(item.get("text") == note for item in db.get("notes", []))
    assert len(db.get("parentContacts", [])) == before

    open_student_summary(driver, "st-14")
    assert note in text_of(driver.find_element(By.ID, "student-notes-history-container"))
    assert note not in text_of(driver.find_element(By.ID, "parent-contacts-history-container"))


def test_bp_28_agreement_reached(driver):
    """Достигнутая договорённость не назначает повторный контакт."""
    login(driver, TEACHER)
    result = api(
        driver,
        'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", '
        'channel: "phone", summary: "Договорились о справке", agreementReached: true, '
        'nextContactDate: "2024-10-28", date: "2024-10-28"})',
    )
    assert_success(result, "Контакт не сохранён")
    assert result["contact"]["agreementReached"] is True
    assert result["contact"]["nextContactDate"] is None

    db = read_db(driver)
    db.setdefault("notes", []).append(
        {
            "id": "task31-agreement-note",
            "studentId": "st-14",
            "author": "Смирнова М. В.",
            "date": "2024-10-28 10:05",
            "text": "Работа с учеником завершена",
            "isPrivate": True,
        }
    )
    db.setdefault("parentContacts", []).append(
        {
            "id": "task31-agreement-reminder",
            "parentId": "pr-27",
            "studentId": "st-14",
            "author": "Смирнова М. В.",
            "date": "2024-10-28",
            "time": "10:00",
            "channel": "phone",
            "channelLabel": "Звонок",
            "summary": "Договорились о справке",
            "agreementReached": True,
            "nextContactDate": "2024-10-28",
        }
    )
    driver.execute_script(
        "window.localStorage.setItem('classroom_crm_db', JSON.stringify(arguments[0]));",
        db,
    )

    driver.get(app_url("overview/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.CSS_SELECTOR, "#app-content h1"),
        "Не открылся список внимания",
    )
    student_card = next(
        card
        for card in driver.find_elements(By.CSS_SELECTOR, ".risk-card")
        if "Сидоров Никита" in text_of(card)
    )
    assert "Обработан" in text_of(student_card)
    assert "повторный контакт" not in text_of(student_card).lower()


def test_bp_29_repeat_contact_reminder(driver):
    """Напоминание возвращает ученика в список внимания в назначенную дату."""
    login(driver, TEACHER)
    result = api(
        driver,
        'window.crmApi.addParentContact({parentId: "pr-27", studentId: "st-14", '
        'channel: "phone", summary: "Нужно повторно уточнить справку", agreementReached: false, '
        'nextContactDate: "2024-10-28", date: "2024-10-27"})',
    )
    assert_success(result, "Контакт с напоминанием не сохранён")
    assert result["contact"]["nextContactDate"] == "2024-10-28"
    saved_contact = next(
        item
        for item in read_db(driver).get("parentContacts", [])
        if item.get("id") == result["contact"]["id"]
    )
    assert saved_contact["nextContactDate"] == "2024-10-28"

    driver.get(app_url("overview/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.CSS_SELECTOR, "#app-content h1"),
        "Не открылся список внимания",
    )
    student_card = next(
        card
        for card in driver.find_elements(By.CSS_SELECTOR, ".risk-card")
        if "Сидоров Никита" in text_of(card)
    )
    assert "Обработан" not in text_of(student_card)
    assert saved_contact["studentId"] == "st-14"


def test_bp_30_notes_private(driver):
    """Педагогические заметки не выводятся во внешних кабинетах."""
    login(driver, TEACHER)
    note = "Внутренняя заметка классного руководителя"
    teacher_note(driver, "st-23", note)

    switch_user(driver, PARENT)
    driver.get(app_url("student/?id=st-23&period=q1_2024"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "student-summary-view")
        or "Доступ ограничен" in text_of(d.find_element(By.TAG_NAME, "body")),
        "Не обработано ограничение доступа к сводке ученика",
    )
    parent_text = text_of(driver.find_element(By.TAG_NAME, "body"))
    assert note not in parent_text
    assert "Заметки классного руководителя" not in parent_text

    switch_user(driver, STUDENT)
    driver.get(app_url("grades/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "grades-view-container"),
        "Не открылась страница оценок ученика",
    )
    student_text = text_of(driver.find_element(By.ID, "grades-view-container"))
    assert note not in student_text
    assert "Заметки классного руководителя" not in student_text
    assert "Оценки" in student_text or "Успеваемость" in student_text
