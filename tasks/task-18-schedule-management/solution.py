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
TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"
CLASS_LABELS = {"6В", "7Б", "7В", "8А", "8Б", "9В"}
EXPECTED_Q1_GRADES = 303


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


def open_schedule(driver, query="", timeout=10):
    path = "schedule/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(
                (By.ID, "schedule-week-title")
            )
        )
    except TimeoutException:
        pytest.fail(
            "Не открылся раздел «Расписание»: "
            f"«{normalized(driver.find_element(By.TAG_NAME, 'body').text)}»"
        )


def week_title(driver):
    return normalized(
        driver.find_element(By.ID, "schedule-week-title").text
    )


def wait_week_title(driver, date_from, date_to, timeout=10):
    def check(d):
        text = normalized(
            d.find_element(By.ID, "schedule-week-title").text
        )
        if date_from in text and date_to in text:
            return text
        return False

    try:
        return WebDriverWait(driver, timeout).until(check)
    except TimeoutException:
        pytest.fail(
            f"Ожидался заголовок недели {date_from} – {date_to}, "
            f"получено: «{week_title(driver)}»"
        )


def schedule_cards(driver):
    return driver.find_elements(By.CSS_SELECTOR, ".schedule-card")


def wait_cards(driver, expected, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(
            lambda d: schedule_cards(d)
            if len(schedule_cards(d)) == expected
            else False
        )
    except TimeoutException:
        pytest.fail(
            f"Ожидалось занятий: {expected}, получено: "
            f"{len(schedule_cards(driver))}"
        )


def card_by_id(driver, lesson_id):
    cards = driver.find_elements(
        By.CSS_SELECTOR, f".schedule-card[data-lesson-id='{lesson_id}']"
    )
    return cards[0] if cards else None


def read_card(card):
    spans = [
        normalized(span.text)
        for span in card.find_elements(By.TAG_NAME, "span")
    ]
    class_label = next(
        (text for text in spans if text in CLASS_LABELS), ""
    )
    room = next(
        (
            text
            for text in spans
            if text.startswith("Каб.") or text == "Спортзал"
        ),
        "",
    )

    row = card.find_element(By.XPATH, "ancestor::tr[1]")
    row_time = normalized(row.find_elements(By.TAG_NAME, "td")[0].text)
    time_match = re.search(
        r"\d{2}:\d{2}\s*-\s*\d{2}:\d{2}", row_time
    )

    return {
        "id": card.get_attribute("data-lesson-id"),
        "date": card.get_attribute("data-date"),
        "class_id": card.get_attribute("data-class-id"),
        "subject": normalized(
            card.find_element(
                By.CSS_SELECTOR, ".text-xs.font-bold"
            ).text
        ),
        "teacher": normalized(
            card.find_element(
                By.CSS_SELECTOR, ".lesson-teacher"
            ).text
        ),
        "class_label": class_label,
        "room": room,
        "time": time_match.group(0) if time_match else "",
    }


def collect_cards(driver):
    return [read_card(card) for card in schedule_cards(driver)]


def card_signature(card):
    return (
        card["date"],
        card["time"],
        card["subject"],
        card["teacher"],
        card["class_label"],
        card["room"],
    )


def signatures(driver):
    return [card_signature(card) for card in collect_cards(driver)]


def is_modal_open(driver, modal_id):
    classes = (
        driver.find_element(By.ID, modal_id).get_attribute("class") or ""
    )
    return "opacity-100" in classes and "hidden" not in classes.split()


def wait_modal_open(driver, modal_id="modal-lesson-form", timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: is_modal_open(d, modal_id)
        )
    except TimeoutException:
        pytest.fail(f"Не открылось модальное окно {modal_id}")


def wait_modal_closed(driver, modal_id="modal-lesson-form", timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: not is_modal_open(d, modal_id)
        )
    except TimeoutException:
        pytest.fail(f"Не закрылось модальное окно {modal_id}")


def open_add_modal(driver):
    driver.find_element(By.ID, "btn-add-lesson").click()
    wait_modal_open(driver)


def set_select(driver, element_id, value):
    changed = driver.execute_script(
        "const el = document.getElementById(arguments[0]);"
        "if (!el) return false;"
        "el.value = arguments[1];"
        "if (el.value !== arguments[1]) return false;"
        "el.dispatchEvent(new Event('change', { bubbles: true }));"
        "return true;",
        element_id,
        value,
    )
    if not changed:
        pytest.fail(
            f"В списке {element_id} нет значения «{value}»"
        )


def save_lesson(driver):
    driver.find_element(By.ID, "btn-save-lesson").click()


def wait_conflict_error(driver, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(
                (By.ID, "lesson-room-conflict-error")
            )
        )
    except TimeoutException:
        pytest.fail(
            "Не показано предупреждение о занятости аудитории"
        )
    return normalized(
        driver.find_element(
            By.ID, "lesson-conflict-error-text"
        ).text
    )


def get_db_lesson(driver, lesson_id):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "if (!raw) return null;"
        "const db = JSON.parse(raw);"
        "return (db.lessons || []).find((l) => l.id === arguments[0])"
        " || null;",
        lesson_id,
    )


def db_journal_counts(driver, lesson_id):
    counts = driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "if (!raw) return null;"
        "const db = JSON.parse(raw);"
        "return ["
        " (db.grades || []).filter("
        "   (g) => g.lessonId === arguments[0]).length,"
        " (db.attendance || []).filter("
        "   (a) => a.lessonId === arguments[0]).length"
        "];",
        lesson_id,
    )
    return tuple(counts or (0, 0))


def open_journal(driver, timeout=10):
    driver.get(app_url("journal/"))
    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(
                (By.ID, "stat-total-grades")
            )
        )
    except TimeoutException:
        pytest.fail("Не открылся раздел «Журнал»")


def journal_stat(driver, element_id):
    text = normalized(
        driver.find_element(By.ID, element_id).text
    )
    digits = re.sub(r"\D", "", text)
    return int(digits) if digits else 0


def test_sch_08_add_lesson_and_room_conflict(driver):
    """Проверить добавление занятия и отказ при занятой аудитории."""
    login(driver, TEACHER)
    open_schedule(driver)
    wait_cards(driver, 7)
    before = set(signatures(driver))

    open_add_modal(driver)
    set_select(driver, "lesson-date-select", "2024-10-22")
    set_select(driver, "lesson-time-select", "12:35 - 13:20")
    set_select(driver, "lesson-room-select", "Каб. 401")
    save_lesson(driver)
    wait_modal_closed(driver)
    wait_cards(driver, 8)

    added = [
        card
        for card in collect_cards(driver)
        if card["date"] == "2024-10-22"
        and card["time"] == "12:35 - 13:20"
        and card["subject"] == "Физика"
    ]
    assert len(added) == 1, (
        "Добавленное занятие не появилось в сетке ровно один раз: "
        f"{added}"
    )
    added_card = added[0]
    assert added_card["teacher"] == "Дмитриев Д. К.", (
        f"Неверный учитель добавленного занятия: {added_card}"
    )
    assert added_card["room"] == "Каб. 401", (
        f"Неверная аудитория добавленного занятия: {added_card}"
    )
    assert added_card["class_label"] == "7Б", (
        f"Неверный класс добавленного занятия: {added_card}"
    )

    after_first = signatures(driver)
    assert before <= set(after_first), (
        "После добавления изменились существующие занятия"
    )
    assert len(after_first) == 8, (
        f"Ожидалось 8 занятий, получено: {len(after_first)}"
    )

    open_add_modal(driver)
    set_select(driver, "lesson-subject-select", "История")
    set_select(driver, "lesson-date-select", "2024-10-22")
    set_select(driver, "lesson-time-select", "12:35 - 13:20")
    set_select(driver, "lesson-room-select", "Каб. 401")
    save_lesson(driver)

    error_text = wait_conflict_error(driver)
    assert "Аудитория" in error_text, (
        "Ожидалось предупреждение о занятости аудитории, "
        f"получено: «{error_text}»"
    )
    assert "Каб. 401" in error_text, (
        "В предупреждении не указана занятая аудитория 401: "
        f"«{error_text}»"
    )
    assert "занята" in error_text.lower(), (
        f"Неверный текст предупреждения: «{error_text}»"
    )
    assert is_modal_open(driver, "modal-lesson-form"), (
        "Форма добавления закрылась, хотя занятие не должно сохраняться"
    )
    assert len(schedule_cards(driver)) == 8, (
        "После отклонённого добавления изменилось число занятий"
    )


def test_sch_09_reschedule_keeps_journal(driver):
    """Проверить перенос занятия на другое время и аудиторию с сохранением
    записей журнала."""
    login(driver, TEACHER)
    grades_before, attendance_before = db_journal_counts(
        driver, "lsn-36"
    )
    assert (grades_before, attendance_before) == (9, 28), (
        "Исходные записи журнала по занятию 21.10 не совпадают: "
        f"{grades_before} оценок, {attendance_before} отметок"
    )

    open_schedule(driver)
    wait_cards(driver, 7)

    card = card_by_id(driver, "lsn-36")
    assert card is not None, "Не найдено занятие 21.10 в 09:30"
    assert read_card(card)["time"] == "09:30 - 10:15", (
        "Занятие 21.10 изначально стоит не в 09:30"
    )
    card.find_element(
        By.CSS_SELECTOR, "button[data-action='edit-lesson']"
    ).click()
    wait_modal_open(driver)

    set_select(driver, "lesson-time-select", "12:35 - 13:20")
    set_select(driver, "lesson-room-select", "Каб. 302")
    save_lesson(driver)
    wait_modal_closed(driver)
    wait_cards(driver, 7)

    moved = card_by_id(driver, "lsn-36")
    assert moved is not None, "Занятие пропало из сетки после переноса"
    moved_card = read_card(moved)
    assert moved_card["date"] == "2024-10-21", (
        f"Изменилась дата занятия: {moved_card}"
    )
    assert moved_card["time"] == "12:35 - 13:20", (
        f"Занятие не перенесено на 12:35: {moved_card}"
    )
    assert moved_card["room"] == "Каб. 302", (
        f"Не сохранилась новая аудитория: {moved_card}"
    )
    assert moved_card["subject"] == "Математика (Алгебра)", (
        f"Изменился предмет занятия: {moved_card}"
    )

    old_slot = [
        card
        for card in collect_cards(driver)
        if card["date"] == "2024-10-21"
        and card["time"] == "09:30 - 10:15"
    ]
    assert not old_slot, (
        f"Занятие осталось в старой клетке: {old_slot}"
    )

    lesson = get_db_lesson(driver, "lsn-36")
    assert lesson is not None, "Занятие не сохранилось в данных"
    assert lesson["date"] == "2024-10-21", (
        f"В данных изменилась дата занятия: {lesson}"
    )
    assert lesson["time"] == "12:35 - 13:20", (
        f"В данных не сохранилось новое время: {lesson}"
    )
    assert lesson["room"] == "Каб. 302", (
        f"В данных не сохранилась новая аудитория: {lesson}"
    )

    grades_after, attendance_after = db_journal_counts(
        driver, "lsn-36"
    )
    assert (grades_after, attendance_after) == (
        grades_before,
        attendance_before,
    ), (
        "После переноса потерялись записи журнала: "
        f"было {grades_before}/{attendance_before}, "
        f"стало {grades_after}/{attendance_after}"
    )

    open_journal(driver)
    headers = driver.find_elements(
        By.XPATH,
        "//th[contains(@title, '2024-10-21 (12:35 - 13:20)')]",
    )
    assert headers, (
        "В журнале за 21.10 нет столбца перенесённого занятия"
    )
    assert journal_stat(driver, "stat-total-grades") == (
        EXPECTED_Q1_GRADES
    ), (
        "После переноса изменился счётчик оценок за четверть: "
        f"{journal_stat(driver, 'stat-total-grades')}"
    )


def test_sch_10_cancel_lesson_keeps_journal(driver):
    """Проверить отмену занятия с сохранением оценок и посещаемости."""
    login(driver, TEACHER)

    open_journal(driver)
    grades_before = journal_stat(driver, "stat-total-grades")
    assert grades_before == EXPECTED_Q1_GRADES, (
        "Исходный счётчик оценок за четверть не совпадает: "
        f"{grades_before}"
    )

    open_schedule(driver)
    wait_cards(driver, 7)

    card = card_by_id(driver, "lsn-37")
    assert card is not None, "Не найдено занятие 22.10 в 09:30"
    card.find_element(
        By.CSS_SELECTOR, "button[data-action='delete-lesson']"
    ).click()
    wait_modal_open(driver, "modal-confirm-delete-lesson")

    warning = normalized(
        driver.find_element(By.ID, "cancel-lesson-warning").text
    ).lower()
    assert "журнал" in warning, (
        f"В предупреждении нет упоминания журнала: «{warning}»"
    )
    assert "сохраняются" in warning, (
        "Предупреждение не сообщает о сохранении записей журнала: "
        f"«{warning}»"
    )

    driver.find_element(By.ID, "btn-confirm-delete-lesson").click()
    wait_modal_closed(driver, "modal-confirm-delete-lesson")
    wait_cards(driver, 6)

    assert card_by_id(driver, "lsn-37") is None, (
        "Отменённое занятие осталось в сетке расписания"
    )
    assert get_db_lesson(driver, "lsn-37") is None, (
        "Отменённое занятие осталось в данных расписания"
    )

    grades_after, attendance_after = db_journal_counts(
        driver, "lsn-37"
    )
    assert (grades_after, attendance_after) == (5, 28), (
        "После отмены занятия пропали записи журнала: "
        f"{grades_after} оценок, {attendance_after} отметок"
    )

    open_journal(driver)
    grades_final = journal_stat(driver, "stat-total-grades")
    assert grades_final == grades_before, (
        "Счётчик оценок за четверть уменьшился после отмены занятия: "
        f"было {grades_before}, стало {grades_final}"
    )


def test_sch_11_vacation_empty_state(driver):
    """Проверить пустое состояние каникулярной недели и возврат к занятиям."""
    login(driver, TEACHER)
    open_schedule(driver, "week=w9")
    wait_week_title(driver, "28.10.2024", "01.11.2024")

    try:
        empty_state = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located(
                (By.ID, "schedule-empty-state")
            )
        )
    except TimeoutException:
        pytest.fail(
            "На каникулярной неделе не показано пустое состояние"
        )

    text = normalized(empty_state.text)
    assert "Школьные каникулы" in text, (
        f"Неверный заголовок пустого состояния: «{text}»"
    )
    assert "занятия не запланированы" in text.lower(), (
        f"Нет пояснения об отсутствии занятий: «{text}»"
    )
    assert not driver.find_elements(By.ID, "schedule-grid"), (
        "На каникулярной неделе показана сетка занятий"
    )
    assert not schedule_cards(driver), (
        "На каникулярной неделе показаны карточки занятий"
    )

    add_button = driver.find_elements(By.ID, "btn-empty-add-lesson")
    assert add_button and add_button[0].is_displayed(), (
        "Классному руководителю недоступна кнопка добавления занятия"
    )

    driver.find_element(By.ID, "btn-empty-return-current").click()
    wait_week_title(driver, "21.10.2024", "25.10.2024")
    wait_cards(driver, 7)


def test_sch_12_room_conflict_boundary(driver):
    """Проверить границу конфликта: тот же слот, но другая свободная
    аудитория."""
    login(driver, TEACHER)
    open_schedule(driver)
    wait_cards(driver, 7)

    open_add_modal(driver)
    set_select(driver, "lesson-date-select", "2024-10-22")
    set_select(driver, "lesson-time-select", "11:30 - 12:15")
    set_select(driver, "lesson-room-select", "Каб. 302")
    save_lesson(driver)
    wait_modal_closed(driver)
    wait_cards(driver, 8)

    added = [
        card
        for card in collect_cards(driver)
        if card["date"] == "2024-10-22"
        and card["time"] == "11:30 - 12:15"
        and card["subject"] == "Физика"
    ]
    assert len(added) == 1, (
        "Занятие в свободной аудитории того же слота не сохранилось: "
        f"{added}"
    )
    assert added[0]["room"] == "Каб. 302", (
        f"Неверная аудитория сохранённого занятия: {added[0]}"
    )

    open_add_modal(driver)
    set_select(driver, "lesson-subject-select", "История")
    set_select(driver, "lesson-date-select", "2024-10-22")
    set_select(driver, "lesson-time-select", "11:30 - 12:15")
    set_select(driver, "lesson-room-select", "Каб. 204")
    save_lesson(driver)

    error_text = wait_conflict_error(driver)
    assert "уже" in error_text.lower(), (
        f"Неверный текст предупреждения: «{error_text}»"
    )
    assert is_modal_open(driver, "modal-lesson-form"), (
        "Форма закрылась, хотя занятие в занятой аудитории не должно "
        "сохраняться"
    )
    assert len(schedule_cards(driver)) == 8, (
        "После отклонённой попытки появился дубль занятия"
    )
