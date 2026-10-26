import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"


@pytest.fixture(scope="module")
def driver():
    """Создаёт браузер Chrome и закрывает его после выполнения проверок."""
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


def wait_until(driver, condition, message, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(condition)
    except Exception as error:
        pytest.fail(f"{message}: {error}")


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    driver.get(app_url("login/"))
    wait_until(
        driver,
        EC.visibility_of_element_located((By.ID, "login-form")),
        "Не открылась форма входа",
    )


def login_as_teacher(driver):
    reset_all(driver)
    driver.find_element(By.ID, "login-email").send_keys(TEACHER)
    driver.find_element(By.ID, "login-password").send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    wait_until(
        driver,
        EC.visibility_of_element_located((By.ID, "app-sidebar")),
        "После входа не открылось приложение",
    )


def open_analytics(driver, query=""):
    driver.get(app_url(f"analytics/{query}"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "analytics-view")
        or "Доступ ограничен" in d.page_source,
        "Не открылся раздел аналитики",
    )


def generate_report(driver):
    button = wait_until(
        driver,
        EC.element_to_be_clickable((By.ID, "btn-generate-report")),
        "Не найдена кнопка формирования отчёта",
    )
    assert button is not None
    button.click()
    return wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "report-container")
        and "hidden" not in (d.find_element(By.ID, "report-container").get_attribute("class") or ""),
        "Отчёт не открылся",
    )


def report_text(driver):
    return normalized(driver.find_element(By.ID, "report-container").text)


def report_metric(driver, metric_id):
    return normalized(driver.find_element(By.ID, metric_id).text)


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def add_grades_that_change_displayed_average(driver, value=5, count=20):
    """Добавляет достаточно оценок, чтобы изменение пережило округление до десятых."""
    driver.execute_script(
        "const db = JSON.parse(window.localStorage.getItem('classroom_crm_db'));"
        "for (let index = 0; index < arguments[1]; index += 1) {"
        "  db.grades.push({"
        "    id: `report-test-grade-${index}`, studentId: 'st-23', classId: 'class-7b',"
        "    subjectId: 'sub-math', value: arguments[0], date: '2024-10-25', periodId: 'q1_2024'"
        "  });"
        "}"
        "window.localStorage.setItem('classroom_crm_db', JSON.stringify(db));",
        value,
        count,
    )


def prepare_boundary_attendance(driver):
    """Создаёт изолированную выборку с двумя отметками в последний день периода."""
    driver.execute_script(
        "const db = JSON.parse(window.localStorage.getItem('classroom_crm_db'));"
        "db.lessons = (db.lessons || []).filter((lesson) => "
        "  (lesson.classId || 'class-7b') !== 'class-7b'"
        ");"
        "db.attendance = (db.attendance || []).filter((row) => "
        "  !String(row.lessonId || '').startsWith('report-boundary-')"
        ");"
        "db.lessons.push({"
        "  id: 'report-boundary-lesson', classId: 'class-7b', subjectId: 'sub-math',"
        "  subjectName: 'Математика (Алгебра)', date: '2024-10-25', periodId: 'q1_2024',"
        "  lessonNumber: 99, isMarked: true, status: 'closed'"
        "});"
        "db.attendance.push("
        "  {id: 'report-boundary-present', lessonId: 'report-boundary-lesson', studentId: 'st-01', date: '2024-10-25', value: 'present'},"
        "  {id: 'report-boundary-absent', lessonId: 'report-boundary-lesson', studentId: 'st-02', date: '2024-10-25', value: 'absent', status: 'unconfirmed'}"
        ");"
        "window.localStorage.setItem('classroom_crm_db', JSON.stringify(db));"
    )


def test_bp_31_report_period(driver):
    """Отчёт за I четверть содержит показатели, полный период и печать."""
    login_as_teacher(driver)
    open_analytics(driver, "?periodId=q1_2024")
    generate_report(driver)

    text = report_text(driver)
    assert "Отчёт по успеваемости и посещаемости 7Б класса" in text
    assert "I четверть (02.09–25.10.2024)" in text, (
        f"В заголовке отчёта указан неверный период: «{text[:500]}»"
    )
    for metric_id in (
        "report-metric-avg",
        "report-metric-att",
        "report-metric-unconfirmed",
        "report-metric-risk",
    ):
        assert report_metric(driver, metric_id) != "", f"Пустая метрика {metric_id}"
    assert driver.find_elements(By.ID, "btn-print-report"), (
        "В отчёте нет кнопки «Печать / Экспорт»"
    )


def test_bp_32_report_not_cached(driver):
    """Отчёт повторно строится из журнала и не сохраняется в базе."""
    login_as_teacher(driver)
    open_analytics(driver, "?periodId=q1_2024")
    generate_report(driver)
    first_average = report_metric(driver, "report-metric-avg")

    driver.find_element(By.ID, "btn-close-report").click()
    generate_report(driver)
    assert report_metric(driver, "report-metric-avg") == first_average, (
        "Повторный отчёт без изменения журнала дал другие показатели"
    )

    add_grades_that_change_displayed_average(driver, 5)
    driver.refresh()
    wait_until(
        driver,
        EC.visibility_of_element_located((By.ID, "analytics-view")),
        "Аналитика не обновилась после изменения журнала",
    )
    generate_report(driver)
    updated_average = report_metric(driver, "report-metric-avg")
    assert updated_average != first_average, (
        "После новой оценки средний балл отчёта не пересчитался"
    )

    db = read_db(driver) or {}
    assert not db.get("classReports"), (
        f"В базе не должно быть сохранённых отчётов: {db.get('classReports')}"
    )


def test_bp_33_report_period_boundaries(driver):
    """Посещаемость включает отметки занятия последнего дня периода."""
    login_as_teacher(driver)
    prepare_boundary_attendance(driver)

    open_analytics(driver, "?periodId=week_21_25_10")
    generate_report(driver)
    actual_text = report_metric(driver, "report-metric-att")
    assert actual_text == "50%", (
        "Посещаемость отчёта за 21–25.10 должна учитывать две отметки "
        "занятия 25.10: одну «Был» и одну «Отсутствовал»"
    )


def test_bp_35_teacher_own_class(driver):
    """Классный руководитель не открывает аналитику и отчёт чужого класса."""
    login_as_teacher(driver)
    open_analytics(driver, "?classId=class-8a")

    body_text = normalized(driver.find_element(By.TAG_NAME, "body").text)
    assert "Доступ ограничен" in body_text, (
        "Классный руководитель 7Б не получил отказ при открытии аналитики 8А: "
        f"«{body_text[:500]}»"
    )
    assert not driver.find_elements(By.ID, "analytics-view"), (
        "При доступе к чужому классу отображается аналитика"
    )
    assert not driver.find_elements(By.ID, "report-container"), (
        "При доступе к чужому классу отображается отчёт"
    )
