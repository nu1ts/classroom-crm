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


def wait_for_login_form(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


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


def open_report(driver):
    driver.get(app_url("analytics/?periodId=q1_2024"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "analytics-view"))
    )
    driver.find_element(By.ID, "btn-generate-report").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "report-period-title"))
    )


def report_cards_for_student(driver, full_name):
    return driver.find_elements(
        By.CSS_SELECTOR,
        f".risk-student-card:has(a[href='/student?id={student_id_for_name(full_name)}'])",
    )


def student_id_for_name(full_name):
    return {
        "Сидоров Никита Артёмович": "st-14",
        "Морозов Артём Андреевич": "st-09",
        "Котов Максим Денисович": "st-06",
    }[full_name]


def set_confirmed_absence_in_report_period(driver):
    driver.execute_script(
        """
        const db = window.crmApi.getDB();
        const mark = db.attendance.find(
          (item) => item.studentId === "st-14" && item.value === "present"
        );
        if (!mark) throw new Error("Не найдена отметка присутствия для подготовки проверки");
        const lesson = db.lessons.find((item) => item.id === mark.lessonId);
        if (!lesson) throw new Error("Не найден урок для подготовки проверки");
        mark.value = "absent";
        mark.status = "confirmed";
        mark.code = "УП";
        mark.reason = "Справка: контрольная запись";
        mark.date = "2024-10-25";
        lesson.date = "2024-10-25";
        lesson.periodId = "q1_2024";
        lesson.classId = "class-7b";
        lesson.isMarked = true;
        lesson.status = "closed";
        window.crmApi.saveDB(db);
        """
    )


def test_bp_11_absences_breakdown(driver):
    """Проверяет, что подтверждённый пропуск не дублируется в сводном списке."""
    reset_all(driver)
    submit_login(driver)
    set_confirmed_absence_in_report_period(driver)
    open_report(driver)

    rows = driver.find_elements(
        By.XPATH,
        "//tbody/tr[.//td[normalize-space()='Справка: контрольная запись']]",
    )
    assert len(rows) == 1, (
        "Подтверждённый пропуск должен быть учтён один раз, "
        f"но в сводном списке найдено строк: {len(rows)}"
    )
    assert "Подтверждён" in rows[0].text, (
        "Для подтверждённого пропуска должен отображаться статус «Подтверждён»: "
        f"«{rows[0].text}»"
    )


def test_bp_12_subject_average_threshold(driver):
    """Проверяет видимое указание порога среднего балла 3,5."""
    reset_all(driver)
    submit_login(driver)
    open_report(driver)

    report = driver.find_element(By.ID, "report-container").text
    assert "Порог зоны риска: 3.5" in report, (
        "В отчёте по предметам должен быть указан порог зоны риска 3.5: "
        f"«{report[:800]}»"
    )


def test_bp_13_risk_by_absences(driver):
    """Проверяет попадание учеников в зону риска по пропускам."""
    reset_all(driver)
    submit_login(driver)
    open_report(driver)

    for name in ("Сидоров Никита Артёмович", "Морозов Артём Андреевич"):
        cards = report_cards_for_student(driver, name)
        assert cards, f"В зоне риска должна быть карточка ученика {name}"
        assert any("Пропуски" in card.text for card in cards), (
            f"Для {name} причиной риска должны быть пропуски: "
            f"«{[card.text for card in cards]}»"
        )


def test_bp_14_risk_by_average(driver):
    """Проверяет независимое попадание в зону риска по среднему баллу."""
    reset_all(driver)
    submit_login(driver)
    open_report(driver)

    cards = report_cards_for_student(driver, "Котов Максим Денисович")
    assert cards, "Котов Максим должен быть показан в зоне риска"
    assert any("Общий средний балл" in card.text for card in cards), (
        "Котов Максим должен попасть в зону риска по среднему баллу независимо "
        f"от пропусков: «{[card.text for card in cards]}»"
    )


def test_bp_15_risk_both_reasons(driver):
    """Проверяет объединение причин риска в одной карточке Сидорова."""
    reset_all(driver)
    submit_login(driver)
    open_report(driver)

    cards = report_cards_for_student(driver, "Сидоров Никита Артёмович")
    matching_cards = [
        card
        for card in cards
        if "Пропуски" in card.text and "Общий средний балл" in card.text
    ]
    assert len(matching_cards) == 1, (
        "Ученик с двумя признаками риска должен быть показан одной карточкой "
        "с обеими причинами, "
        f"получено подходящих карточек: {len(matching_cards)}; "
        f"все карточки: {[card.text for card in cards]}"
    )
