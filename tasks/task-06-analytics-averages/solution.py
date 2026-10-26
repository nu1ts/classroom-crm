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

ADD_Q2_GRADE = """
const db = window.crmApi.getDB();
db.grades.push({
  id: "grd-q2-st-01",
  lessonId: "lsn-q2-01",
  studentId: "st-01",
  subjectId: "math",
  date: "2024-11-06",
  teacher: "Козлов А. П.",
  value: 2,
  periodId: "q2_2024"
});
window.crmApi.saveDB(db);
return db.grades.length;
"""

PREPARE_HALF_AVERAGE = """
const db = window.crmApi.getDB();
db.grades = db.grades.filter((grade) => grade.studentId !== "st-13");
const values = [];
for (let i = 0; i < 13; i += 1) values.push(4);
for (let i = 0; i < 5; i += 1) values.push(5);
values.push(3, 3);
values.forEach((value, index) => {
  db.grades.push({
    id: "grd-half-" + index,
    lessonId: "lsn-39",
    studentId: "st-13",
    subjectId: "math",
    date: "2024-10-24",
    teacher: "Козлов А. П.",
    value: value,
    periodId: "q1_2024"
  });
});
window.crmApi.saveDB(db);
const romanovGrades = db.grades.filter((grade) => grade.studentId === "st-13");
return {
  count: romanovGrades.length,
  sum: romanovGrades.reduce((sum, grade) => sum + grade.value, 0)
};
"""

ADD_THREE_TWOS = """
const db = window.crmApi.getDB();
[2, 2, 2].forEach((value, index) => {
  db.grades.push({
    id: "grd-extra-" + index,
    lessonId: "lsn-39",
    studentId: "st-13",
    subjectId: "math",
    date: "2024-10-24",
    teacher: "Козлов А. П.",
    value: value,
    periodId: "q1_2024"
  });
});
window.crmApi.saveDB(db);
return db.grades.length;
"""

ADD_ONE_GRADE = """
const db = window.crmApi.getDB();
db.grades.push({
  id: "grd-new-01",
  lessonId: "lsn-40",
  studentId: "st-01",
  subjectId: "math",
  date: "2024-10-25",
  teacher: "Козлов А. П.",
  value: 5,
  periodId: "q1_2024"
});
window.crmApi.saveDB(db);
return db.grades.length;
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


def open_student_page(driver, student_id, timeout=10):
    driver.get(app_url(f"student/?id={student_id}"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )


def student_page_metric(driver, label):
    xpath = f"//div[normalize-space()='{label}']/following-sibling::div[1]"
    try:
        element = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, xpath))
        )
    except TimeoutException:
        pytest.fail(f"На странице ученика нет показателя «{label}»")
    return normalized(element.text)


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
    return normalized(element.text)


def report_text(driver):
    element = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "report-container"))
    )
    return normalized(element.text)


def click_sidebar_item(driver, item_id, target_id, timeout=10):
    item = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.ID, item_id))
    )
    item.click()
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, target_id))
    )


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
    close_summary(driver)

    total = driver.execute_script(ADD_Q2_GRADE)
    assert total == 304, (
        f"После добавления оценки за II четверть в журнале должно быть "
        f"304 оценки, получено {total}"
    )

    open_students(driver)
    row = search_student(driver, "Александров", "st-01")
    list_value = row_cell(row, 3).text.strip()
    assert list_value == "4,8", (
        f"Оценка за II четверть не должна попадать в расчёт за I четверть: "
        f"получено «{list_value}»"
    )

    open_summary(driver, "st-01")
    summary_value = summary_metric_text(driver, "Средний балл")
    assert "4,8" in summary_value, (
        f"После добавления оценки за II четверть в сводке ожидался "
        f"средний балл 4,8: «{summary_value}»"
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
    """Проверяет округление ровно половины вверх."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    prepared = driver.execute_script(PREPARE_HALF_AVERAGE)
    assert prepared["count"] == 20 and prepared["sum"] == 83, (
        "Для проверки округления у Романова И. должны быть 20 оценок "
        f"с суммой 83 балла (83 / 20 = 4,15): {prepared}"
    )

    open_students(driver)
    row = search_student(driver, "Романов", "st-13")
    list_value = row_cell(row, 3).text.strip()
    assert list_value == "4,2", (
        f"83 / 20 = 4,15 должно округляться до 4,2, получено «{list_value}»"
    )

    open_summary(driver, "st-13")
    summary_value = summary_metric_text(driver, "Средний балл")
    assert "4,2" in summary_value, (
        f"В сводке ожидался 4,2: «{summary_value}»"
    )


def test_anl_10_class_average_method(driver):
    """Проверяет расчёт среднего балла класса по всем оценкам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    assert report_metric_text(driver, "report-metric-avg") == "4.2", (
        "За I четверть ожидался средний балл класса 4,2"
    )

    total = driver.execute_script(ADD_THREE_TWOS)
    assert total == 306, (
        f"После трёх дополнительных оценок в журнале должно быть 306 оценок, "
        f"получено {total}"
    )

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    value = report_metric_text(driver, "report-metric-avg")
    assert value == "4.2", (
        f"Средний балл класса считается по всем оценкам: 1281 / 306 = 4,19 → 4,2, "
        f"получено «{value}»"
    )


def test_anl_19_presence_not_grade(driver):
    """Проверяет, что отметки о присутствии не входят в средний балл."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_student_page(driver, "st-01")

    data = driver.execute_script(
        """
        const db = window.crmApi.getDB();
        const grades = db.grades.filter(
          (g) => g.studentId === "st-01" && g.periodId === "q1_2024"
        );
        const marks = db.attendance.filter((a) => a.studentId === "st-01");
        return {
          grades: grades.length,
          sum: grades.reduce((acc, g) => acc + g.value, 0),
          marks: marks.length
        };
        """
    )
    assert data["grades"] == 11 and data["sum"] == 53, (
        f"Ожидались 11 оценок с суммой 53 балла: {data}"
    )
    assert data["marks"] >= 40, (
        f"Отметок о посещаемости должно быть не меньше 40: {data}"
    )

    value = student_page_metric(driver, "Средний балл")
    assert value == "4.8", (
        f"53 / 11 = 4,8 — отметки о присутствии в расчёт не входят, "
        f"получено «{value}»"
    )


def test_anl_21_recalc_after_new_grade(driver):
    """Проверяет пересчёт отчёта после добавления новой оценки."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    text = report_text(driver)
    assert "303 оценок за период" in text, (
        f"За I четверть ожидалось 303 оценки: «{text[:300]}»"
    )

    total = driver.execute_script(ADD_ONE_GRADE)
    assert total == 304, (
        f"После добавления оценки в журнале должно быть 304 оценки, "
        f"получено {total}"
    )

    click_sidebar_item(driver, "nav-students", "students-table-wrapper")
    click_sidebar_item(driver, "nav-analytics", "analytics-view")
    generate_report(driver)

    text = report_text(driver)
    assert "304 оценок за период" in text, (
        "После добавления оценки отчёт не пересчитался: ожидалось 304 оценки"
    )
    assert "Отчёт сформирован динамически" in text, (
        "В отчёте нет подписи о динамическом расчёте"
    )
