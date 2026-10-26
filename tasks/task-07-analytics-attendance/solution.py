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


def open_students(driver, timeout=10):
    driver.get(app_url("students/"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "students-table-wrapper"))
    )


def wait_student_row(driver, student_id, timeout=10):
    selector = f"tr.student-row-item[data-student-id='{student_id}']"

    def visible_row(d):
        for row in d.find_elements(By.CSS_SELECTOR, selector):
            if row.is_displayed():
                return row
        return False

    try:
        return WebDriverWait(driver, timeout).until(visible_row)
    except TimeoutException:
        pytest.fail(f"В списке учеников не появилась строка {student_id}")


def search_student(driver, query, student_id):
    field = driver.find_element(By.ID, "input-search-student-list")
    field.clear()
    field.send_keys(query)
    return wait_student_row(driver, student_id)


def row_cell(row, index):
    return row.find_element(By.CSS_SELECTOR, f"td:nth-child({index})")


def absence_cell_text(driver, student_id):
    row = wait_student_row(driver, student_id)
    return row_cell(row, 4).text.strip()


def open_analytics(driver, period_id="q1_2024", timeout=10):
    driver.get(app_url(f"analytics/?periodId={period_id}"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "analytics-view"))
    )


def generate_report(driver, timeout=10):
    driver.find_element(By.ID, "btn-generate-report").click()
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "report-period-title"))
    )


def report_metric_text(driver, metric_id):
    element = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, metric_id))
    )
    return element.text.strip()


def report_text(driver):
    element = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "report-container"))
    )
    return element.text


def weekly_card(driver, label):
    elements = driver.find_elements(
        By.XPATH, f"//div[normalize-space()='{label}']"
    )
    for element in elements:
        return element.find_element(By.XPATH, "..")
    return None


def open_student_page(driver, student_id, timeout=10):
    driver.get(app_url(f"student/?id={student_id}"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )


def confirm_absence(driver, date_value):
    buttons = driver.find_elements(
        By.CSS_SELECTOR, f".btn-confirm-absence-action[data-date='{date_value}']"
    )
    if not buttons:
        pytest.fail(f"Нет кнопки подтверждения пропуска за {date_value}")
    buttons[0].click()

    def modal_opened(d):
        modal = d.find_element(By.ID, "modal-confirm-student-absence")
        return "opacity-100" in (modal.get_attribute("class") or "")

    WebDriverWait(driver, 10).until(modal_opened)

    doc_input = driver.find_element(By.ID, "confirm-doc-text-input")
    doc_input.clear()
    doc_input.send_keys(f"Справка № 142 от {date_value}")
    driver.find_element(
        By.XPATH,
        "//form[@id='form-confirm-student-absence']//button[@type='submit']",
    ).click()

    WebDriverWait(driver, 10).until(
        lambda d: not d.find_elements(
            By.CSS_SELECTOR,
            f".btn-confirm-absence-action[data-date='{date_value}']",
        )
    )


def test_anl_05_student_attendance_percent(driver):
    """Проверяет порог 20 % и показатели посещаемости ученика."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_student(driver, "Сидоров", "st-14")
    cell = row_cell(wait_student_row(driver, "st-14"), 4)
    text = cell.text
    assert "12 из 40" in text and "12 дней" in text, (
        f"У Сидорова Н. ожидались 12 пропусков из 40: «{text}»"
    )
    highlight = cell.find_element(By.CSS_SELECTOR, "span.font-bold")
    classes = highlight.get_attribute("class") or ""
    assert "text-amber-700" in classes, (
        "Пропуски 30 % должны выделяться особым оформлением"
    )

    search_student(driver, "Котов", "st-06")
    cell = row_cell(wait_student_row(driver, "st-06"), 4)
    text = cell.text
    assert "1 из 40" in text and "1 день" in text, (
        f"У Котова М. ожидался один пропуск из 40 уроков: «{text}»"
    )
    highlight = cell.find_element(By.CSS_SELECTOR, "span.font-bold")
    classes = highlight.get_attribute("class") or ""
    assert "text-amber-700" not in classes, (
        "Пропуск 2,5 % не должен выделяться как превышение порога 20 %"
    )


def test_anl_06_unmarked_not_absent(driver):
    """Проверяет, что неотмеченные уроки не попадают в знаменатель."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_student(driver, "Александров", "st-01")
    text = row_cell(wait_student_row(driver, "st-01"), 4).text
    assert "0 из 40" in text, (
        f"Знаменателем должны быть 40 отмеченных уроков, а не 42 урока "
        f"расписания: получено «{text}»"
    )


def test_anl_07_class_attendance_share(driver):
    """Проверяет расчёт посещаемости класса по всем отметкам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "q1_2024")
    generate_report(driver)

    value = report_metric_text(driver, "report-metric-att")
    assert value == "93.6%", (
        f"1048 посещений из 1120 отметок дают 93,6 %, получено «{value}»"
    )

    text = report_text(driver)
    assert "Пропущено 6.4% уроков" in text, (
        f"72 пропуска из 1120 отметок дают 6,4 %: «{text[:400]}»"
    )


def test_anl_12_weekly_absences_share(driver):
    """Проверяет долю пропусков по неделям четверти."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "q1_2024")
    generate_report(driver)

    card = weekly_card(driver, "Нед 8")
    assert card is not None, "В отчёте нет карточки 8-й недели"
    assert "11.4%" in card.text, (
        f"16 пропусков из 140 отметок дают 11,4 %: «{card.text}»"
    )
    assert "16 проп." in card.text, (
        f"На 8-й неделе ожидалось 16 пропусков: «{card.text}»"
    )

    card = weekly_card(driver, "Нед 4")
    assert card is not None, "В отчёте нет карточки 4-й недели"
    assert "10%" in card.text, (
        f"14 пропусков из 140 отметок дают 10 %: «{card.text}»"
    )
    assert "14 проп." in card.text, (
        f"На 4-й неделе ожидалось 14 пропусков: «{card.text}»"
    )


def test_anl_20_excused_is_absence(driver):
    """Проверяет, что подтверждённый пропуск остаётся пропуском."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_student(driver, "Сидоров", "st-14")
    text = row_cell(wait_student_row(driver, "st-14"), 4).text
    assert "12 дней" in text, (
        f"До подтверждения у Сидорова Н. ожидалось 12 дней с пропусками, "
        f"получено «{text}»"
    )

    open_student_page(driver, "st-14")
    confirm_absence(driver, "2024-10-22")

    open_students(driver)
    search_student(driver, "Сидоров", "st-14")
    text = row_cell(wait_student_row(driver, "st-14"), 4).text
    assert "12 дней" in text, (
        f"Подтверждение справкой не должно убирать пропуск из статистики: "
        f"получено «{text}»"
    )
