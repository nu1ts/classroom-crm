import os

import pytest
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
HOMEROOM_TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"
LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")


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


def normalized(text):
    return " ".join((text or "").split())


def text_of(element):
    return normalized(element.get_attribute("textContent") or element.text or "")


def wait_until(driver, condition, message, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(condition)
    except TimeoutException:
        pytest.fail(message)


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(EC.visibility_of_element_located(LOGIN_FORM))


def login(driver):
    reset_all(driver)
    driver.find_element(By.ID, "login-email").send_keys(HOMEROOM_TEACHER)
    driver.find_element(By.ID, "login-password").send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(EC.visibility_of_element_located(SIDEBAR))


def open_overview(driver):
    driver.get(app_url("overview/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.CSS_SELECTOR, "#app-content h1"),
        "Не открылась страница обзора класса",
    )


def open_student_summary(driver, student_id="st-23"):
    driver.get(app_url(f"student/?id={student_id}&period=q1_2024"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "student-summary-view"),
        "Не открылась сводка ученика",
    )


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def replace_db(driver, db):
    driver.execute_script(
        "window.localStorage.setItem('classroom_crm_db', JSON.stringify(arguments[0]));",
        db,
    )


def test_bp_20_empty_attention_report(driver):
    """Проверить переход к отчёту при пустом списке внимания."""
    login(driver)
    db = read_db(driver)
    for attendance in db.get("attendance", []):
        attendance["value"] = "present"
        attendance["status"] = "present"
        attendance["code"] = "Был"
    for grade in db.get("grades", []):
        if grade.get("value", 0) < 4:
            grade["value"] = 4
    replace_db(driver, db)

    open_overview(driver)
    empty_state = driver.find_element(By.ID, "empty-risk-zone")
    assert "Учеников в зоне риска за данный период нет" in text_of(empty_state)
    report_button = driver.find_element(By.ID, "btn-overview-go-to-report")
    assert report_button.tag_name == "a"
    assert report_button.get_attribute("href").rstrip("/").endswith("/analytics")
    report_button.click()
    wait_until(
        driver,
        lambda d: "/analytics" in d.current_url.rstrip("/"),
        "Пустой список внимания не переводит к формированию отчёта",
    )


def test_bp_21_attention_cycle(driver):
    """Проверить обработку всех учеников списка без повторного предложения."""
    login(driver)
    open_overview(driver)
    initial_cards = driver.find_elements(By.CSS_SELECTOR, ".risk-card")
    assert len(initial_cards) >= 3
    names = [card.get_attribute("data-student-name") for card in initial_cards]

    for name in names:
        card = driver.find_element(
            By.CSS_SELECTOR,
            f'.risk-card[data-student-name="{name}"]',
        )
        card.find_element(By.CSS_SELECTOR, ".btn-add-note").click()
        wait_until(
            driver,
            lambda d: "opacity-100"
            in (d.find_element(By.ID, "modal-add-note").get_attribute("class") or ""),
            f"Не открылась форма заметки для {name}",
        )
        driver.find_element(By.ID, "note-text").send_keys(f"Обработан: {name}")
        driver.find_element(
            By.CSS_SELECTOR, "#form-add-note button[type='submit']"
        ).click()
        wait_until(
            driver,
            lambda d, student=name: "Обработан"
            in text_of(
                d.find_element(
                    By.CSS_SELECTOR, f'.risk-card[data-student-name="{student}"]'
                )
            ),
            f"Ученик {name} не отмечен обработанным",
        )

    body = text_of(driver.find_element(By.TAG_NAME, "body"))
    assert f"Все {len(names)} учеников списка внимания обработаны!" in body
    assert "К отчёту →" in body
    assert all(
        "Обработан" in text_of(
            driver.find_element(
                By.CSS_SELECTOR, f'.risk-card[data-student-name="{name}"]'
            )
        )
        for name in names
    )


def test_bp_22_student_journal_all_subjects(driver):
    """Проверить состав сводки и журнал оценок по всем предметам ученика."""
    login(driver)
    open_student_summary(driver)
    body = text_of(driver.find_element(By.ID, "student-summary-view"))
    for expected in (
        "Петрова Анна Сергеевна",
        "Средний балл",
        "Пропусков всего",
        "Контакты родителей",
        "История общения с родителями",
    ):
        assert expected in body

    driver.find_element(By.ID, "btn-toggle-grades-journal").click()
    journal = driver.find_element(By.ID, "grades-journal-wrapper")
    assert "hidden" not in (journal.get_attribute("class") or "")
    journal_text = text_of(journal)
    db = read_db(driver)
    subject_ids = {
        grade["subjectId"]
        for grade in db.get("grades", [])
        if grade.get("studentId") == "st-23"
        and (not grade.get("periodId") or grade.get("periodId") == "q1_2024")
    }
    expected_subjects = {
        subject["name"]
        for subject in db.get("subjects", [])
        if subject.get("id") in subject_ids
    }
    assert len(expected_subjects) >= 2
    assert all(subject in journal_text for subject in expected_subjects)


def test_bp_23_contacts_by_student(driver):
    """Проверить, что история ученика не включает контакты другого ребёнка."""
    login(driver)
    db = read_db(driver)
    db.setdefault("parentContacts", []).extend(
        [
            {
                "id": "task30-contact-own",
                "studentId": "st-23",
                "parentId": "pr-23",
                "author": "Смирнова М. В.",
                "date": "2024-10-27",
                "time": "10:00",
                "channel": "phone",
                "channelLabel": "Телефонный звонок",
                "summary": "Контакт по Петровой",
                "agreementReached": True,
            },
            {
                "id": "task30-contact-other",
                "studentId": "st-01",
                "parentId": "pr-23",
                "author": "Смирнова М. В.",
                "date": "2024-10-28",
                "time": "11:00",
                "channel": "chat",
                "channelLabel": "Мессенджер",
                "summary": "Чужой контакт по Сидорову",
                "agreementReached": True,
            },
        ]
    )
    replace_db(driver, db)

    open_student_summary(driver)
    history = driver.find_element(By.ID, "parent-contacts-history-container")
    history_text = text_of(history)
    assert "Контакт по Петровой" in history_text
    assert "Чужой контакт по Сидорову" not in history_text


def test_bp_24_primary_contact_first(driver):
    """Проверить, что основной контакт родителя показан первым."""
    login(driver)
    open_student_summary(driver)
    contacts_block = driver.find_element(
        By.XPATH,
        "//h3[normalize-space()='Контакты родителей']/ancestor::div[contains(@class, 'text-left')][1]//div[contains(@class, 'space-y-3')]",
    )
    contacts = contacts_block.find_elements(By.XPATH, "./div")
    assert len(contacts) >= 2
    first_contact = text_of(contacts[0])
    assert "Петров Сергей Викторович" in first_contact
    assert "+7 999 123-45-63" in first_contact
    assert "Основной контакт" in first_contact
