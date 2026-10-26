import os
from urllib.parse import parse_qs, urlparse

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
HOMEROOM_TEACHER = "smirnova@school.ru"
SUBJECT_TEACHER = "kozlov@school.ru"
PASSWORD = "Test#2024"
PETROVA_ID = "st-23"
OPEN_LESSON_ID = "lsn-39"
CERTIFICATE_TEXT = "Справка № 142 от 25.10.2024"


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
    driver.find_element(By.ID, "login-email").send_keys(username)
    driver.find_element(By.ID, "login-password").send_keys(password)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_view(driver, path, locator):
    driver.get(app_url(path))
    wait_until(
        driver,
        lambda d: d.find_elements(*locator),
        f"Не открылся раздел по адресу {path}",
    )


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def absence_record(driver, record_id=None):
    db = read_db(driver) or {}
    records = db.get("attendance", [])
    if record_id:
        return next((record for record in records if record.get("id") == record_id), None)
    return next(
        (
            record
            for record in records
            if record.get("lessonId") == OPEN_LESSON_ID
            and record.get("studentId") == PETROVA_ID
            and record.get("value") == "absent"
        ),
        None,
    )


def open_attendance(driver, query=""):
    suffix = f"?{query}" if query else ""
    open_view(driver, f"attendance/{suffix}", (By.ID, "table-attendance"))


def open_journal(driver, query=""):
    suffix = f"?{query}" if query else ""
    open_view(driver, f"journal/{suffix}", (By.ID, "journal-table-container"))


def journal_cell(driver):
    selector = (
        "td.cell-journal-entry"
        f"[data-lesson-id='{OPEN_LESSON_ID}']"
        f"[data-student-id='{PETROVA_ID}']"
    )
    cells = driver.find_elements(By.CSS_SELECTOR, selector)
    assert cells, "Не найдена отметка Петровой Анны за 24.10.2024"
    return cells[0]


def open_journal_entry(driver):
    cell = journal_cell(driver)
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
        cell,
    )
    wait_until(
        driver,
        lambda d: "opacity-100"
        in (d.find_element(By.ID, "modal-journal-entry").get_attribute("class") or ""),
        "Не открылась карточка записи журнала",
    )


def confirm_excused_absence(driver):
    driver.find_element(By.ID, "btn-quick-confirm-absence").click()
    wait_until(
        driver,
        lambda d: "opacity-100"
        in (
            d.find_element(By.ID, "modal-journal-confirm-absence").get_attribute(
                "class"
            )
            or ""
        ),
        "Не открылась форма подтверждения пропуска",
    )
    document = driver.find_element(By.ID, "journal-confirm-document-text")
    document.clear()
    document.send_keys(CERTIFICATE_TEXT)
    driver.find_element(
        By.CSS_SELECTOR, "#form-journal-confirm-absence button[type='submit']"
    ).click()
    wait_until(
        driver,
        lambda d: absence_record(d)
        and absence_record(d).get("status") == "excused",
        "Подтверждение уважительной причины не сохранилось",
    )


def refuse_absence_confirmation(driver):
    record = absence_record(driver)
    assert record, "Не найдена исходная неподтверждённая отметка"
    return driver.execute_script(
        "return window.crmApi.confirmAbsenceRecord(arguments[0], {"
        "status: 'unexcused', reason: 'Причина не подтверждена'});",
        record["id"],
    )


def absence_count_in_risk_summary(driver):
    open_view(driver, "overview/", (By.CSS_SELECTOR, ".risk-card"))
    driver.find_element(
        By.CSS_SELECTOR,
        f"button[data-action='open-summary'][data-student-id='{PETROVA_ID}']",
    ).click()
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "modal-student-summary"),
        "Не открылась сводка ученика из зоны риска",
    )
    value = driver.find_element(
        By.XPATH,
        "//*[@id='student-summary-content']//span[normalize-space()='Пропущено']/following-sibling::div[1]",
    )
    return int(normalized(value.text).split()[0])


def test_bp_06_unconfirmed_list_link(driver):
    """Предупреждение передаёт ученика в подсвеченную строку посещаемости."""
    login(driver, HOMEROOM_TEACHER)
    driver.get(app_url("overview/"))
    link = driver.find_element(
        By.CSS_SELECTOR, "a[href^='/attendance?filter=unconfirmed']"
    )
    href = link.get_attribute("href")
    query = parse_qs(urlparse(href).query)
    assert query.get("studentId") == [PETROVA_ID]

    driver.execute_script("arguments[0].click();", link)
    wait_until(driver, lambda d: d.find_elements(By.ID, "table-attendance"), "Не открылся список посещаемости")
    row = driver.find_element(
        By.CSS_SELECTOR, f"tr.student-row[data-student-id='{PETROVA_ID}']"
    )
    assert "ring-2" in (row.get_attribute("class") or "")
    assert "Н (без)" in normalized(row.text)


def test_bp_07_no_warning_without_unconfirmed(driver):
    """Без неподтверждённых пропусков предупреждение не выводится."""
    login(driver, HOMEROOM_TEACHER)
    driver.execute_script(
        "const db = window.crmApi.getDB();"
        "db.attendance.forEach((record) => {"
        "if (record.value === 'absent' && record.status === 'unconfirmed') {"
        "record.status = 'excused'; record.code = 'УП';} });"
        "window.crmApi.saveDB(db);"
    )
    open_attendance(driver, "week=w8")
    assert not driver.find_elements(By.ID, "banner-unconfirmed")

    driver.get(app_url("overview/"))
    metric = driver.find_element(
        By.XPATH,
        "//*[normalize-space()='Без подтверждения']/ancestor::div[contains(@class, 'bg-white')][1]",
    )
    assert "0" in normalized(metric.text)


def test_bp_08_confirm_author(driver):
    """Подтверждение сохраняет основание и классного руководителя сессии."""
    login(driver, HOMEROOM_TEACHER)
    record = absence_record(driver)
    assert record and record["status"] == "unconfirmed"
    result = driver.execute_script(
        "return window.crmApi.confirmAbsenceRecord(arguments[0], {"
        "status: 'excused', reason: 'Болезнь', document: arguments[1]});",
        record["id"],
        CERTIFICATE_TEXT,
    )
    assert result["success"] is True

    saved = absence_record(driver, record["id"])
    assert saved and saved["code"] == "УП"
    assert saved["confirmedBy"] == "Смирнова М. В."
    assert saved["document"] == CERTIFICATE_TEXT
    assert sum(
        1
        for item in (read_db(driver) or {}).get("attendance", [])
        if item.get("status") == "unconfirmed" and item.get("value") == "absent"
    ) < sum(
        1
        for item in (read_db(driver) or {}).get("attendance", [])
        if item.get("id") != record["id"]
        and item.get("status") == "unconfirmed"
        and item.get("value") == "absent"
    ) + 1


def test_bp_09_confirmed_not_editable(driver):
    """Предметник не удаляет подтверждённый пропуск через сохранение журнала."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    open_journal_entry(driver)
    confirm_excused_absence(driver)
    record_id = absence_record(driver)["id"]

    driver.execute_script("window.localStorage.removeItem('classroom_crm_session');")
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )
    driver.find_element(By.ID, "login-email").send_keys(SUBJECT_TEACHER)
    driver.find_element(By.ID, "login-password").send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )

    result = driver.execute_script(
        "return window.crmApi.setLessonAttendance({"
        "lessonId: arguments[0], studentId: arguments[1], isAbsent: false});",
        OPEN_LESSON_ID,
        PETROVA_ID,
    )
    assert result["success"] is False
    assert "подтверждена" in result["error"].lower()
    record = absence_record(driver, record_id)
    assert record and record["value"] == "absent"
    assert record["status"] == "excused"


def test_bp_10_refusal_keeps_absence(driver):
    """Отказ сохраняет неуважительный пропуск в данных и зоне риска."""
    login(driver, HOMEROOM_TEACHER)
    initial_absences = absence_count_in_risk_summary(driver)
    result = refuse_absence_confirmation(driver)
    assert result["success"] is True

    record = absence_record(driver)
    assert record and record["status"] == "unexcused"
    assert record["code"] == "Н"
    assert record.get("confirmedBy") is None
    assert absence_count_in_risk_summary(driver) == initial_absences


def test_bp_34_subject_teacher_api_denied(driver):
    """API не подтверждает причину пропуска от имени предметника."""
    login(driver, SUBJECT_TEACHER)
    record = absence_record(driver)
    assert record and record["status"] == "unconfirmed"
    original = dict(record)

    result = driver.execute_script(
        "return window.crmApi.confirmAbsenceRecord(arguments[0], {"
        "status: 'excused', reason: 'Справка', document: 'Справка'});",
        record["id"],
    )
    assert result["success"] is False
    assert "недоступно" in result["error"].lower()
    saved = absence_record(driver, record["id"])
    assert saved["status"] == original["status"]
    assert saved.get("confirmedBy") == original.get("confirmedBy")
