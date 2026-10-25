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
TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"

RISK_REASONS = [
    ("Сидоров Никита Артёмович", "Пропуски 12 из 40 уроков (30%)"),
    ("Морозов Артём Андреевич", "Пропуски 9 из 40 уроков (22.5%)"),
    ("Петрова Анна Сергеевна", "«Математика (Алгебра)» 3.2"),
    ("Волкова София Дмитриевна", "«Физика» 3.4"),
    ("Котов Максим Денисович", "Общий средний балл 3.3"),
]

MOROZOV_ABSENCES_TO_PRESENT = """
const db = window.crmApi.getDB();
let changed = 0;
(db.attendance || []).forEach((a) => {
  if (a.studentId === "st-09" && a.value === "absent") {
    a.value = "present";
    a.status = "present";
    a.code = "Был";
    a.reason = null;
    a.document = null;
    a.confirmedBy = null;
    a.confirmedAt = null;
    changed += 1;
  }
});
window.crmApi.saveDB(db);
return changed;
"""

ADD_GRADE = """
const db = window.crmApi.getDB();
db.grades.push({
  id: "grd-task-06-01",
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


def click_sidebar_item(driver, item_id, target_id, timeout=10):
    item = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.ID, item_id))
    )
    item.click()
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, target_id))
    )


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


def risk_groups_text(driver):
    element = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "risk-groups-list"))
    )
    return element.text


def wait_risk_groups_contains(driver, expected, timeout=10):
    lowered_expected = expected.lower()

    def contains_expected(d):
        text = d.find_element(By.ID, "risk-groups-list").text.lower()
        return lowered_expected in text

    try:
        WebDriverWait(driver, timeout).until(contains_expected)
    except TimeoutException:
        actual = risk_groups_text(driver)
        pytest.fail(
            f"В группах риска ожидалось «{expected}», получено: «{actual}»"
        )


def select_period(driver, value, expected_title, timeout=10):
    select_element = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, "select-analytics-period"))
    )
    Select(select_element).select_by_value(value)

    def period_applied(d):
        container = d.find_element(By.ID, "report-container")
        if "hidden" in (container.get_attribute("class") or ""):
            return False
        title = d.find_element(By.ID, "report-period-title").text
        return expected_title in title

    try:
        WebDriverWait(driver, timeout).until(period_applied)
    except TimeoutException:
        pytest.fail(
            f"Период {value} не применился, ожидался заголовок "
            f"«{expected_title}», адрес: {driver.current_url}"
        )


def open_students(driver, query="", timeout=10):
    suffix = f"?{query}" if query else ""
    driver.get(app_url(f"students/{suffix}"))
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


def open_student_page(driver, student_id, timeout=10):
    driver.get(app_url(f"student/?id={student_id}"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )


def absence_confirm_button(driver, date_iso, timeout=10):
    xpath = (
        "//button[contains(@class,'btn-confirm-absence-action') "
        f"and @data-date='{date_iso}']"
    )
    try:
        return WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH, xpath))
        )
    except TimeoutException:
        pytest.fail(f"Нет кнопки подтверждения пропуска за {date_iso}")


def wait_absence_modal(driver, timeout=10):
    def modal_opened(d):
        modal = d.find_element(By.ID, "modal-confirm-student-absence")
        return "opacity-100" in (modal.get_attribute("class") or "")

    WebDriverWait(driver, timeout).until(modal_opened)


def wait_absence_status(driver, date_ru, status_text, timeout=10):
    def row_with_status(d):
        rows = d.find_elements(
            By.XPATH,
            "//*[@id='student-summary-view']//div[contains(@class,'py-3.5')]",
        )
        for row in rows:
            if date_ru in row.text and status_text in row.text:
                return row
        return False

    try:
        return WebDriverWait(driver, timeout).until(row_with_status)
    except TimeoutException:
        pytest.fail(
            f"Пропуск за {date_ru} не получил статус «{status_text}»"
        )


def normalized(text):
    return text.replace(",", ".").replace("\u00a0", " ")


def lowered(text):
    return normalized(text).lower()


def test_anl_13_risk_zone_recalculated(driver):
    """Проверяет состав зоны риска и пересчёт после исправления пропусков."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    text = lowered(report_text(driver))
    assert "ученики в зоне риска (5)" in text, (
        "В отчёте за I четверть ожидалось 5 учеников в зоне риска"
    )
    for name, reason in RISK_REASONS:
        assert name.lower() in text, f"В зоне риска нет ученика «{name}»"
        assert reason.lower() in text, (
            f"Для «{name}» не указана причина «{reason}»"
        )
    assert "пропуски > 20% или средний балл < 3.5" in text, (
        "В отчёте нет подписи о правилах зоны риска"
    )

    groups = lowered(risk_groups_text(driver))
    assert "критический риск (2)" in groups, (
        f"Ожидалось 2 ученика критического риска: «{groups}»"
    )
    assert "умеренный риск (3)" in groups, (
        f"Ожидалось 3 ученика умеренного риска: «{groups}»"
    )
    assert "успешная зона (23)" in groups, (
        f"Ожидалось 23 ученика вне зоны риска: «{groups}»"
    )

    changed = driver.execute_script(MOROZOV_ABSENCES_TO_PRESENT)
    assert changed == 9, (
        f"У Морозова А. ожидалось 9 пропусков, изменено {changed}"
    )

    click_sidebar_item(driver, "nav-students", "students-table-wrapper")
    click_sidebar_item(driver, "nav-analytics", "analytics-view")

    wait_risk_groups_contains(driver, "Умеренный риск (2)")
    groups = lowered(risk_groups_text(driver))
    assert "критический риск (2)" in groups, (
        f"После исправления пропусков критический риск изменился: «{groups}»"
    )
    assert "успешная зона (24)" in groups, (
        f"После исправления пропусков успешная зона должна быть 24: «{groups}»"
    )

    generate_report(driver)
    text = lowered(report_text(driver))
    assert "ученики в зоне риска (4)" in text, (
        "После исправления пропусков Морозова А. в отчёте должно остаться "
        "4 ученика в зоне риска"
    )


def test_anl_14_unconfirmed_absences(driver):
    """Проверяет счётчик неподтверждённых пропусков и статусы в отчёте."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    count = report_metric_text(driver, "report-metric-unconfirmed")
    assert count == "4", (
        f"За I четверть ожидалось 4 неподтверждённых пропуска, получено «{count}»"
    )

    text = lowered(report_text(driver))
    assert "ожидают справок или заявлений" in text, (
        "В отчёте нет подписи к метрике неподтверждённых пропусков"
    )

    pending = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[@id='report-container']//tbody/tr["
                "td[1][normalize-space()='2024-10-24'] and "
                "td[2][contains(normalize-space(.), 'Петрова Анна')]]",
            )
        )
    )
    assert "Ожидает" in pending.text, (
        f"Пропуск Петровой А. за 24.10.2024 должен ожидать подтверждения: "
        f"«{pending.text}»"
    )

    confirmed = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[@id='report-container']//tbody/tr["
                "td[1][normalize-space()='2024-10-25'] and "
                "td[2][contains(normalize-space(.), 'Петрова Анна')]]",
            )
        )
    )
    assert "Подтверждён" in confirmed.text, (
        f"Пропуск Петровой А. за 25.10.2024 должен быть подтверждён: "
        f"«{confirmed.text}»"
    )


def test_anl_15_report_not_stored(driver):
    """Проверяет пересчёт отчёта после добавления новой оценки."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    text = normalized(report_text(driver))
    assert "303 оценок за период" in text, (
        f"За I четверть ожидалось 303 оценки: «{text[:300]}»"
    )

    total = driver.execute_script(ADD_GRADE)
    assert total == 304, (
        f"После добавления оценки в журнале должно быть 304 оценки, "
        f"получено {total}"
    )

    click_sidebar_item(driver, "nav-students", "students-table-wrapper")
    click_sidebar_item(driver, "nav-analytics", "analytics-view")
    generate_report(driver)

    text = normalized(report_text(driver))
    assert "304 оценок за период" in text, (
        "После добавления оценки отчёт не пересчитался: ожидалось 304 оценки"
    )
    assert "Отчёт сформирован динамически" in text, (
        "В отчёте нет подписи о динамическом расчёте"
    )


def test_anl_20_excused_absence_stays_absence(driver):
    """Проверяет, что уважительная причина не уменьшает число пропусков."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_students(driver)
    row = search_student(driver, "Сидоров", "st-14")
    before = row_cell(row, 4).text.strip()
    assert "12 из 40" in before, (
        f"До подтверждения у Сидорова Н. ожидалось «12 из 40», "
        f"получено «{before}»"
    )

    open_student_page(driver, "st-14")
    absence_confirm_button(driver, "2024-10-22").click()
    wait_absence_modal(driver)

    doc_input = driver.find_element(By.ID, "confirm-doc-text-input")
    doc_input.clear()
    doc_input.send_keys("Справка № 42 от 22.10.2024")
    driver.find_element(
        By.CSS_SELECTOR, "#form-confirm-student-absence button[type='submit']"
    ).click()

    wait_absence_status(driver, "22.10.2024", "Подтверждено")

    open_students(driver)
    row = search_student(driver, "Сидоров", "st-14")
    after = row_cell(row, 4).text.strip()
    assert "12 из 40" in after, (
        f"После подтверждения уважительной причины пропуски Сидорова Н. "
        f"должны остаться «12 из 40», получено «{after}»"
    )
    assert "из 42" not in after, (
        f"Пропуски посчитаны от уроков расписания: «{after}»"
    )


def test_anl_22_empty_period_no_defaults(driver):
    """Проверяет прочерки за период без данных и возврат к I четверти."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "holidays_nov_2024")
    generate_report(driver)

    average = report_metric_text(driver, "report-metric-avg")
    assert average == "—", (
        f"За период без оценок средний балл должен быть прочерком, "
        f"получено «{average}»"
    )

    attendance = report_metric_text(driver, "report-metric-att")
    assert attendance == "—", (
        f"За период без отметок посещаемость должна быть прочерком, "
        f"получено «{attendance}»"
    )
    attendance_card = driver.find_element(
        By.XPATH, "//*[@id='report-metric-att']/parent::div"
    )
    assert "Нет данных" in normalized(attendance_card.text), (
        "У прочерка посещаемости нет подписи «Нет данных»"
    )

    assert report_metric_text(driver, "report-metric-unconfirmed") == "0", (
        "За период без данных неподтверждённых пропусков должно быть 0"
    )
    assert report_metric_text(driver, "report-metric-risk") == "0", (
        "За период без данных учеников в зоне риска должно быть 0"
    )
    text = lowered(report_text(driver))
    assert "учеников в зоне риска за данный период нет" in text, (
        "Для пустой зоны риска нет пояснения, что учеников нет"
    )

    select_period(driver, "q1_2024", "I четверть")
    assert report_metric_text(driver, "report-metric-avg") == "4.2", (
        "После возврата к I четверти средний балл должен быть 4,2"
    )
    assert "93.6%" in report_metric_text(driver, "report-metric-att"), (
        "После возврата к I четверти посещаемость должна быть 93,6 %"
    )
    assert report_metric_text(driver, "report-metric-risk") == "5", (
        "После возврата к I четверти в зоне риска должно быть 5 учеников"
    )
