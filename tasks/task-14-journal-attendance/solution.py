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
EXPECTED_ALL_LESSONS = 42
EXPECTED_ALL_GRADES = 303
EXPECTED_ALL_ABSENCES = 72
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


def cell_text(driver, lesson_id, student_id):
    return normalized(get_cell(driver, lesson_id, student_id).text)


def absence_button(driver, lesson_id, student_id):
    cell = get_cell(driver, lesson_id, student_id)
    buttons = cell.find_elements(By.CSS_SELECTOR, ".btn-toggle-absence")
    if not buttons:
        pytest.fail(
            f"В клетке {lesson_id} / {student_id} нет отметки отсутствия"
        )
    return buttons[0]


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


def wait_absence_status(driver, lesson_id, student_id, status, timeout=10):
    def check(d):
        cell = get_cell(d, lesson_id, student_id)
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
            get_cell(d, lesson_id, student_id) is not None
            and expected in cell_text(d, lesson_id, student_id)
        ),
        f"В клетке {lesson_id} / {student_id} нет отметки «{expected}»",
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


def test_tch_07_unconfirmed_absence_can_be_removed(driver):
    """Проверить снятие неподтверждённой отметки отсутствия и сохранение
    этого изменения."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    button = absence_button(driver, OPEN_LESSON, "st-23")
    assert button.get_attribute("data-status") == "unconfirmed", (
        "У Петровой А. ожидалась неподтверждённая отметка"
    )
    assert normalized(button.text) == "Н", (
        "У Петровой А. ожидалась отметка «Н»"
    )

    button.click()
    wait_absence_status(driver, OPEN_LESSON, "st-23", "present")
    click_save(driver)

    record = wait_for_attendance(
        driver, OPEN_LESSON, "st-23", "present", "present"
    )
    assert record.get("code") == "Был", (
        f"После снятия пропуска неверная отметка: {record}"
    )

    db = read_db(driver)
    records = attendance_records(db, OPEN_LESSON)
    assert len(records) == 28, (
        f"После снятия пропуска ожидалось 28 записей, "
        f"получено {len(records)}"
    )
    absent = [
        item for item in records if item.get("value") == "absent"
    ]
    assert len(absent) == 1, (
        f"После снятия пропуска должен остаться один пропуск: {absent}"
    )
    assert absent[0].get("studentId") == "st-14"
    assert absent[0].get("status") == "confirmed"

    reload_journal(driver)
    button = absence_button(driver, OPEN_LESSON, "st-23")
    assert button.get_attribute("data-status") == "present", (
        "После перезагрузки отметка отсутствия вернулась"
    )


def test_tch_08_confirmed_absence_locked_and_grid_refreshed(driver):
    """Проверить блокировку подтверждённой отметки отсутствия и обновление
    сетки журнала после подтверждения причины."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

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

    switch_user(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    assert cell_text(driver, OPEN_LESSON, "st-23") == "Н", (
        "У Петровой А. не отображается неподтверждённый пропуск"
    )
    open_cell_modal(driver, OPEN_LESSON, "st-23")
    quick_confirm = driver.find_element(
        By.ID, "btn-quick-confirm-absence"
    )
    assert quick_confirm.is_displayed(), (
        "Классному руководителю недоступно подтверждение пропуска"
    )
    quick_confirm.click()
    wait_modal_open(driver, "modal-journal-confirm-absence")

    document = "Справка № 55 от 24.10.2024"
    fill_field(driver, "journal-confirm-document-text", document)
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
    assert record.get("confirmedBy") == "Смирнова М. В.", (
        f"Не сохранён подтвердивший: {record}"
    )
    wait_cell_text(driver, OPEN_LESSON, "st-23", "Б")


def test_tch_10_bulk_absence_saved_without_duplicates(driver):
    """Проверить массовую отметку отсутствующих и повторное сохранение без
    дублей."""
    login(driver, SUBJECT_TEACHER)
    open_journal(driver, "subject=math")

    db = read_db(driver)
    assert len(attendance_records(db, OPEN_LESSON)) == 28, (
        "Исходно ожидалось 28 записей посещаемости"
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
    absent = [
        item for item in records if item.get("value") == "absent"
    ]
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


def test_tch_14_homeroom_journal_is_read_only(driver):
    """Проверить, что классный руководитель просматривает журнал по всем
    предметам, но не меняет записи."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)

    assert driver.find_element(
        By.ID, "select-journal-subject"
    ).get_attribute("value") == "all", (
        "Классному руководителю недоступен сводный журнал"
    )
    assert "all" in select_values(
        driver, "select-journal-subject"
    ), "В журнале классного руководителя нет пункта «Все предметы»"
    assert lesson_columns(driver) == EXPECTED_ALL_LESSONS, (
        f"В сводном журнале ожидалось {EXPECTED_ALL_LESSONS} занятий, "
        f"получено {lesson_columns(driver)}"
    )
    assert not driver.find_elements(By.ID, "btn-save-journal"), (
        "Классному руководителю доступна кнопка сохранения"
    )
    assert not driver.find_elements(
        By.CSS_SELECTOR, ".grade-input"
    ), "Классному руководителю доступны поля оценок"
    assert not driver.find_elements(
        By.CSS_SELECTOR, ".btn-toggle-absence"
    ), "Классному руководителю доступны отметки присутствия"

    open_cell_modal(driver, OPEN_LESSON, "st-16")
    comment = "Классрук: родители уведомлены"
    add_comment(driver, comment)
    wait_comments(driver, comment, "Смирнова М. В.", "Классрук")
    close_entry_modal(driver)

    open_cell_modal(driver, OPEN_LESSON, "st-23")
    quick_confirm = driver.find_element(
        By.ID, "btn-quick-confirm-absence"
    )
    assert quick_confirm.is_displayed(), (
        "Классному руководителю недоступно подтверждение пропуска"
    )


def test_tch_16_only_entries_filter_keeps_marks(driver):
    """Проверить сводный журнал и фильтр «Показывать только записи»."""
    login(driver, HOMEROOM_TEACHER)
    open_journal(driver)

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

    assert cell_text(driver, "lsn-31", "st-02") == "Б", (
        "Нет отметки «Б» за 14.10 у Беляева М."
    )
    assert cell_text(driver, OPEN_LESSON, "st-23") == "Н", (
        "Нет отметки «Н» за 24.10 у Петровой А."
    )

    driver.find_element(By.ID, "check-only-entries").click()
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
