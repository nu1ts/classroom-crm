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
SUBJECT_TEACHER = "kozlov@school.ru"
PARENT = "petrov@mail.ru"
PASSWORD = "Test#2024"

COUNT_UNCONFIRMED = """
const db = window.crmApi.getDB();
const lessonIds = new Set(
  db.lessons.filter((l) => l.periodId === "q1_2024").map((l) => l.id)
);
return db.attendance.filter(
  (a) =>
    a.status === "unconfirmed" &&
    a.value === "absent" &&
    lessonIds.has(a.lessonId)
).length;
"""

MARK_ONE_ABSENCE = """
const db = window.crmApi.getDB();
const mark = db.attendance.find(
  (a) => a.studentId === "st-01" && a.value === "present"
);
mark.value = "absent";
mark.status = "confirmed";
mark.code = "УП";
mark.reason = "Медицинская справка";
window.crmApi.saveDB(db);
return mark.id;
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


def open_analytics(driver, period_id="q1_2024", extra_query="", timeout=10):
    driver.get(app_url(f"analytics/?periodId={period_id}{extra_query}"))
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(By.ID, "analytics-view")
        or "Доступ ограничен" in d.page_source
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


def analytics_view_shown(driver):
    return bool(driver.find_elements(By.ID, "analytics-view"))


def forbidden_shown(driver):
    return "Доступ ограничен" in driver.page_source


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


def open_child_page(driver, timeout=10):
    driver.get(app_url("child/"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "child-view-container"))
    )


def child_average_text(driver):
    try:
        element = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//span[contains(normalize-space(.), 'Средний балл:')]")
            )
        )
    except TimeoutException:
        pytest.fail("На странице ребёнка нет показателя «Средний балл»")
    return element.text.strip()


def child_subject_average(driver, subject_name):
    for row in driver.find_elements(By.CSS_SELECTOR, "#child-grades-table tbody tr"):
        cells = row.find_elements(By.CSS_SELECTOR, "td")
        if len(cells) >= 3 and subject_name in cells[0].text:
            return cells[2].text.strip()
    return None


def test_anl_14_unconfirmed_counter(driver):
    """Проверяет счётчик неподтверждённых пропусков в отчёте."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    before = driver.execute_script(COUNT_UNCONFIRMED)
    assert before == 4, (
        f"За I четверть ожидалось 4 неподтверждённых пропуска, получено {before}"
    )

    open_student_page(driver, "st-23")
    confirm_absence(driver, "2024-10-24")

    after = driver.execute_script(COUNT_UNCONFIRMED)
    assert after == 3, (
        f"После подтверждения пропуска ожидалось 3 неподтверждённых пропуска, "
        f"получено {after}"
    )

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    value = report_metric_text(driver, "report-metric-unconfirmed")
    assert value == "3", (
        f"В отчёте должно остаться 3 неподтверждённых пропуска, получено «{value}»"
    )


def test_anl_15_report_not_cached(driver):
    """Проверяет UI и данные: отчёт заново строится после изменения журнала."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    assert report_metric_text(driver, "report-metric-att") == "93.6%", (
        "1048 посещений из 1120 отметок дают 93,6 %"
    )
    report = driver.execute_script("return window.crmApi.getDB().classReports || null;")
    assert not report, "Динамический отчёт не должен сохраняться в classroom_crm_db"

    marked = driver.execute_script(MARK_ONE_ABSENCE)
    assert marked, "Не удалось изменить отметку о посещаемости"

    open_analytics(driver, "q1_2024")
    generate_report(driver)
    value = report_metric_text(driver, "report-metric-att")
    assert value == "93.5%", (
        f"После нового пропуска отчёт должен показать 93,5 %, получено «{value}»"
    )
    report = driver.execute_script("return window.crmApi.getDB().classReports || null;")
    assert not report, "Повторное формирование отчёта не должно создавать кэш в БД"
    assert "Отчёт сформирован динамически" in driver.find_element(
        By.ID, "report-container"
    ).text, "На экране должна быть подпись о динамическом расчёте"
    assert "classReports" not in driver.execute_script(
        "return window.localStorage.getItem('classroom_crm_db');"
    ), "В localStorage не должна появиться сохранённая копия отчёта"


def test_anl_16_teacher_own_class_only(driver):
    """Проверяет, что классный руководитель работает только со своим классом."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024", "&classId=class-7b")
    assert analytics_view_shown(driver), (
        "Классный руководитель должен открывать аналитику своего класса"
    )
    assert not forbidden_shown(driver), (
        "Аналитика своего класса доступна без сообщения об отказе"
    )

    open_analytics(driver, "q1_2024", "&classId=class-8a")
    assert forbidden_shown(driver), (
        "При запросе чужого класса ожидалось сообщение «Доступ ограничен»"
    )
    assert not analytics_view_shown(driver), (
        "При запросе чужого класса отчёт строиться не должен"
    )


def test_anl_17_subject_teacher_subjects(driver):
    """Проверяет аналитику предметника только в пределах его нагрузки."""
    reset_all(driver)
    submit_login(driver, SUBJECT_TEACHER, PASSWORD)
    wait_for_app(driver)

    open_analytics(driver, "q1_2024", "&classId=class-7b&subjectId=math")
    assert analytics_view_shown(driver), (
        "Предметник должен открывать аналитику своего предмета в своём классе"
    )
    assert not forbidden_shown(driver), "Своя нагрузка не должна быть запрещена"
    report_text = driver.find_element(By.ID, "analytics-view").text
    assert "Математика (Алгебра)" in report_text, (
        "В аналитике 7Б должна быть доступна математика из нагрузки Козлова"
    )
    assert "Физика" not in report_text and "Русский язык" not in report_text, (
        "В аналитике предметника не должны отображаться чужие предметы"
    )

    open_analytics(driver, "q1_2024", "&classId=class-8a&subjectId=math")
    assert analytics_view_shown(driver), (
        "Предметник должен открывать математику в другом своём классе"
    )
    assert not forbidden_shown(driver), "Класс из нагрузки не должен быть запрещён"

    open_analytics(driver, "q1_2024", "&classId=class-7b&subjectId=phys")
    assert analytics_view_shown(driver), (
        "Запрос чужого предмета должен остаться на безопасном экране аналитики"
    )
    report_text = driver.find_element(By.ID, "analytics-view").text
    assert "Нет данных по выбранному предмету" in report_text, (
        "Для предмета вне нагрузки должно быть сообщение об отсутствии данных"
    )
    assert "Физика" not in report_text and "Русский язык" not in report_text, (
        "Запрос чужого предмета не должен раскрывать его оценки или показатели"
    )

    open_analytics(driver, "q1_2024", "&classId=class-9v&subjectId=math")
    assert analytics_view_shown(driver), "Предметнику доступен класс 9В из нагрузки"
    assert "Алгебра" in driver.find_element(By.ID, "analytics-view").text, (
        "Для 9В должна отображаться алгебра из нагрузки Козлова"
    )

    open_analytics(driver, "q1_2024", "&classId=class-7v&subjectId=math")
    assert forbidden_shown(driver), (
        "Класс вне нагрузки предметника должен быть полностью запрещён"
    )
    assert not analytics_view_shown(driver), (
        "При запросе чужого класса аналитика не должна раскрывать данные"
    )


def test_anl_18_parent_child_metrics(driver):
    """Проверяет, что родитель видит показатели своего ребёнка."""
    reset_all(driver)
    submit_login(driver, PARENT, PASSWORD)
    wait_for_app(driver)

    open_child_page(driver)

    value = child_average_text(driver)
    assert "4.50" in value, (
        f"У Петровой А. ожидался средний балл 4,50, получено «{value}»"
    )

    math = child_subject_average(driver, "Математика")
    assert math is not None, "В таблице оценок нет предмета «Математика»"
    assert "3.20" in math, (
        f"По математике у Петровой А. ожидалось 3,20, получено «{math}»"
    )
