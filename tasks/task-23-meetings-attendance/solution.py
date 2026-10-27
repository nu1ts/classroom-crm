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
PARENT_USER = "petrov@mail.ru"
PASSWORD = "Test#2024"
PAST_MEETING_ID = "mtg-past-01"
FUTURE_MEETING_ID = "mtg-01"


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
    return normalized(element.get_attribute("textContent") or element.text or "")


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
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def login(driver, username, password=PASSWORD):
    reset_all(driver)
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(password)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_meetings(driver):
    driver.get(app_url("meetings/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "meetings-view"),
        "Не открылся раздел «Собрания»",
    )


def modal_is_open(driver, modal_id):
    classes = driver.find_element(By.ID, modal_id).get_attribute("class") or ""
    return "opacity-100" in classes and "pointer-events-none" not in classes


def wait_modal(driver, modal_id, opened=True):
    state = "открылось" if opened else "закрылось"
    wait_until(
        driver,
        lambda d: modal_is_open(d, modal_id) is opened,
        f"Модальное окно {modal_id} не {state}",
    )


def meeting_row(driver, meeting_id):
    rows = driver.find_elements(
        By.CSS_SELECTOR, f".past-meeting-row[data-meeting-id='{meeting_id}']"
    )
    if not rows:
        pytest.fail(f"Не найдена строка прошедшего собрания {meeting_id}")
    return rows[0]


def open_attendance(driver, meeting_id=PAST_MEETING_ID):
    row = meeting_row(driver, meeting_id)
    button = row.find_element(By.CSS_SELECTOR, ".btn-mark-attendance")
    driver.execute_script("arguments[0].click();", button)
    wait_modal(driver, "modal-meeting-attendance")


def attendance_rows(driver):
    return driver.find_elements(By.CSS_SELECTOR, "#attendance-table-body tr")


def attendance_row(driver, parent_name):
    for row in attendance_rows(driver):
        if parent_name in text_of(row):
            return row
    pytest.fail(f"В форме явки не найдена строка: {parent_name}")


def set_attendance(driver, parent_name, status, note=""):
    row = attendance_row(driver, parent_name)
    Select(row.find_element(By.CSS_SELECTOR, ".attendance-status-select")).select_by_value(
        status
    )
    note_input = row.find_element(By.CSS_SELECTOR, ".attendance-note-input")
    if not note_input.get_attribute("disabled"):
        note_input.clear()
        note_input.send_keys(note)


def save_attendance(driver, should_close=True):
    driver.find_element(By.ID, "btn-save-attendance").click()
    if should_close:
        wait_modal(driver, "modal-meeting-attendance", opened=False)


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def attendance_record(driver, student_id):
    db = read_db(driver) or {}
    records = [
        record
        for record in db.get("meetingAttendance", [])
        if record.get("meetingId") == PAST_MEETING_ID
        and record.get("studentId") == student_id
    ]
    return records[0] if records else None


def open_summary(driver):
    row = meeting_row(driver, PAST_MEETING_ID)
    button = row.find_element(By.CSS_SELECTOR, ".btn-meeting-summary")
    driver.execute_script("arguments[0].click();", button)
    wait_modal(driver, "modal-meeting-summary")


def close_summary(driver):
    driver.find_element(
        By.CSS_SELECTOR, "#modal-meeting-summary .btn-close-modal"
    ).click()
    wait_modal(driver, "modal-meeting-summary", opened=False)


def summary_ratio(driver):
    return normalized(driver.find_element(By.ID, "summary-ratio-text").text)


def set_all_present(driver):
    for row in attendance_rows(driver):
        Select(row.find_element(By.CSS_SELECTOR, ".attendance-status-select")).select_by_value(
            "present"
        )


def test_mg_07_attendance_values(driver):
    """Допустимые значения явки сохраняются отдельно для каждой семьи."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    open_attendance(driver)

    assert len(attendance_rows(driver)) == 28
    labels = [
        option.text
        for option in Select(
            attendance_row(driver, "Александрова И. А.").find_element(
                By.CSS_SELECTOR, ".attendance-status-select"
            )
        ).options
    ]
    assert labels == ["Пришёл", "Не пришёл", "Уважительная причина"]
    assert "Да" not in labels and "Нет" not in labels and "Не ответил" not in labels

    set_attendance(driver, "Александрова И. А.", "present")
    set_attendance(driver, "Котова Е. П.", "absent", "Работает допоздна")
    set_attendance(driver, "Сидорова О. Н.", "excused", "Не выходит на связь")
    save_attendance(driver)
    open_attendance(driver)

    kotova = attendance_row(driver, "Котова Е. П.")
    sidorova = attendance_row(driver, "Сидорова О. Н.")
    assert Select(kotova.find_element(By.CSS_SELECTOR, ".attendance-status-select")).first_selected_option.get_attribute("value") == "absent"
    assert kotova.find_element(By.CSS_SELECTOR, ".attendance-note-input").get_attribute("value") == "Работает допоздна"
    assert Select(sidorova.find_element(By.CSS_SELECTOR, ".attendance-status-select")).first_selected_option.get_attribute("value") == "excused"
    assert sidorova.find_element(By.CSS_SELECTOR, ".attendance-note-input").get_attribute("value") == "Не выходит на связь"
    counter = normalized(driver.find_element(By.ID, "attendance-present-count").text)
    assert counter.isdigit() and 0 <= int(counter) <= 28


def test_mg_08_absence_reason_required(driver):
    """Причина обязательна только при неявке."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    open_attendance(driver)

    set_attendance(driver, "Петров С. В.", "excused")
    save_attendance(driver, should_close=False)
    petrova = attendance_row(driver, "Петров С. В.")
    error = petrova.find_element(By.CSS_SELECTOR, ".attendance-note-error")
    assert "Причина неявки обязательна" in text_of(error)
    assert "border-rose-400" in (
        petrova.find_element(By.CSS_SELECTOR, ".attendance-note-input").get_attribute("class")
        or ""
    )

    set_attendance(driver, "Петров С. В.", "excused", "Болезнь ребёнка")
    save_attendance(driver)
    assert attendance_record(driver, "st-24")["note"] == "Болезнь ребёнка"

    open_attendance(driver)
    set_attendance(driver, "Петров С. В.", "present")
    save_attendance(driver)
    record = attendance_record(driver, "st-24")
    assert record["status"] == "present"
    assert record["note"] == "Болезнь ребёнка"


def test_mg_09_future_attendance_blocked(driver):
    """Будущему собранию нельзя присвоить отметки через UI или API."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    assert not driver.find_elements(
        By.CSS_SELECTOR, f"[data-meeting-id='{FUTURE_MEETING_ID}'] .btn-mark-attendance"
    )

    result = driver.execute_script(
        "return window.crmApi.saveMeetingAttendance(arguments[0], [{"
        "studentId: 'st-01', status: 'present', note: ''}]);",
        FUTURE_MEETING_ID,
    )
    assert result.get("success") is False
    assert "нельзя" in result.get("message", "").lower()
    db = read_db(driver) or {}
    assert not any(
        item.get("meetingId") == FUTURE_MEETING_ID
        for item in db.get("meetingAttendance", [])
    )


def test_mg_10_summary_realtime(driver):
    """Итоги пересчитываются из текущих строк явки без кэша."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    open_summary(driver)
    assert summary_ratio(driver) == "24 из 28"
    close_summary(driver)

    open_attendance(driver)
    set_attendance(driver, "Александрова И. А.", "absent", "Срочная работа")
    save_attendance(driver)
    open_summary(driver)
    assert summary_ratio(driver) == "23 из 28"
    absent_text = text_of(driver.find_element(By.ID, "summary-absent-list"))
    assert "Александрова И. А." in absent_text and "Срочная работа" in absent_text
    close_summary(driver)

    open_attendance(driver)
    set_attendance(driver, "Александрова И. А.", "present")
    save_attendance(driver)
    open_summary(driver)
    assert summary_ratio(driver) == "24 из 28"


def test_mg_11_parent_meetings(driver):
    """Родитель видит приглашения, но не явку и итоги других семей."""
    login(driver, PARENT_USER)
    driver.get(app_url("child/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "child-meetings-section"),
        "В профиле ребёнка не появился раздел «Собрания класса»",
    )
    section = driver.find_element(By.ID, "child-meetings-section")
    section_text = text_of(section)
    assert "Итоги первой четверти 7Б" in section_text
    assert "31 октября 2024 г." in section_text and "Каб. 302" in section_text
    assert "Повестка:" in section_text
    assert "Организационное собрание начала года" in section_text
    assert "Явка:" not in section_text
    assert not driver.find_elements(By.CSS_SELECTOR, ".btn-mark-attendance")
    assert not driver.find_elements(By.CSS_SELECTOR, ".btn-meeting-summary")
    assert not driver.find_elements(By.CSS_SELECTOR, ".meeting-attendance-badge")


def test_mg_13_all_present_counter(driver):
    """Все 28 пустых примечаний при «Пришёл» сохраняются без потери строк."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    open_attendance(driver)
    set_all_present(driver)
    save_attendance(driver)
    db = read_db(driver) or {}
    saved = [
        item
        for item in db.get("meetingAttendance", [])
        if item.get("meetingId") == PAST_MEETING_ID
    ]
    assert len(saved) == 28
    open_attendance(driver)

    assert len(attendance_rows(driver)) == 28
    assert all(
        Select(row.find_element(By.CSS_SELECTOR, ".attendance-status-select"))
        .first_selected_option.get_attribute("value")
        == "present"
        for row in attendance_rows(driver)
    )
    assert normalized(driver.find_element(By.ID, "attendance-present-count").text) == "28"
    modal_text = text_of(driver.find_element(By.ID, "modal-meeting-attendance"))
    assert "Всего пришли: 28 из 28" in modal_text
