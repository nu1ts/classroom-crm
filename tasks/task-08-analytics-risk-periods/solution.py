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

ADD_ABSENCES_TO_STUDENT = """
const db = window.crmApi.getDB();
const marks = db.attendance
  .filter((a) => a.studentId === "st-01" && a.value === "present")
  .slice(0, 9);
marks.forEach((mark) => {
  mark.value = "absent";
  mark.status = "unconfirmed";
  mark.code = "Н (без)";
  mark.reason = "Причина не указана";
});
window.crmApi.saveDB(db);
return marks.length;
"""


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


def open_students(driver, period_id="q1_2024", timeout=10):
    driver.get(app_url(f"students/?period={period_id}"))
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


def student_average_cell(driver, student_id):
    row = wait_student_row(driver, student_id)
    return row_cell(row, 3).text.strip()


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


def risk_zone_heading(driver):
    element = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//h3[contains(text(), 'Ученики в зоне риска')]")
        )
    )
    # textContent вместо .text: заголовок отрисован через uppercase в CSS
    return element.get_attribute("textContent").strip()


def subject_card(driver, subject_name):
    elements = driver.find_elements(
        By.XPATH,
        f"//span[normalize-space()='{subject_name}']"
        f"/ancestor::div[contains(@class,'rounded-2xl')][1]",
    )
    return elements[0] if elements else None


def test_anl_08_no_grades_no_average(driver):
    """Проверяет, что без оценок среднего балла нет."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver, "sept_2024")

    search_student(driver, "Васильева", "st-16")
    value = student_average_cell(driver, "st-16")
    assert value == "—", (
        f"У Васильевой Д. за сентябрь оценок нет, ожидался прочерк, "
        f"получено «{value}»"
    )

    search_student(driver, "Романов", "st-13")
    value = student_average_cell(driver, "st-13")
    assert value == "—", (
        f"У Романова И. за сентябрь оценок нет, ожидался прочерк, "
        f"получено «{value}»"
    )


def test_anl_09_period_switch(driver):
    """Проверяет пересчёт отчёта под выбранный период."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "sept_2024")
    generate_report(driver)

    text = report_text(driver)
    assert "240 оценок за период" in text, (
        f"За сентябрь ожидалось 240 оценок за период: «{text[:400]}»"
    )

    value = report_metric_text(driver, "report-metric-avg")
    assert value == "4.2", (
        f"За сентябрь ожидался средний балл класса 4,2, получено «{value}»"
    )

    card = subject_card(driver, "Математика (Алгебра)")
    assert card is not None, "В отчёте нет карточки математики"
    assert "3.8" in card.text, (
        f"За сентябрь средний балл по математике 3,8: «{card.text}»"
    )
    assert "73 оценок" in card.text, (
        f"За сентябрь по математике 73 оценки: «{card.text}»"
    )


def test_anl_11_subject_averages_threshold(driver):
    """Проверяет средние баллы класса по предметам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "q1_2024")
    generate_report(driver)

    card = subject_card(driver, "Математика (Алгебра)")
    assert card is not None, "В отчёте нет карточки математики"
    assert "3.9" in card.text, (
        f"Средний балл класса по математике 3,9: «{card.text}»"
    )
    assert "87 оценок" in card.text, (
        f"По математике 87 оценок класса: «{card.text}»"
    )

    card = subject_card(driver, "Физика")
    assert card is not None, "В отчёте нет карточки физики"
    assert "4" in card.text, (
        f"Средний балл класса по физике 4,0: «{card.text}»"
    )
    assert "25 оценок" in card.text, (
        f"По физике 25 оценок класса: «{card.text}»"
    )

    card = subject_card(driver, "Физкультура")
    assert card is not None, "В отчёте нет карточки физкультуры"
    assert "4.8" in card.text, (
        f"Средний балл класса по физкультуре 4,8: «{card.text}»"
    )
    assert "48 оценок" in card.text, (
        f"По физкультуре 48 оценок класса: «{card.text}»"
    )


def test_anl_13_risk_zone_recalculated(driver):
    """Проверяет пересчёт зоны риска по актуальным данным."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "q1_2024")
    generate_report(driver)

    heading = risk_zone_heading(driver)
    assert heading == "Ученики в зоне риска (5)", (
        f"Ожидалось 5 учеников в зоне риска, получено «{heading}»"
    )
    value = report_metric_text(driver, "report-metric-risk")
    assert value == "5", (
        f"Ожидалось 5 учеников в зоне риска, получено «{value}»"
    )

    count = driver.execute_script(ADD_ABSENCES_TO_STUDENT)
    assert count == 9, (
        f"Ожидалось 9 новых пропусков у Александрова Е., получено {count}"
    )

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    heading = risk_zone_heading(driver)
    assert heading == "Ученики в зоне риска (6)", (
        f"После пропусков Александрова Е. ожидалось 6 учеников в зоне риска, "
        f"получено «{heading}»"
    )


def test_anl_22_empty_period(driver):
    """Проверяет, что за период без данных отчёт не придумывает числа."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_analytics(driver, "holidays_nov_2024")
    generate_report(driver)

    value = report_metric_text(driver, "report-metric-avg")
    assert value == "—", (
        f"За период каникул оценок нет, ожидался прочерк, получено «{value}»"
    )

    value = report_metric_text(driver, "report-metric-att")
    assert value == "—", (
        f"За период каникул посещаемость неизвестна, ожидался прочерк, "
        f"получено «{value}»"
    )

    text = report_text(driver)
    assert "Нет данных" in text, (
        f"За период без данных подпись о пропусках — «Нет данных»: "
        f"«{text[:400]}»"
    )
