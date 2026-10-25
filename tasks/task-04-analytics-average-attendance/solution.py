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


def current_path(driver):
    return driver.current_url.split("?")[0]


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
        pytest.fail(
            f"В списке учеников не появилась строка {student_id}, "
            f"адрес: {current_path(driver)}"
        )


def search_student(driver, query, student_id):
    field = driver.find_element(By.ID, "input-search-student-list")
    field.clear()
    field.send_keys(query)
    return wait_student_row(driver, student_id)


def row_cell(row, index):
    return row.find_element(By.CSS_SELECTOR, f"td:nth-child({index})")


def open_summary(driver, student_id):
    row = wait_student_row(driver, student_id)
    row.find_element(By.CSS_SELECTOR, "button.btn-open-student-summary").click()

    def summary_opened(d):
        modal = d.find_element(By.ID, "modal-student-summary")
        return "opacity-100" in (modal.get_attribute("class") or "")

    try:
        WebDriverWait(driver, 10).until(summary_opened)
    except TimeoutException:
        pytest.fail(f"Не открылась сводка ученика {student_id}")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "student-summary-content"))
    )


def close_summary(driver):
    driver.find_element(By.ID, "btn-close-students-summary-footer").click()
    WebDriverWait(driver, 10).until(
        lambda d: "opacity-0"
        in (d.find_element(By.ID, "modal-student-summary").get_attribute("class") or "")
    )


def summary_metric_card(driver, label):
    cards = driver.find_elements(
        By.CSS_SELECTOR, "#student-summary-content .grid.grid-cols-3 > div"
    )
    for card in cards:
        if label.upper() in card.text.upper():
            return card
    return None


def summary_metric_text(driver, label):
    card = summary_metric_card(driver, label)
    assert card is not None, f"В сводке нет метрики «{label}»"
    return card.text


def summary_subject_card(driver, subject_name):
    cards = driver.find_elements(
        By.XPATH,
        "//*[@id='student-summary-content']//div[contains(@class,'p-2.5')]",
    )
    for card in cards:
        if subject_name in card.text:
            return card
    return None


def open_analytics_report(driver):
    driver.get(app_url("analytics/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "analytics-view"))
    )
    driver.find_element(By.ID, "btn-generate-report").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "report-container"))
    )
    WebDriverWait(driver, 10).until(
        lambda d: "hidden"
        not in (d.find_element(By.ID, "report-container").get_attribute("class") or "")
    )


def analytics_subject_card(driver, subject_name):
    cards = driver.find_elements(
        By.XPATH,
        "//*[@id='report-container']//div[contains(@class,'p-3.5') "
        "and contains(@class,'rounded-2xl')]",
    )
    for card in cards:
        if subject_name in card.text:
            return card
    return None


def normalized(text):
    return text.replace(",", ".").replace("\u00a0", " ")


def test_anl_01_student_average_period(driver):
    """Проверяет единый средний балл ученика в списке и сводке за период."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    row = search_student(driver, "Александров", "st-01")
    list_value = row_cell(row, 3).text.strip()
    assert list_value == "4,8", (
        f"В списке у Александрова Е. ожидался средний балл 4,8, "
        f"получено «{list_value}»"
    )

    open_summary(driver, "st-01")
    summary_value = summary_metric_text(driver, "Средний балл")
    assert "4,8" in summary_value, (
        f"В сводке Александрова Е. ожидался средний балл 4,8: «{summary_value}»"
    )


def test_anl_02_single_grade_average(driver):
    """Проверяет средний балл ученика с единственной оценкой."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    row = search_student(driver, "Романов", "st-13")
    list_value = row_cell(row, 3).text.strip()
    assert list_value == "5,0", (
        f"Единственная оценка «5» должна давать 5,0 в списке, "
        f"получено «{list_value}»"
    )

    open_summary(driver, "st-13")
    summary_value = summary_metric_text(driver, "Средний балл")
    assert "5,0" in summary_value, (
        f"В сводке Романова И. ожидался средний балл 5,0: «{summary_value}»"
    )
    assert "—" not in summary_value, "Средний балл по единственной оценке не рассчитан"


def test_anl_03_average_rounding(driver):
    """Проверяет округление среднего балла до десятых вверх."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    row = search_student(driver, "Морозов", "st-09")
    list_value = row_cell(row, 3).text.strip()
    assert list_value == "3,8", (
        f"34 / 9 = 3,777… должно округляться до 3,8, получено «{list_value}»"
    )

    open_summary(driver, "st-09")
    summary_value = summary_metric_text(driver, "Средний балл")
    assert "3,8" in summary_value, (
        f"В сводке Морозова А. ожидалось 3,8: «{summary_value}»"
    )
    close_summary(driver)

    row = search_student(driver, "Петрова", "st-23")
    assert row_cell(row, 3).text.strip() == "4,5", (
        "У Петровой А. в списке ожидался средний балл 4,5"
    )
    open_summary(driver, "st-23")
    math_card = summary_subject_card(driver, "Математика")
    assert math_card is not None, "В сводке нет карточки математики"
    assert re.search(r"\b3\.2\b", normalized(math_card.text)), (
        f"16 / 5 = 3,2 должно показываться без округления: «{math_card.text}»"
    )


def test_anl_04_half_rounding(driver):
    """Проверяет округление ровно половины вверх в отчёте аналитики."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics_report(driver)

    pe_card = analytics_subject_card(driver, "Физкультура")
    assert pe_card is not None, "В отчёте нет карточки физкультуры"
    assert re.search(r"\b4\.8\b", normalized(pe_card.text)), (
        "228 / 48 = 4,75 должно округляться до 4,8, а не до 4,7: "
        f"«{pe_card.text}»"
    )


def test_anl_05_student_attendance(driver):
    """Проверяет пропуски, посещаемость и порог подсветки в списке."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    row = search_student(driver, "Сидоров", "st-14")
    absences = row_cell(row, 4).text.strip()
    assert "12 из 40" in absences, (
        f"У Сидорова Н. ожидалось «12 из 40», получено «{absences}»"
    )
    badges = row.find_elements(
        By.XPATH, ".//span[contains(normalize-space(.), 'В зоне риска')]"
    )
    assert badges, "У Сидорова Н. нет бейджа «В зоне риска»"

    open_summary(driver, "st-14")
    attendance = summary_metric_text(driver, "Посещаемость")
    assert "70%" in attendance, (
        f"Посещаемость Сидорова Н. должна быть 70,0 %: «{attendance}»"
    )
    assert "30%" in attendance, (
        f"Доля пропусков Сидорова Н. должна быть 30,0 %: «{attendance}»"
    )
    absent_card = summary_metric_text(driver, "Пропущено")
    assert "12" in absent_card and "из 40" in absent_card, (
        f"В сводке ожидалось «12 из 40»: «{absent_card}»"
    )
    close_summary(driver)

    row = search_student(driver, "Котов", "st-06")
    absence_cell = row_cell(row, 4)
    assert "1 из 40" in absence_cell.text, (
        f"У Котова М. ожидался «1 из 40», получено «{absence_cell.text}»"
    )
    absence_span_classes = absence_cell.find_element(
        By.CSS_SELECTOR, "span.font-bold"
    ).get_attribute("class")
    assert "text-rose-600" not in absence_span_classes, (
        "Пропуск 1 из 40 (2,5 %) ниже порога 20 % не должен быть красным"
    )
