import os
import re

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

SUBJECT_AVERAGES = [
    ("Математика", r"\b3\.9\b"),
    ("Русский язык", r"\b4\.3\b"),
    ("Физика", r"\b4(?:\.0)?\b"),
    ("История", r"\b4\.4\b"),
    ("Физкультура", r"\b4\.8\b"),
]

WEEKLY_ABSENCES = [
    ("Нед 1", "2.9%", "4 проп."),
    ("Нед 2", "4.3%", "6 проп."),
    ("Нед 3", "5.7%", "8 проп."),
    ("Нед 4", "10%", "14 проп."),
    ("Нед 5", "5%", "7 проп."),
    ("Нед 6", "5.7%", "8 проп."),
    ("Нед 7", "6.4%", "9 проп."),
    ("Нед 8", "11.4%", "16 проп."),
]


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


def weekly_card(driver, week_label):
    xpath = (
        "//*[@id='report-container']//div[normalize-space(.)='%s']/parent::div"
        % week_label
    )
    try:
        return WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, xpath))
        )
    except TimeoutException:
        pytest.fail(f"В отчёте нет карточки недели «{week_label}»")


def normalized(text):
    return text.replace(",", ".").replace("\u00a0", " ")


def test_anl_06_attendance_denominator(driver):
    """Проверяет знаменатель посещаемости: только отмеченные уроки."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    row = search_student(driver, "Сидоров", "st-14")
    absences = row_cell(row, 4).text.strip()
    assert "12 из 40" in absences, (
        f"У Сидорова Н. ожидалось «12 из 40» по отмеченным урокам, "
        f"получено «{absences}»"
    )
    assert "из 42" not in absences, (
        f"В знаменатель попали неотмеченные уроки расписания: «{absences}»"
    )

    open_summary(driver, "st-14")
    absent_card = normalized(summary_metric_text(driver, "Пропущено"))
    assert "12" in absent_card and "из 40" in absent_card, (
        f"В сводке ожидалось «12 из 40», получено «{absent_card}»"
    )
    assert "из 42" not in absent_card, (
        f"Сводка считает пропуски от уроков расписания: «{absent_card}»"
    )

    attendance = normalized(summary_metric_text(driver, "Посещаемость"))
    assert "70%" in attendance, (
        f"Посещаемость Сидорова Н. должна быть 70,0 %: «{attendance}»"
    )
    assert "30%" in attendance, (
        f"Доля пропусков Сидорова Н. должна быть 30,0 %: «{attendance}»"
    )


def test_anl_08_student_without_grades(driver):
    """Проверяет прочерк и отсутствие зоны риска у ученика без оценок."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "sept_2024")
    selected = Select(
        driver.find_element(By.ID, "select-analytics-period")
    ).first_selected_option.get_attribute("value")
    assert selected == "sept_2024", (
        f"В аналитике не выбран сентябрь, выбрано «{selected}»"
    )
    generate_report(driver)
    assert "Сентябрь" in driver.find_element(
        By.ID, "report-period-title"
    ).text, "Отчёт сформирован не за сентябрь"
    average = report_metric_text(driver, "report-metric-avg")
    assert "4.2" in average, (
        f"Средний балл класса за сентябрь ожидался 4,2: «{average}»"
    )

    open_students(driver, "period=sept_2024")
    row = search_student(driver, "Васильева", "st-16")
    grade = row_cell(row, 3).text.strip()
    assert grade == "—", (
        f"У Васильевой Д. за сентябрь нет оценок, ожидался прочерк, "
        f"получено «{grade}»"
    )
    badges = row.find_elements(
        By.XPATH, ".//span[contains(normalize-space(.), 'В зоне риска')]"
    )
    assert not badges, (
        "Ученик без оценок за период не должен попадать в зону риска по баллу"
    )


def test_anl_09_period_switch_recalculates(driver):
    """Проверяет пересчёт посещаемости при смене периода и возврате."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    assert "I четверть" in driver.find_element(
        By.ID, "report-period-title"
    ).text, "Начальный период отчёта — не I четверть"
    assert "93.6%" in report_metric_text(driver, "report-metric-att"), (
        "За I четверть ожидалась посещаемость 93,6 %"
    )

    select_period(driver, "oct_2024", "Октябрь")
    assert "92.7%" in report_metric_text(driver, "report-metric-att"), (
        "За октябрь ожидалась посещаемость 92,7 %"
    )

    select_period(driver, "sept_2024", "Сентябрь")
    assert "94.4%" in report_metric_text(driver, "report-metric-att"), (
        "За сентябрь ожидалась посещаемость 94,4 %"
    )

    select_period(driver, "q1_2024", "I четверть")
    assert "93.6%" in report_metric_text(driver, "report-metric-att"), (
        "После возврата к I четверти ожидалась посещаемость 93,6 %"
    )


def test_anl_11_subject_averages(driver):
    """Проверяет средние баллы по предметам и порог зоны риска."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    for subject_name, pattern in SUBJECT_AVERAGES:
        card = analytics_subject_card(driver, subject_name)
        assert card is not None, f"В отчёте нет карточки «{subject_name}»"
        text = normalized(card.text)
        assert re.search(pattern, text), (
            f"У предмета «{subject_name}» ожидался средний балл по шаблону "
            f"{pattern}: «{text}»"
        )

    report_text = normalized(
        driver.find_element(By.ID, "report-container").text
    )
    assert "Порог зоны риска: 3.5" in report_text, (
        "В отчёте не указан порог зоны риска 3,5"
    )
    assert "Средний балл всех учеников 7Б по предмету за период" in report_text, (
        "В отчёте нет подписи о способе расчёта средних баллов по предметам"
    )


def test_anl_12_weekly_absences(driver):
    """Проверяет доли пропусков по неделям и подпись о знаменателе."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)

    report_text = normalized(
        driver.find_element(By.ID, "report-container").text
    )
    assert "8 недель I четверти" in report_text, (
        "В отчёте не указано, что за I четверть 8 недель"
    )

    for week_label, rate, count in WEEKLY_ABSENCES:
        card = weekly_card(driver, week_label)
        text = normalized(card.text)
        assert rate in text, (
            f"Для «{week_label}» ожидалась доля пропусков {rate}: «{text}»"
        )
        assert count in text, (
            f"Для «{week_label}» ожидалось «{count}»: «{text}»"
        )

    assert "Доля пропущенных уроков от всех уроков недели" in report_text, (
        "В отчёте нет подписи о знаменателе недельной доли пропусков"
    )
