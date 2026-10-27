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
SUBJECT_TEACHER = "kozlov@school.ru"
HOMEROOM_TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"

OPEN_LESSON = "lsn-39"
GRADED_STUDENT = "st-02"
EXPECTED_ALL_LESSONS = 42
EXPECTED_MATH_LESSONS = 9
EXPECTED_ALL_GRADES = 303
EXPECTED_ALL_ABSENCES = 72
TEACHER_CLASSES = ("7Б", "8А", "9В")
FOREIGN_CLASSES = ("6В", "7В")


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


def login(driver, username, password=PASSWORD):
    reset_all(driver)
    submit_login(driver, username, password)
    wait_for_app(driver)


def switch_user(driver, username, password=PASSWORD):
    driver.execute_script(
        "window.localStorage.removeItem('classroom_crm_session');"
    )
    driver.get(app_url("login/"))
    wait_for_login_form(driver)
    submit_login(driver, username, password)
    wait_for_app(driver)


def normalized(text):
    return " ".join((text or "").split())


def wait_until(driver, condition, message, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(condition)
    except TimeoutException:
        pytest.fail(message)


def open_journal(driver, query="", timeout=10):
    path = "journal/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(
                (By.ID, "journal-table-container")
            )
        )
    except TimeoutException:
        body = driver.find_element(By.TAG_NAME, "body").text
        pytest.fail(f"Не открылся раздел «Журнал»: «{normalized(body)}»")


def reload_journal(driver):
    driver.refresh()
    try:
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located(
                (By.ID, "journal-table-container")
            )
        )
    except TimeoutException:
        pytest.fail("Журнал не открылся после перезагрузки страницы")


def lesson_columns(driver):
    headers = driver.find_elements(
        By.CSS_SELECTOR, "#journal-table-container thead th"
    )
    return max(len(headers) - 3, 0)


def journal_stat(driver, element_id):
    text = normalized(driver.find_element(By.ID, element_id).text)
    digits = re.sub(r"\D", "", text)
    return int(digits) if digits else 0


def get_cell(driver, lesson_id, student_id):
    cells = driver.find_elements(
        By.CSS_SELECTOR,
        "td.cell-journal-entry"
        f"[data-lesson-id='{lesson_id}']"
        f"[data-student-id='{student_id}']",
    )
    if not cells:
        pytest.fail(
            f"Не найдена клетка журнала {lesson_id} / {student_id}"
        )
    return cells[0]


def is_modal_open(driver, modal_id="modal-journal-entry"):
    classes = (
        driver.find_element(By.ID, modal_id).get_attribute("class") or ""
    )
    return "opacity-100" in classes and "pointer-events-none" not in classes


def wait_modal_open(driver, modal_id="modal-journal-entry", timeout=10):
    wait_until(
        driver,
        lambda d: is_modal_open(d, modal_id),
        f"Не открылось модальное окно {modal_id}",
        timeout,
    )


def wait_modal_closed(driver, modal_id="modal-journal-entry", timeout=10):
    wait_until(
        driver,
        lambda d: not is_modal_open(d, modal_id),
        f"Не закрылось модальное окно {modal_id}",
        timeout,
    )


def open_cell_modal(driver, lesson_id, student_id):
    cell = get_cell(driver, lesson_id, student_id)
    driver.execute_script(
        "arguments[0].scrollIntoView({ block: 'center' });", cell
    )
    driver.execute_script("arguments[0].click();", cell)
    wait_modal_open(driver)
    wait_entry_modal_ready(driver)


def wait_entry_modal_ready(driver, timeout=10):
    def check(d):
        count = normalized(
            d.find_element(
                By.ID, "entry-modal-comments-count"
            ).text
        )
        return count.isdigit()

    wait_until(
        driver,
        check,
        "Карточка записи не успела отобразить комментарии",
        timeout,
    )


def close_entry_modal(driver):
    driver.find_element(By.ID, "btn-close-journal-modal-footer").click()
    wait_modal_closed(driver)


def comments_text(driver):
    return normalized(
        driver.find_element(
            By.ID, "entry-modal-comments-list"
        ).text
    )


def wait_comments(driver, *expected, timeout=10):
    def check(d):
        text = comments_text(d)
        return all(item in text for item in expected)

    wait_until(
        driver,
        check,
        "Комментарии в карточке записи не отобразились: "
        f"{', '.join(expected)}",
        timeout,
    )
    return comments_text(driver)


def add_comment(driver, text):
    field = driver.find_element(
        By.ID, "input-journal-comment-text"
    )
    field.clear()
    field.send_keys(text)
    driver.find_element(By.ID, "btn-send-journal-comment").click()
    wait_until(
        driver,
        lambda d: text in comments_text(d),
        f"Комментарий не появился в карточке записи: «{text}»",
    )


def comment_delete_buttons(driver):
    return [
        button
        for button in driver.find_elements(
            By.CSS_SELECTOR, "#entry-modal-comments-list button"
        )
        if "удал" in normalized(button.text).lower()
    ]


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def comment_records(db, lesson_id, student_id):
    return [
        record
        for record in (db.get("journalComments") or [])
        if record.get("lessonId") == lesson_id
        and record.get("studentId") == student_id
    ]


def select_options(driver, element_id):
    elements = driver.find_elements(By.ID, element_id)
    if not elements:
        return []
    return [
        normalized(option.text)
        for option in elements[0].find_elements(By.TAG_NAME, "option")
    ]


def select_option(driver, element_id, prefix):
    select = driver.find_element(By.ID, element_id)
    for option in select.find_elements(By.TAG_NAME, "option"):
        text = normalized(option.text)
        if text.startswith(prefix):
            driver.execute_script(
                "arguments[0].value = arguments[1];"
                "arguments[0].dispatchEvent("
                "new Event('change', { bubbles: true }));",
                select,
                option.get_attribute("value"),
            )
            return text
    pytest.fail(
        f"В списке {element_id} нет пункта, начинающегося с «{prefix}»"
    )


def page_text(driver):
    return normalized(driver.find_element(By.TAG_NAME, "body").text)


def test_tch_11_comment_keeps_author_and_time(driver):
    """Проверить, что комментарий предметника сохраняется с автором и
    временем и виден классному руководителю."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    comment = "Не выполнил домашнее задание"
    open_cell_modal(driver, OPEN_LESSON, GRADED_STUDENT)
    add_comment(driver, comment)

    text = wait_comments(driver, comment, "Козлов А. П.", "Предметник")
    assert re.search(r"\d{1,2}:\d{2}", text), (
        f"В комментарии не зафиксировано время: «{text}»"
    )

    db = read_db(driver)
    records = comment_records(db, OPEN_LESSON, GRADED_STUDENT)
    assert len(records) == 1, f"Ожидался один комментарий, получено {records}"
    assert records[0].get("author") == "Козлов А. П.", (
        f"У комментария неверный автор: {records}"
    )
    assert records[0].get("createdAt"), (
        f"У комментария не зафиксировано время: {records}"
    )
    close_entry_modal(driver)

    switch_user(driver, HOMEROOM_TEACHER)
    open_journal(driver)
    open_cell_modal(driver, OPEN_LESSON, GRADED_STUDENT)
    text = wait_comments(driver, comment, "Козлов А. П.", "Предметник")
    assert re.search(r"\d{1,2}:\d{2}", text), (
        f"Классный руководитель не видит время комментария: «{text}»"
    )


def test_tch_12_foreign_comment_cannot_be_deleted(driver):
    """Проверить, что комментарий классного руководителя сохраняется с
    автором и недоступен для удаления предметником."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    comment = "Родители уведомлены, справка ожидается"
    open_cell_modal(driver, OPEN_LESSON, GRADED_STUDENT)
    add_comment(driver, comment)
    wait_comments(driver, comment, "Смирнова М. В.", "Классрук")
    close_entry_modal(driver)

    db = read_db(driver)
    records = comment_records(db, OPEN_LESSON, GRADED_STUDENT)
    assert len(records) == 1, f"Ожидался один комментарий, получено {records}"
    assert records[0].get("author") == "Смирнова М. В.", (
        f"У комментария неверный автор: {records}"
    )

    switch_user(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")
    open_cell_modal(driver, OPEN_LESSON, GRADED_STUDENT)
    wait_comments(driver, comment, "Смирнова М. В.", "Классрук")

    assert not comment_delete_buttons(driver), (
        "Предметнику доступно удаление чужого комментария"
    )

    reload_journal(driver)
    open_cell_modal(driver, OPEN_LESSON, GRADED_STUDENT)
    wait_comments(driver, comment, "Смирнова М. В.")


def test_tch_13_subject_teacher_sees_own_classes(driver):
    """Проверить, что предметнику доступны только его занятия, а чужие
    журналы отклоняются."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    classes = select_options(driver, "select-journal-class")
    assert classes, "Предметнику не показан список классов"
    for class_name in TEACHER_CLASSES:
        assert any(
            class_name in option for option in classes
        ), f"В списке классов нет {class_name}: {classes}"
    for class_name in FOREIGN_CLASSES:
        assert not any(
            class_name in option for option in classes
        ), f"Предметнику доступен чужой класс {class_name}: {classes}"

    subjects = select_options(driver, "select-journal-subject")
    assert subjects, "Предметнику не показан список предметов"
    assert all(
        "Математика" in subject for subject in subjects
    ), f"Предметнику доступны чужие предметы: {subjects}"

    driver.get(app_url("journal/?class=class-6v&subject=math"))
    wait_until(
        driver,
        lambda d: "Доступ ограничен" in page_text(d),
        "Журнал чужого класса открылся предметнику",
    )

    driver.get(app_url("journal/?class=class-7b&subject=rus"))
    wait_until(
        driver,
        lambda d: "Доступ ограничен" in page_text(d),
        "Журнал по чужому предмету открылся предметнику",
    )


def test_tch_15_summary_journal_shows_all_subjects(driver):
    """Проверить сводный журнал по всем предметам и возврат к нему после
    выбора конкретного предмета."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    assert lesson_columns(driver) == EXPECTED_ALL_LESSONS, (
        f"В сводном журнале ожидалось {EXPECTED_ALL_LESSONS} занятий, "
        f"получено {lesson_columns(driver)}"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_ALL_GRADES
    ), "Неверный сводный счётчик оценок"
    assert journal_stat(driver, "stat-total-absences") == (
        EXPECTED_ALL_ABSENCES
    ), "Неверный сводный счётчик пропусков"

    select_option(driver, "select-journal-subject", "Математика")
    wait_until(
        driver,
        lambda d: lesson_columns(d) == EXPECTED_MATH_LESSONS,
        f"После выбора математики ожидалось {EXPECTED_MATH_LESSONS} "
        f"занятий, получено {lesson_columns(driver)}",
    )

    select_option(driver, "select-journal-subject", "Все предметы")
    wait_until(
        driver,
        lambda d: lesson_columns(d) == EXPECTED_ALL_LESSONS,
        "После возврата к сводному журналу занятия не восстановились: "
        f"получено {lesson_columns(driver)}",
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_ALL_GRADES
    ), "Сводный счётчик оценок не восстановился"
    assert journal_stat(driver, "stat-total-absences") == (
        EXPECTED_ALL_ABSENCES
    ), "Сводный счётчик пропусков не восстановился"
