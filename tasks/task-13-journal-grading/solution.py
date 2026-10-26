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
PASSWORD = "Test#2024"

OPEN_LESSON = "lsn-39"
CLOSED_LESSON = "lsn-36"
EXPECTED_MATH_GRADES = 87


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


def student_avg(driver, student_id):
    cells = driver.find_elements(
        By.CSS_SELECTOR,
        f".student-avg-cell[data-student-id='{student_id}']",
    )
    if not cells:
        pytest.fail(f"Не найден средний балл ученика {student_id}")
    return normalized(cells[0].text)


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


def wait_for_grade(driver, lesson_id, student_id, value=None, timeout=10):
    def check(db):
        records = grade_records(db, lesson_id, student_id)
        if not records:
            return False
        if value is not None and not any(
            record.get("value") == value for record in records
        ):
            return False
        return records

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


def test_tch_01_single_grade_saved(driver):
    """Проверить выставление оценки одному ученику и её сохранение после
    перезагрузки страницы."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    db = read_db(driver)
    assert len(grade_records(db, OPEN_LESSON)) == 2, (
        "На занятии 24.10 изначально должно быть 2 оценки"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Исходный счётчик оценок по математике не совпадает"

    field = grade_input(driver, OPEN_LESSON, "st-01")
    assert not field.get_property("disabled"), (
        "Поле оценки Александрова Е. недоступно"
    )
    set_input_value(driver, field, "5")
    click_save(driver)

    records = wait_for_grade(driver, OPEN_LESSON, "st-01", 5)
    assert len(records) == 1, (
        f"У Александрова Е. должно быть ровно одна запись: {records}"
    )
    assert records[0].get("teacher") == "Козлов А. П.", (
        f"У оценки Александрова Е. неверный автор: {records}"
    )

    db = read_db(driver)
    assert len(grade_records(db, OPEN_LESSON)) == 3, (
        "На занятии 24.10 после сохранения должно быть 3 оценки"
    )
    for student_id in ("st-02", "st-13"):
        others = grade_records(db, OPEN_LESSON, student_id)
        assert len(others) == 1 and others[0].get("value") == 5, (
            f"Оценка ученика {student_id} изменилась: {others}"
        )

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-01")
    assert field.get_property("value") == "5", (
        "После перезагрузки оценка Александрова Е. не отображается"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES + 1
    ), "После перезагрузки изменился счётчик оценок"


def test_tch_02_bulk_grades_saved(driver):
    """Проверить выставление оценок нескольким ученикам за один урок без
    дублей и потерь."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    grades = {"st-01": "5", "st-16": "4", "st-17": "3"}
    for student_id, value in grades.items():
        field = grade_input(driver, OPEN_LESSON, student_id)
        assert not field.get_property("disabled"), (
            f"Поле оценки ученика {student_id} недоступно"
        )
        set_input_value(driver, field, value)

    click_save(driver)

    for student_id, value in grades.items():
        records = wait_for_grade(
            driver, OPEN_LESSON, student_id, int(value)
        )
        assert len(records) == 1, (
            f"У ученика {student_id} должно быть ровно одна оценка: "
            f"{records}"
        )
        assert records[0].get("teacher") == "Козлов А. П.", (
            f"У оценки ученика {student_id} неверный автор: {records}"
        )

    db = read_db(driver)
    assert len(grade_records(db, OPEN_LESSON)) == 5, (
        f"На занятии 24.10 ожидалось 5 оценок, получено "
        f"{len(grade_records(db, OPEN_LESSON))}"
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


def test_tch_03_grade_value_validation(driver):
    """Проверить допустимые значения оценки и неизменность данных при
    недопустимом значении."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    original = wait_for_grade(driver, OPEN_LESSON, "st-02", 5)
    assert original[0].get("teacher") == "Козлов А. П.", (
        f"У исходной оценки неверный автор: {original}"
    )

    for invalid_value in ("1", "6", "0", "хорошо"):
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

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-02")
    assert field.get_property("value") == "5", (
        "После перезагрузки в клетке нет исходной оценки"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Недопустимые значения изменили счётчик оценок"


def test_tch_04_grade_edit_overwrites(driver):
    """Проверить изменение своей оценки: запись перезаписывается, а не
    добавляется."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    original = wait_for_grade(driver, OPEN_LESSON, "st-02", 5)
    assert len(original) == 1, (
        f"У исходной оценки должно быть ровно одна запись: {original}"
    )

    field = grade_input(driver, OPEN_LESSON, "st-02")
    set_input_value(driver, field, "4")
    click_save(driver)

    records = wait_for_grade(driver, OPEN_LESSON, "st-02", 4)
    assert len(records) == 1, (
        f"После исправления появились дубли оценок: {records}"
    )
    assert records[0].get("value") == 4, (
        f"Исправленная оценка не сохранилась: {records}"
    )
    assert records[0].get("teacher") == "Козлов А. П.", (
        f"После исправления изменился автор оценки: {records}"
    )
    assert records[0].get("updatedAt"), (
        "Не зафиксировано время изменения оценки"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES
    ), "Исправление оценки изменило счётчик"

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-02")
    assert field.get_property("value") == "4", (
        "После перезагрузки исправленная оценка не отображается"
    )


def test_tch_05_deleted_grade_leaves_average(driver):
    """Проверить удаление своей оценки: клетка очищается, а средний балл и
    счётчик уменьшаются."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    db = read_db(driver)
    student_grades = [
        grade
        for grade in db.get("grades", [])
        if grade.get("studentId") == "st-02"
        and grade.get("subjectId") == "math"
        and grade.get("periodId") == "q1_2024"
    ]
    expected_avg = round(
        sum(grade["value"] for grade in student_grades)
        / len(student_grades),
        1,
    )
    assert expected_avg == 4.1, (
        f"Неожиданный исходный средний балл: {expected_avg}"
    )
    assert student_avg(driver, "st-02") == "4.1", (
        "Неожиданный средний балл Беляева М. в журнале"
    )

    field = grade_input(driver, OPEN_LESSON, "st-02")
    set_input_value(driver, field, "")
    click_save(driver)

    reload_journal(driver)
    field = grade_input(driver, OPEN_LESSON, "st-02")
    assert field.get_property("value") == "", (
        "После удаления клетка не пуста"
    )
    assert student_avg(driver, "st-02") == "4.0", (
        "Средний балл не пересчитан после удаления оценки"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_MATH_GRADES - 1
    ), "Счётчик оценок не уменьшился после удаления"

    db = read_db(driver)
    assert not grade_records(db, OPEN_LESSON, "st-02"), (
        "Удалённая оценка осталась в данных"
    )


def test_tch_06_closed_lesson_is_read_only(driver):
    """Проверить, что закрытое занятие доступно только для просмотра, а
    комментарий к нему добавить можно."""
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

    set_input_value(driver, field, "2")
    click_save(driver)
    reload_journal(driver)
    field = grade_input(driver, CLOSED_LESSON, "st-01")
    assert field.get_property("value") == "5", (
        "На закрытом занятии оценка изменилась"
    )

    open_cell_modal(driver, CLOSED_LESSON, "st-01")
    assert "Математика" in normalized(
        driver.find_element(By.ID, "entry-modal-subject").text
    ), "Карточка записи открыта не для математики"
    assert "Оценка: 5" in normalized(
        driver.find_element(By.ID, "entry-modal-grade-badge").text
    ), "В карточке записи нет оценки 5"

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


def test_tch_09_grade_blocked_for_absent(driver):
    """Проверить, что ученику с отметкой отсутствия оценка не выставляется."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    field = grade_input(driver, OPEN_LESSON, "st-23")
    assert field.get_property("disabled"), (
        "Отсутствующему ученику доступно поле оценки"
    )
    assert "Ученик отсутствовал" in normalized(
        field.get_attribute("title") or ""
    ), "Поле оценки не поясняет, что ученик отсутствовал"

    set_input_value(driver, field, "4")
    click_save(driver)

    db = read_db(driver)
    assert not grade_records(db, OPEN_LESSON, "st-23"), (
        "Отсутствующему ученику сохранена оценка"
    )
    absence = [
        record
        for record in db.get("attendance", [])
        if record.get("lessonId") == OPEN_LESSON
        and record.get("studentId") == "st-23"
    ]
    assert len(absence) == 1, (
        f"Изменилось число записей посещаемости: {absence}"
    )
    assert absence[0].get("value") == "absent", (
        f"Отметка отсутствия изменилась: {absence}"
    )
    assert absence[0].get("status") == "unconfirmed", (
        f"Статус пропуска изменился: {absence}"
    )
