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

PREPARE_DAY_ATTENDANCE = """
const db = window.crmApi.getDB();
const lessonIds = db.lessons
  .filter((lesson) => lesson.date === "2024-10-28")
  .map((lesson) => lesson.id);
const marks = db.attendance.filter((item) => lessonIds.includes(item.lessonId));
for (let index = 0; index < marks.length; index += 1) {
  marks[index].value = index === 0 ? "absent" : "present";
  marks[index].status = index === 0 ? "confirmed" : "present";
}
window.crmApi.saveDB(db);
return { lessonIds, totalMarks: marks.length };
"""

CLEAR_DAY_ATTENDANCE = """
const db = window.crmApi.getDB();
const lessonIds = new Set(
  db.lessons.filter((lesson) => lesson.date === "2024-10-28").map((lesson) => lesson.id)
);
db.attendance = db.attendance.filter((item) => !lessonIds.has(item.lessonId));
window.crmApi.saveDB(db);
return db.attendance.length;
"""

PREPARE_FULL_ATTENDANCE = """
const db = window.crmApi.getDB();
const lesson = db.lessons.find((item) => item.date === "2024-10-28");
if (!lesson) return null;
const students = db.students.filter((student) => student.classId === "class-7b");
const dayLessonIds = new Set(
  db.lessons.filter((item) => item.date === "2024-10-28").map((item) => item.id)
);
db.attendance = db.attendance.filter((item) => !dayLessonIds.has(item.lessonId));
students.forEach((student, index) => {
  db.attendance.push({
    id: `full-${index + 1}`,
    lessonId: lesson.id,
    studentId: student.id,
    date: "2024-10-28",
    value: "present",
    status: "present",
    code: "Был"
  });
});
window.crmApi.saveDB(db);
return students.length;
"""

CONFIRM_ONE_ABSENCE = """
const db = window.crmApi.getDB();
const item = db.attendance.find(
  (record) => record.lessonId === "lsn-40" && record.studentId === "st-23"
);
if (!item) return null;
item.status = "confirmed";
item.code = "УП";
item.reason = "Медицинская справка";
window.crmApi.saveDB(db);
return item.id;
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
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def submit_login(driver):
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(TEACHER)
    password = driver.find_element(By.ID, "login-password")
    password.clear()
    password.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_overview(driver):
    driver.get(app_url("overview/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Посещаемость сегодня')]")
        )
    )



def metric_card(driver, title):
    cards = driver.find_elements(
        By.XPATH,
        f"//span[normalize-space()='{title}']/ancestor::div[contains(@class, 'rounded-2xl')][1]",
    )
    if cards:
        return cards[0]
    pytest.fail(f"На дашборде не найдена метрика «{title}»")


def metric_text(driver, title):
    return " ".join(metric_card(driver, title).text.split())


def unconfirmed_count(driver, period_id="q1_2024"):
    return driver.execute_script(
        "const db = window.crmApi.getDB();"
        "const lessonIds = new Set(db.lessons"
        ".filter((lesson) => lesson.periodId === arguments[0])"
        ".map((lesson) => lesson.id));"
        "return db.attendance.filter((item) => "
        "lessonIds.has(item.lessonId) && "
        "item.status === 'unconfirmed' && item.value === 'absent').length;",
        period_id,
    )


def unconfirmed_metric_count(driver):
    value = metric_card(driver, "Без подтверждения").find_element(
        By.XPATH,
        ".//span[contains(@class, 'text-2xl') and contains(@class, 'font-extrabold')]",
    ).text
    return int(value)


def attendance_metric_rate(driver):
    value = metric_card(driver, "Посещаемость сегодня").find_element(
        By.XPATH,
        ".//span[contains(@class, 'text-2xl') and contains(@class, 'font-extrabold')]",
    ).text
    return float(value.rstrip("%").replace(",", "."))


def attendance_metric_summary(driver):
    return " ".join(metric_card(driver, "Посещаемость сегодня").text.split())


def test_bp_01_teacher_default_screen(driver):
    """Классный руководитель после входа попадает на обзор своего класса."""
    reset_all(driver)
    submit_login(driver)

    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), '7Б класс')]")
        )
    )
    assert "/overview" in driver.current_url, (
        "После входа классного руководителя должен открываться маршрут /overview"
    )
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Обзор класса" in body_text and "7Б класс" in body_text, (
        "После входа должен открываться экран «Обзор класса 7Б»"
    )


def test_bp_02_dashboard_attendance(driver):
    """Посещаемость дашборда учитывает все отметки всех уроков дня."""
    reset_all(driver)
    submit_login(driver)
    prepared = driver.execute_script(PREPARE_DAY_ATTENDANCE)
    assert prepared["totalMarks"] == 56, (
        f"Для проверки ожидалось 56 отметок за день, получено {prepared['totalMarks']}"
    )

    open_overview(driver)
    rate = attendance_metric_rate(driver)
    assert rate == 98.2, f"55 отметок «Был» из 56 должны дать 98,2 %, получено {rate} %"
    assert "из 28 присутствуют" in attendance_metric_summary(driver), (
        "Подпись метрики должна содержать состав класса «из 28 присутствуют»"
    )


def test_bp_03_dashboard_average_delta(driver):
    """Дельта среднего балла сравнивается с прошлой неделей."""
    reset_all(driver)
    submit_login(driver)
    open_overview(driver)

    text = metric_text(driver, "Средний балл класса")
    assert "4.2" in text or "4,2" in text, (
        f"Средний балл класса за I четверть должен быть 4,2: «{text}»"
    )
    assert "+0.1" in text or "+0,1" in text, (
        f"Дельта к прошлой неделе должна быть +0,1: «{text}»"
    )
    assert "к прошлой неделе" in text, (
        "На дашборде должна быть подпись сравнения с прошлой неделей"
    )


def test_bp_04_unconfirmed_metric(driver):
    """Счётчик включает все и только неподтверждённые пропуски."""
    reset_all(driver)
    submit_login(driver)
    open_overview(driver)

    assert unconfirmed_count(driver) == 5, "В I четверти должно быть 5 неподтверждённых пропусков"
    assert unconfirmed_metric_count(driver) == 5, (
        "Метрика «Без подтверждения» должна показывать 5 пропусков I четверти"
    )

    link = metric_card(driver, "Без подтверждения").find_element(
        By.XPATH, ".//a[contains(normalize-space(.), 'К журналу')]"
    )
    assert "attendance?filter=unconfirmed" in (link.get_attribute("href") or ""), (
        "Ссылка метрики должна вести в посещаемость с фильтром неподтверждённых пропусков"
    )


def test_bp_05_metrics_recalculated(driver):
    """Метрики не кэшируются и обновляются после изменения журнала."""
    reset_all(driver)
    submit_login(driver)
    open_overview(driver)
    initial_metric_count = unconfirmed_metric_count(driver)
    assert initial_metric_count > 0, "До подтверждения на дашборде должен быть неподтверждённый пропуск"

    confirmed_id = driver.execute_script(CONFIRM_ONE_ABSENCE)
    assert confirmed_id, "Не удалось подтвердить один неподтверждённый пропуск"
    assert unconfirmed_count(driver) == 4, "После изменения в I четверти должно остаться 4 пропуска"

    open_overview(driver)
    assert unconfirmed_metric_count(driver) == initial_metric_count - 1, (
        "После подтверждения дашборд должен уменьшить число неподтверждённых пропусков на 1"
    )


def test_bp_36_attendance_boundaries(driver):
    """Дашборд безопасно обрабатывает пустую выборку и полную явку."""
    reset_all(driver)
    submit_login(driver)
    driver.execute_script(CLEAR_DAY_ATTENDANCE)
    open_overview(driver)

    empty_text = metric_text(driver, "Посещаемость сегодня")
    assert "NaN" not in empty_text, (
        f"При отсутствии отметок метрика не должна содержать NaN: «{empty_text}»"
    )
    assert attendance_metric_rate(driver) == 0, "При отсутствии отметок ожидается 0 %"

    reset_all(driver)
    submit_login(driver)
    count = driver.execute_script(PREPARE_FULL_ATTENDANCE)
    assert count == 28, f"Для полной явки ожидалось 28 учеников, получено {count}"
    open_overview(driver)

    assert attendance_metric_rate(driver) == 100, "При полной явке ожидается 100 %"
    assert "28 из 28 присутствуют" in attendance_metric_summary(driver), (
        "При полной явке подпись должна показывать «28 из 28 присутствуют»"
    )
