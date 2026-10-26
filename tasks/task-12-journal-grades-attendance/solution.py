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
CLOSED_LESSON = "lsn-36"
EXPECTED_MATH_GRADES = 87
EXPECTED_ALL_GRADES = 303
EXPECTED_ALL_ABSENCES = 72
EXPECTED_ALL_LESSONS = 42
EXPECTED_ONLY_ENTRIES_LESSONS = 40


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
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.ID, "stat-total-grades"))
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


def header_titles(driver):
    titles = [
        th.get_attribute("title") or ""
        for th in driver.find_elements(
            By.CSS_SELECTOR, "#journal-table-container thead th[title]"
        )
    ]
    return [title for title in titles if "2024-" in title]


def journal_stat(driver, element_id):
    text = normalized(driver.find_element(By.ID, element_id).text)
    digits = re.sub(r"\D", "", text)
    return int(digits) if digits else 0


def find_cell(driver, lesson_id, student_id):
    cells = driver.find_elements(
        By.CSS_SELECTOR,
        "td.cell-journal-entry"
        f"[data-lesson-id='{lesson_id}']"
        f"[data-student-id='{student_id}']",
    )
    return cells[0] if cells else None


def get_cell(driver, lesson_id, student_id):
    cell = find_cell(driver, lesson_id, student_id)
    if cell is None:
        pytest.fail(
            f"Не найдена клетка журнала {lesson_id} / {student_id}"
        )
    return cell


def cell_text(driver, lesson_id, student_id):
    return normalized(get_cell(driver, lesson_id, student_id).text)


def grade_input(driver, lesson_id, student_id):
    cell = get_cell(driver, lesson_id, student_id)
    inputs = cell.find_elements(By.CSS_SELECTOR, ".grade-input")
    if not inputs:
        pytest.fail(
            f"В клетке {lesson_id} / {student_id} нет поля оценки"
        )
    return inputs[0]


def absence_button(driver, lesson_id, student_id):
    cell = get_cell(driver, lesson_id, student_id)
    buttons = cell.find_elements(By.CSS_SELECTOR, ".btn-toggle-absence")
    if not buttons:
        pytest.fail(
            f"В клетке {lesson_id} / {student_id} нет отметки отсутствия"
        )
    return buttons[0]


def set_input_value(driver, element, value):
    driver.execute_script(
        "const el = arguments[0];"
        "const setter = Object.getOwnPropertyDescriptor("
        "  window.HTMLInputElement.prototype, 'value').set;"
        "setter.call(el, arguments[1]);"
        "el.dispatchEvent(new Event('input', { bubbles: true }));",
        element,
        value,
    )


def click_save(driver):
    driver.find_element(By.ID, "btn-save-journal").click()


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def wait_db(driver, predicate, message, timeout=10):
    def check(d):
        db = read_db(d)
        if not db:
            return False
        return predicate(db) or False

    return wait_until(driver, check, message, timeout)


def grade_records(db, lesson_id, student_id=None):
    records = [
        grade
        for grade in db.get("grades", [])
        if grade.get("lessonId") == lesson_id
    ]
    if student_id is not None:
        records = [
            grade
            for grade in records
            if grade.get("studentId") == student_id
        ]
    return records


def attendance_records(db, lesson_id, student_id=None):
    records = [
        record
        for record in db.get("attendance", [])
        if record.get("lessonId") == lesson_id
    ]
    if student_id is not None:
        records = [
            record
            for record in records
            if record.get("studentId") == student_id
        ]
    return records


def wait_for_grade(driver, lesson_id, student_id, value=None, timeout=10):
    def check(db):
        records = grade_records(db, lesson_id, student_id)
        if len(records) != 1:
            return False
        if value is not None and records[0].get("value") != value:
            return False
        return records[0]

    return wait_db(
        driver,
        check,
        f"Оценка {value} для {student_id} не сохранилась",
        timeout,
    )


def wait_for_no_grade(driver, lesson_id, student_id, timeout=10):
    def check(db):
        return not grade_records(db, lesson_id, student_id)

    return wait_db(
        driver,
        check,
        f"Оценка для {student_id} не удалилась",
        timeout,
    )


def wait_for_attendance(
    driver, lesson_id, student_id, value=None, status=None, timeout=10
):
    def check(db):
        records = attendance_records(db, lesson_id, student_id)
        if not records:
            return False
        record = records[-1]
        if value is not None and record.get("value") != value:
            return False
        if status is not None and record.get("status") != status:
            return False
        return record

    return wait_db(
        driver,
        check,
        f"Отметка посещаемости для {student_id} не сохранилась",
        timeout,
    )


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


def accept_alert(driver, timeout=5):
    try:
        WebDriverWait(driver, timeout).until(EC.alert_is_present())
    except TimeoutException:
        pytest.fail("Не показано предупреждение браузера")
    alert = driver.switch_to.alert
    text = alert.text
    alert.accept()
    return text


def wait_absence_status(driver, lesson_id, student_id, status, timeout=10):
    def check(d):
        cell = find_cell(d, lesson_id, student_id)
        if cell is None:
            return False
        buttons = cell.find_elements(
            By.CSS_SELECTOR, ".btn-toggle-absence"
        )
        return bool(buttons) and (
            buttons[0].get_attribute("data-status") == status
        )

    wait_until(
        driver,
        check,
        f"Отметка {student_id} не перешла в состояние {status}",
        timeout,
    )


def wait_cell_text(driver, lesson_id, student_id, expected, timeout=10):
    wait_until(
        driver,
        lambda d: (
            find_cell(d, lesson_id, student_id) is not None
            and expected in cell_text(d, lesson_id, student_id)
        ),
        f"В клетке {lesson_id} / {student_id} нет отметки «{expected}»",
        timeout,
    )


def select_values(driver, element_id):
    elements = driver.find_elements(By.ID, element_id)
    if not elements:
        return []
    return [
        option.get_attribute("value")
        for option in elements[0].find_elements(By.TAG_NAME, "option")
    ]


def fill_field(driver, element_id, text):
    field = driver.find_element(By.ID, element_id)
    field.clear()
    field.send_keys(text)


def test_tch_01_02_grades_saved_and_persisted(driver):
    """Проверить выставление оценок нескольким ученикам и их сохранение
    после перезагрузки."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    assert lesson_columns(driver) == 9, (
        f"У учителя математики ожидалось 9 занятий, получено "
        f"{lesson_columns(driver)}"
    )
    assert any(
        "2024-10-24" in title for title in header_titles(driver)
    ), "В журнале нет занятия 24.10"

    db = read_db(driver)
    assert len(grade_records(db, OPEN_LESSON)) == 2, (
        "На занятии 24.10 изначально должно быть 2 оценки"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Исходный счётчик оценок по математике не совпадает"

    grades = {
        "st-01": "5",
        "st-16": "4",
        "st-17": "3",
    }
    for student_id, value in grades.items():
        field = grade_input(driver, OPEN_LESSON, student_id)
        assert not field.get_property("disabled"), (
            f"Поле оценки ученика {student_id} недоступно"
        )
        set_input_value(driver, field, value)

    click_save(driver)
    wait_for_grade(driver, OPEN_LESSON, "st-01", 5)
    wait_for_grade(driver, OPEN_LESSON, "st-16", 4)
    wait_for_grade(driver, OPEN_LESSON, "st-17", 3)

    db = read_db(driver)
    records = grade_records(db, OPEN_LESSON)
    assert len(records) == 5, (
        f"На занятии 24.10 ожидалось 5 оценок, получено {len(records)}"
    )
    for student_id, value in grades.items():
        student_records = grade_records(
            db, OPEN_LESSON, student_id
        )
        assert len(student_records) == 1, (
            f"У ученика {student_id} должно быть ровно одна оценка: "
            f"{student_records}"
        )
        assert student_records[0].get("value") == int(value), (
            f"У ученика {student_id} сохранена неверная оценка: "
            f"{student_records}"
        )
        assert student_records[0].get("teacher") == "Козлов А. П.", (
            f"У оценки ученика {student_id} неверный автор: "
            f"{student_records}"
        )

    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES + 3
    ), "Счётчик оценок не увеличился на три"

    reload_journal(driver)
    for student_id, value in grades.items():
        field = grade_input(driver, OPEN_LESSON, student_id)
        assert field.get_property("value") == value, (
            f"После перезагрузки у ученика {student_id} нет оценки "
            f"{value}"
        )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES + 3
    ), "После перезагрузки изменился счётчик оценок"


def test_tch_03_04_05_grade_validation_edit_delete(driver):
    """Проверить допустимые значения оценки, исправление и удаление оценки."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Исходный счётчик оценок по математике не совпадает"

    original = wait_for_grade(driver, OPEN_LESSON, "st-02", 5)
    assert original.get("teacher") == "Козлов А. П.", (
        f"У исходной оценки неверный автор: {original}"
    )

    for invalid_value in ("6", "1"):
        field = grade_input(driver, OPEN_LESSON, "st-02")
        set_input_value(driver, field, invalid_value)
        click_save(driver)
        alert_text = accept_alert(driver)
        assert "Недопустимое" in alert_text, (
            f"Неверное предупреждение о значении оценки: «{alert_text}»"
        )
        assert "2" in alert_text and "5" in alert_text, (
            "Предупреждение не сообщает допустимые значения: "
            f"«{alert_text}»"
        )
        db = read_db(driver)
        records = grade_records(db, OPEN_LESSON, "st-02")
        assert len(records) == 1 and records[0].get("value") == 5, (
            "После недопустимого значения изменилась оценка: "
            f"{records}"
        )

    field = grade_input(driver, OPEN_LESSON, "st-02")
    set_input_value(driver, field, "4")
    click_save(driver)
    edited = wait_for_grade(driver, OPEN_LESSON, "st-02", 4)

    db = read_db(driver)
    records = grade_records(db, OPEN_LESSON, "st-02")
    assert len(records) == 1, (
        f"После исправления появились дубли оценок: {records}"
    )
    assert records[0].get("value") == 4, (
        f"Исправленная оценка не сохранилась: {records}"
    )
    assert records[0].get("teacher") == "Козлов А. П.", (
        f"После исправления изменился автор оценки: {records}"
    )
    assert edited.get("value") == 4
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Исправление оценки изменило счётчик"

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-02")
    assert field.get_property("value") == "4", (
        "После перезагрузки исправленная оценка не отображается"
    )

    set_input_value(driver, field, "")
    click_save(driver)
    wait_for_no_grade(driver, OPEN_LESSON, "st-02")

    db = read_db(driver)
    assert not grade_records(db, OPEN_LESSON, "st-02"), (
        "Удалённая оценка осталась в данных"
    )
    assert len(grade_records(db, OPEN_LESSON)) == 1, (
        "После удаления изменилось число оценок занятия"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES - 1
    ), "Счётчик оценок не уменьшился после удаления"

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-02")
    assert field.get_property("value") == "", (
        "После перезагрузки удалённая оценка снова отображается"
    )


def test_tch_06_closed_lesson_read_only_and_comment(driver):
    """Проверить запрет изменения закрытого занятия и возможность
    комментирования."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    field = grade_input(driver, CLOSED_LESSON, "st-01")
    assert field.get_property("disabled"), (
        "На закрытом занятии поле оценки доступно для изменения"
    )
    assert field.get_property("value") == "5", (
        "На закрытом занятии не отображается оценка 5"
    )
    title = normalized(field.get_attribute("title") or "")
    assert "Урок завершён" in title, (
        f"Поле оценки не поясняет, что урок завершён: «{title}»"
    )
    cell = get_cell(driver, CLOSED_LESSON, "st-01")
    assert not cell.find_elements(
        By.CSS_SELECTOR, ".btn-toggle-absence"
    ), "На закрытом занятии доступна отметка отсутствия"

    open_cell_modal(driver, CLOSED_LESSON, "st-01")
    assert "Математика" in normalized(
        driver.find_element(By.ID, "entry-modal-subject").text
    ), "Карточка записи открыта не для математики"
    assert "Оценка: 5" in normalized(
        driver.find_element(By.ID, "entry-modal-grade-badge").text
    ), "В карточке записи нет оценки 5"
    assert "Присутствовал" in normalized(
        driver.find_element(By.ID, "entry-modal-attendance-badge").text
    ), "В карточке записи неверная посещаемость"

    comment = "Закрытый урок: оценка подтверждена"
    add_comment(driver, comment)
    text = wait_comments(
        driver, comment, "Козлов А. П.", "Предметник"
    )
    assert "Козлов А. П." in text, "У комментария не указан автор"
    assert "Предметник" in text, (
        "У комментария не указана роль предметника"
    )

    close_entry_modal(driver)
    open_cell_modal(driver, CLOSED_LESSON, "st-01")
    wait_comments(driver, comment)

    db = read_db(driver)
    comments = [
        item
        for item in db.get("journalComments", [])
        if item.get("lessonId") == CLOSED_LESSON
        and item.get("studentId") == "st-01"
    ]
    assert len(comments) == 1, (
        f"Комментарий сохранился неверно: {comments}"
    )
    assert comments[0].get("text") == comment


def test_tch_07_08_09_absence_rules(driver):
    """Проверить снятие неподтверждённого пропуска, блокировку
    подтверждённого и запрет оценки отсутствующему."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    field = grade_input(driver, OPEN_LESSON, "st-23")
    assert field.get_property("disabled"), (
        "Отсутствующему ученику доступно поле оценки"
    )
    assert "Ученик отсутствовал" in normalized(
        field.get_attribute("title") or ""
    ), "Поле оценки не поясняет, что ученик отсутствовал"

    unconfirmed = absence_button(driver, OPEN_LESSON, "st-23")
    assert unconfirmed.get_attribute("data-status") == (
        "unconfirmed"
    ), "У Петровой А. ожидалась неподтверждённая отметка"
    assert normalized(unconfirmed.text) == "Н", (
        "У Петровой А. ожидалась отметка «Н»"
    )

    confirmed_field = grade_input(driver, OPEN_LESSON, "st-14")
    assert confirmed_field.get_property("disabled"), (
        "У отсутствующего Сидорова Н. доступно поле оценки"
    )
    confirmed = absence_button(driver, OPEN_LESSON, "st-14")
    assert confirmed.get_attribute("data-status") == "confirmed", (
        "У Сидорова Н. ожидалась подтверждённая отметка"
    )
    assert normalized(confirmed.text) == "Б", (
        "У Сидорова Н. ожидалась отметка «Б»"
    )

    confirmed.click()
    alert_text = accept_alert(driver)
    assert "подтверждена" in alert_text.lower(), (
        "Нет сообщения о подтверждении причины: "
        f"«{alert_text}»"
    )
    assert "заблокировано" in alert_text.lower(), (
        "Нет сообщения о блокировке отметки: "
        f"«{alert_text}»"
    )
    assert absence_button(
        driver, OPEN_LESSON, "st-14"
    ).get_attribute("data-status") == "confirmed", (
        "Подтверждённая отметка изменилась после предупреждения"
    )

    unconfirmed.click()
    wait_absence_status(driver, OPEN_LESSON, "st-23", "present")
    field = grade_input(driver, OPEN_LESSON, "st-23")
    assert not field.get_property("disabled"), (
        "После снятия пропуска поле оценки осталось недоступным"
    )
    set_input_value(driver, field, "4")
    click_save(driver)

    record = wait_for_attendance(
        driver, OPEN_LESSON, "st-23", "present", "present"
    )
    assert record.get("code") == "Был", (
        f"После снятия пропуска неверная отметка: {record}"
    )
    grade = wait_for_grade(driver, OPEN_LESSON, "st-23", 4)
    assert grade.get("teacher") == "Козлов А. П."

    db = read_db(driver)
    records = attendance_records(db, OPEN_LESSON)
    assert len(records) == 28, (
        f"После снятия пропуска ожидалось 28 записей, "
        f"получено {len(records)}"
    )
    absent = [item for item in records if item.get("value") == "absent"]
    assert len(absent) == 1, (
        f"После снятия пропуска должен остаться один пропуск: {absent}"
    )
    assert absent[0].get("studentId") == "st-14"
    assert absent[0].get("status") == "confirmed"
    assert not grade_records(db, OPEN_LESSON, "st-14"), (
        "Подтверждённому отсутствующему выставлена оценка"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES + 1
    ), "Счётчик оценок не увеличился после выставления оценки"


def test_tch_10_bulk_absence_idempotent(driver):
    """Проверить массовую отметку отсутствующих и повторное сохранение
    без дублей."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    db = read_db(driver)
    initial_records = attendance_records(db, OPEN_LESSON)
    initial_grades = grade_records(db, OPEN_LESSON)
    assert len(initial_records) == 28, (
        f"Исходно ожидалось 28 записей, получено {len(initial_records)}"
    )
    assert len(initial_grades) == 2, (
        f"Исходно ожидалось 2 оценки, получено {len(initial_grades)}"
    )

    new_absent = ["st-16", "st-17", "st-18"]
    for student_id in new_absent:
        button = absence_button(driver, OPEN_LESSON, student_id)
        assert button.get_attribute("data-status") == "present", (
            f"Ученик {student_id} изначально отмечен отсутствующим"
        )
        button.click()
        wait_absence_status(
            driver, OPEN_LESSON, student_id, "unconfirmed"
        )

    click_save(driver)
    wait_for_attendance(
        driver, OPEN_LESSON, "st-16", "absent", "unconfirmed"
    )

    def signature(db_state):
        records = attendance_records(db_state, OPEN_LESSON)
        return sorted(
            (
                item.get("studentId"),
                item.get("value"),
                item.get("status"),
            )
            for item in records
        )

    db = read_db(driver)
    records = attendance_records(db, OPEN_LESSON)
    assert len(records) == 28, (
        f"После массовой отметки ожидалось 28 записей, "
        f"получено {len(records)}"
    )
    keys = [
        (item.get("lessonId"), item.get("studentId"))
        for item in records
    ]
    assert len(keys) == len(set(keys)), (
        "При сохранении появились дубли записей посещаемости"
    )
    absent = [item for item in records if item.get("value") == "absent"]
    assert len(absent) == 5, (
        f"Ожидалось 5 пропусков, получено {len(absent)}"
    )
    for student_id in new_absent:
        student_records = attendance_records(
            db, OPEN_LESSON, student_id
        )
        assert len(student_records) == 1, (
            f"У ученика {student_id} несколько записей: "
            f"{student_records}"
        )
        assert student_records[0].get("status") == "unconfirmed", (
            f"У ученика {student_id} неверный статус пропуска"
        )
    assert len(grade_records(db, OPEN_LESSON)) == 2, (
        "Массовая отметка отсутствия изменила число оценок"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Массовая отметка отсутствия изменила счётчик оценок"

    before = signature(db)
    click_save(driver)
    db = read_db(driver)
    assert signature(db) == before, (
        "Повторное сохранение изменило записи посещаемости"
    )
    records = attendance_records(db, OPEN_LESSON)
    assert len(records) == 28, (
        "Повторное сохранение добавило дубли записей посещаемости"
    )
    assert len(
        [item for item in records if item.get("value") == "absent"]
    ) == 5


def test_tch_11_14_roles_comments_and_homeroom(driver):
    """Проверить права предметника и классного руководителя, комментарии
    и подтверждение пропуска."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    class_values = select_values(driver, "select-journal-class")
    assert set(class_values) == {"class-7b", "class-8a", "class-9v"}, (
        f"Предметнику доступны чужие классы: {class_values}"
    )
    subject_select = driver.find_element(
        By.ID, "select-journal-subject"
    )
    assert subject_select.get_property("disabled"), (
        "Предметнику доступен выбор чужих предметов"
    )
    assert select_values(driver, "select-journal-subject") == ["math"], (
        f"Предметнику доступны чужие предметы: "
        f"{select_values(driver, 'select-journal-subject')}"
    )
    assert lesson_columns(driver) == 9

    subject_comment = "Предметник: тема усвоена"
    open_cell_modal(driver, OPEN_LESSON, "st-16")
    add_comment(driver, subject_comment)
    wait_comments(
        driver, subject_comment, "Козлов А. П.", "Предметник"
    )
    db = read_db(driver)
    comments = [
        item
        for item in db.get("journalComments", [])
        if item.get("lessonId") == OPEN_LESSON
        and item.get("studentId") == "st-16"
    ]
    assert len(comments) == 1, (
        f"Комментарий предметника сохранился неверно: {comments}"
    )
    assert comments[0].get("author") == "Козлов А. П."
    assert comments[0].get("role") == "subject_teacher"
    assert comments[0].get("createdAt"), (
        "У комментария не сохранено время создания"
    )
    close_entry_modal(driver)

    switch_user(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    assert driver.find_element(
        By.ID, "select-journal-subject"
    ).get_attribute("value") == "all", (
        "Классному руководителю недоступен сводный журнал"
    )
    assert "all" in select_values(
        driver, "select-journal-subject"
    ), "В журнале классного руководителя нет пункта «Все предметы»"
    assert not driver.find_elements(By.ID, "btn-save-journal"), (
        "Классному руководителю доступна кнопка сохранения оценок"
    )
    assert not driver.find_elements(By.CSS_SELECTOR, ".grade-input"), (
        "Классному руководителю доступны поля оценок"
    )
    assert not driver.find_elements(
        By.CSS_SELECTOR, ".btn-toggle-absence"
    ), "Классному руководителю доступны отметки отсутствия"
    assert lesson_columns(driver) == EXPECTED_ALL_LESSONS, (
        f"В сводном журнале ожидалось {EXPECTED_ALL_LESSONS} занятий, "
        f"получено {lesson_columns(driver)}"
    )
    assert cell_text(driver, OPEN_LESSON, "st-23") == "Н", (
        "У Петровой А. не отображается неподтверждённый пропуск"
    )
    assert cell_text(driver, OPEN_LESSON, "st-14") == "Б", (
        "У Сидорова Н. не отображается уважительная причина"
    )

    open_cell_modal(driver, OPEN_LESSON, "st-16")
    wait_comments(driver, subject_comment, "Предметник")
    homeroom_comment = "Классрук: родители уведомлены"
    add_comment(driver, homeroom_comment)
    wait_comments(
        driver, homeroom_comment, "Смирнова М. В.", "Классрук"
    )
    wait_until(
        driver,
        lambda d: normalized(
            d.find_element(
                By.ID, "entry-modal-comments-count"
            ).text
        )
        == "2",
        "В карточке записи должно быть два комментария",
    )
    close_entry_modal(driver)

    open_cell_modal(driver, OPEN_LESSON, "st-23")
    quick_confirm = driver.find_element(
        By.ID, "btn-quick-confirm-absence"
    )
    assert quick_confirm.is_displayed(), (
        "Классному руководителю недоступно подтверждение пропуска"
    )
    quick_confirm.click()
    wait_modal_open(driver, "modal-journal-confirm-absence")

    assert normalized(
        driver.find_element(
            By.ID, "journal-confirm-student-name"
        ).get_attribute("value")
    ) == "Петрова Анна Сергеевна", "В форме подтверждения неверный ученик"
    assert driver.find_element(
        By.ID, "journal-confirm-absence-date"
    ).get_attribute("value") == "2024-10-24", (
        "В форме подтверждения неверная дата пропуска"
    )
    assert "Математика" in normalized(
        driver.find_element(
            By.ID, "journal-confirm-absence-lesson"
        ).get_attribute("value")
    ), "В форме подтверждения неверный урок"
    assert driver.find_element(
        By.ID, "journal-confirm-reason-type"
    ).get_attribute("value") == "excused", (
        "В форме подтверждения выбрана неуважительная причина"
    )
    assert driver.find_element(
        By.ID, "journal-confirm-has-certificate"
    ).get_property("checked"), (
        "В форме подтверждения не отмечен подтверждающий документ"
    )

    document = "Справка № 55 от 24.10.2024"
    fill_field(driver, "journal-confirm-document-text", document)
    fill_field(
        driver,
        "journal-confirm-notes",
        "Подтверждено классным руководителем",
    )
    driver.find_element(
        By.CSS_SELECTOR,
        "#form-journal-confirm-absence button[type='submit']",
    ).click()

    record = wait_for_attendance(
        driver, OPEN_LESSON, "st-23", "absent", "excused"
    )
    assert record.get("code") == "УП", (
        f"После подтверждения неверный код пропуска: {record}"
    )
    assert record.get("document") == document, (
        f"Не сохранено основание пропуска: {record}"
    )
    assert record.get("confirmedBy") == "Смирнова М. В.", (
        f"Не сохранён подтвердивший: {record}"
    )
    wait_cell_text(driver, OPEN_LESSON, "st-23", "Б")

    switch_user(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")
    open_cell_modal(driver, OPEN_LESSON, "st-16")

    text = wait_comments(
        driver,
        subject_comment,
        homeroom_comment,
        "Предметник",
        "Классрук",
    )
    assert subject_comment in text and homeroom_comment in text, (
        f"Предметник не видит оба комментария: «{text}»"
    )
    assert "Предметник" in text and "Классрук" in text, (
        f"У комментариев не указаны роли: «{text}»"
    )
    assert not driver.find_elements(
        By.CSS_SELECTOR, "#entry-modal-comments-list button"
    ), "Предметнику доступно удаление чужого комментария"
    close_entry_modal(driver)

    open_cell_modal(driver, OPEN_LESSON, "st-23")
    assert "Уважительная причина" in normalized(
        driver.find_element(
            By.ID, "entry-modal-attendance-badge"
        ).text
    ), "После подтверждения не отображается уважительная причина"
    details = normalized(
        driver.find_element(
            By.ID, "entry-modal-absence-details"
        ).text
    )
    assert document in details, (
        f"В карточке записи нет основания пропуска: «{details}»"
    )
    assert "Смирнова М. В." in details, (
        f"В карточке записи нет подтвердившего: «{details}»"
    )


def test_tch_15_16_full_grid_and_only_entries(driver):
    """Проверить сводный журнал и фильтр «Показывать только записи»."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    assert driver.find_element(
        By.ID, "select-journal-subject"
    ).get_attribute("value") == "all", (
        "Сводный журнал открыт не по всем предметам"
    )
    assert lesson_columns(driver) == EXPECTED_ALL_LESSONS, (
        f"Ожидалось {EXPECTED_ALL_LESSONS} занятий, получено "
        f"{lesson_columns(driver)}"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_ALL_GRADES
    ), "Неверный сводный счётчик оценок"
    assert journal_stat(driver, "stat-total-absences") == (
        EXPECTED_ALL_ABSENCES
    ), "Неверный сводный счётчик пропусков"

    titles = header_titles(driver)
    for date in ("2024-09-02", "2024-09-26", "2024-10-14", "2024-10-24"):
        assert any(date in title for title in titles), (
            f"В журнале нет занятия {date}"
        )

    assert cell_text(driver, CLOSED_LESSON, "st-01") == "5", (
        "Нет оценки 5 за 21.10 у Александрова Е."
    )
    assert cell_text(driver, "lsn-37", "st-16") == "4", (
        "Нет оценки 4 за 22.10 у Васильевой Д."
    )
    assert cell_text(driver, "lsn-38", "st-01") == "5", (
        "Нет оценки 5 за 23.10 у Александрова Е."
    )
    assert cell_text(driver, OPEN_LESSON, "st-23") == "Н", (
        "Нет отметки «Н» за 24.10 у Петровой А."
    )
    assert cell_text(driver, OPEN_LESSON, "st-14") == "Б", (
        "Нет отметки «Б» за 24.10 у Сидорова Н."
    )
    assert cell_text(driver, "lsn-31", "st-02") == "Б", (
        "Нет отметки «Б» за 14.10 у Беляева М."
    )
    assert cell_text(driver, "lsn-19", "st-17") == "Б", (
        "Нет отметки «Б» за 26.09 у Волковой С."
    )

    only_entries = driver.find_element(
        By.ID, "check-only-entries"
    )
    only_entries.click()
    wait_until(
        driver,
        lambda d: "onlyEntries=true" in d.current_url,
        "Режим «Показывать только записи» не включился",
    )
    wait_until(
        driver,
        lambda d: lesson_columns(d) == EXPECTED_ONLY_ENTRIES_LESSONS,
        f"В режиме «Показывать только записи» ожидалось "
        f"{EXPECTED_ONLY_ENTRIES_LESSONS} занятий, получено "
        f"{lesson_columns(driver)}",
    )
    assert any(
        "2024-10-14" in title for title in header_titles(driver)
    ), "Режим «Показывать только записи» скрыл занятие с пропусками"
    assert cell_text(driver, "lsn-31", "st-02") == "Б", (
        "Режим «Показывать только записи» скрыл отметку пропуска"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_ALL_GRADES
    ), "Фильтр изменил сводный счётчик оценок"
    assert journal_stat(driver, "stat-total-absences") == (
        EXPECTED_ALL_ABSENCES
    ), "Фильтр изменил сводный счётчик пропусков"

    driver.find_element(By.ID, "check-only-entries").click()
    wait_until(
        driver,
        lambda d: lesson_columns(d) == EXPECTED_ALL_LESSONS,
        "После выключения фильтра не вернулись все занятия",
    )
