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
HOMEROOM_TEACHER = "smirnova@school.ru"
SUBJECT_TEACHER = "kozlov@school.ru"
PASSWORD = "Test#2024"
SIDOROV = "Сидоров Никита Артёмович"
OPEN_LESSON = "lsn-39"
SECOND_DAY_LESSON = "lsn-40"
SIDOROV_ID = "st-14"
CERTIFICATE_TEXT = "Справка № 142 от 25.10.2024 (ДГП № 1)"
SECOND_CERTIFICATE_TEXT = "Справка № 143 от 26.10.2024 (ДГП № 1)"


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


def wait_for_login_form(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def wait_for_app(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


def login(driver, username, password=PASSWORD):
    reset_all(driver)
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(password)
    driver.find_element(By.ID, "btn-login-submit").click()
    wait_for_app(driver)


def open_journal(driver, query="", timeout=10):
    path = "journal/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(
                (By.ID, "journal-table-container")
            )
        )
    except TimeoutException:
        body = normalized(driver.find_element(By.TAG_NAME, "body").text)
        pytest.fail(f"Не открылся раздел «Журнал»: «{body}»")


def open_attendance(driver, query="", timeout=10):
    path = "attendance/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.ID, "table-attendance"))
        )
    except TimeoutException:
        body = normalized(driver.find_element(By.TAG_NAME, "body").text)
        pytest.fail(f"Не открылся раздел «Посещаемость»: «{body}»")


def get_journal_cell(driver):
    cells = driver.find_elements(
        By.CSS_SELECTOR,
        "td.cell-journal-entry"
        f"[data-lesson-id='{OPEN_LESSON}']"
        f"[data-student-id='{SIDOROV_ID}']",
    )
    if not cells:
        pytest.fail("Не найдена запись Сидорова Никиты за 24.10.2024")
    return cells[0]


def modal_is_open(driver, modal_id):
    classes = driver.find_element(By.ID, modal_id).get_attribute("class") or ""
    return "opacity-100" in classes and "pointer-events-none" not in classes


def open_entry_modal(driver):
    cell = get_journal_cell(driver)
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
        cell,
    )
    wait_until(
        driver,
        lambda d: modal_is_open(d, "modal-journal-entry"),
        "Не открылась карточка записи журнала",
    )


def close_entry_modal(driver):
    driver.find_element(By.ID, "btn-close-journal-modal").click()
    wait_until(
        driver,
        lambda d: not modal_is_open(d, "modal-journal-entry"),
        "Карточка записи журнала не закрылась",
    )


def confirm_absence(driver, reason_type="excused", document=CERTIFICATE_TEXT):
    driver.find_element(By.ID, "btn-quick-confirm-absence").click()
    wait_until(
        driver,
        lambda d: modal_is_open(d, "modal-journal-confirm-absence"),
        "Не открылась форма подтверждения пропуска",
    )
    driver.execute_script(
        "arguments[0].value = arguments[1];"
        "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
        driver.find_element(By.ID, "journal-confirm-reason-type"),
        reason_type,
    )
    if reason_type == "excused":
        certificate_checkbox = driver.find_element(
            By.ID, "journal-confirm-has-certificate"
        )
        if not certificate_checkbox.is_selected():
            certificate_checkbox.click()
        document_input = driver.find_element(
            By.ID, "journal-confirm-document-text"
        )
        document_input.clear()
        document_input.send_keys(document)
        assert document_input.get_attribute("value") == document
    driver.find_element(
        By.CSS_SELECTOR,
        "#form-journal-confirm-absence button[type='submit']",
    ).click()
    wait_until(
        driver,
        lambda d: not modal_is_open(d, "modal-journal-confirm-absence"),
        "Форма подтверждения пропуска не закрылась",
    )
    wait_until(
        driver,
        lambda d: "Б" in normalized(get_journal_cell(d).text)
        if reason_type == "excused"
        else "Н" in normalized(get_journal_cell(d).text),
        "Статус пропуска в журнале не обновился",
    )


def test_med_01_confirm_certificate(driver):
    """Классрук подтверждает справку с основанием и автором подтверждения."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    assert "Н" in normalized(get_journal_cell(driver).text)

    open_entry_modal(driver)
    assert driver.find_element(By.ID, "btn-quick-confirm-absence").is_displayed()
    confirm_absence(driver)

    driver.execute_script("window.location.reload()")
    wait_until(
        driver,
        lambda d: get_journal_cell(d).is_displayed(),
        "Журнал не обновился после подтверждения",
    )
    open_entry_modal(driver)
    badge = normalized(
        driver.find_element(By.ID, "entry-modal-attendance-badge").text
    )
    details = normalized(
        driver.find_element(By.ID, "entry-modal-absence-details").text
    )
    assert "Уважительная причина" in badge
    assert CERTIFICATE_TEXT in details
    assert "Подтвердил:" in details
    assert "Смирнова М. В." in details
    close_entry_modal(driver)


def test_med_02_certificate_multiple_days(driver):
    """Каждый день болезни подтверждается отдельной справкой."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    open_entry_modal(driver)
    confirm_absence(driver, document=CERTIFICATE_TEXT)

    assert "Б" in normalized(get_journal_cell(driver).text)
    second_day = driver.find_elements(
        By.CSS_SELECTOR,
        "td.cell-journal-entry"
        f"[data-lesson-id='{SECOND_DAY_LESSON}']"
        f"[data-student-id='{SIDOROV_ID}']",
    )
    assert second_day, "Не найдена запись Сидорова Никиты за 25.10.2024"
    assert "Н" in normalized(second_day[0].text)

    second_day_cell = second_day[0]
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
        second_day_cell,
    )
    wait_until(
        driver,
        lambda d: modal_is_open(d, "modal-journal-entry"),
        "Не открылась карточка второго дня болезни",
    )
    confirm_absence(driver, document=SECOND_CERTIFICATE_TEXT)
    second_day_after_confirmation = driver.find_elements(
        By.CSS_SELECTOR,
        "td.cell-journal-entry"
        f"[data-lesson-id='{SECOND_DAY_LESSON}']"
        f"[data-student-id='{SIDOROV_ID}']",
    )
    assert second_day_after_confirmation, "Не найдена обновлённая запись Сидорова за 25.10.2024"
    assert "Б" in normalized(second_day_after_confirmation[0].text)

    open_attendance(driver, "week=w8")
    row = driver.find_element(By.XPATH, "//tr[contains(., 'Сидоров Никита')]")
    assert normalized(row.text).count("УП") == 2


def test_med_03_refuse_confirmation(driver):
    """Неуважительный статус не скрывает возможность подтвердить причину позже."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    open_entry_modal(driver)
    confirm_absence(driver, reason_type="unexcused")

    assert "Н" in normalized(get_journal_cell(driver).text)


def test_med_04_subject_teacher_forbidden(driver):
    """Предметник не получает действие подтверждения причины пропуска."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "class=class-7b&subject=math")
    open_entry_modal(driver)
    assert not driver.find_elements(By.ID, "btn-quick-confirm-absence")
    close_entry_modal(driver)

    open_attendance(driver, "class=class-7b&week=w8")
    assert not driver.find_elements(By.ID, "btn-open-batch-confirm")
    assert not driver.find_elements(By.ID, "btn-banner-confirm")
    assert not driver.find_elements(By.CSS_SELECTOR, "button[data-action='open-confirm']")


def test_med_05_journal_entry_preserved(driver):
    """Подтверждение меняет статус пропуска, но не удаляет ячейку журнала."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    assert "Н" in normalized(get_journal_cell(driver).text)

    open_entry_modal(driver)
    confirm_absence(driver)

    cell = get_journal_cell(driver)
    assert cell.is_displayed()
    cell_text = normalized(cell.text)
    assert "Б" in cell_text
    assert "·" not in cell_text
