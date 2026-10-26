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
SUBJECT_TEACHER = "kozlov@school.ru"
PARENT = "petrov@mail.ru"
STUDENT = "petrova.a@school.ru"
PASSWORD = "Test#2024"

CLASS_LABELS = {"6В", "7Б", "7В", "8А", "8Б", "9В"}

EXPECTED_W8 = {
    (
        "2024-10-21",
        "09:30 - 10:15",
        "Математика (Алгебра)",
        "Козлов А. П.",
        "7Б",
        "Каб. 204",
    ),
    (
        "2024-10-22",
        "09:30 - 10:15",
        "Русский язык",
        "Иванова Е. С.",
        "7Б",
        "Каб. 302",
    ),
    (
        "2024-10-23",
        "09:30 - 10:15",
        "История",
        "Смирнова М. В.",
        "7Б",
        "Каб. 302",
    ),
    (
        "2024-10-24",
        "09:30 - 10:15",
        "Математика (Алгебра)",
        "Козлов А. П.",
        "7Б",
        "Каб. 204",
    ),
    (
        "2024-10-25",
        "09:30 - 10:15",
        "Физкультура",
        "Новиков С. А.",
        "7Б",
        "Спортзал",
    ),
    (
        "2024-10-25",
        "10:30 - 11:15",
        "Физкультура",
        "Новиков С. А.",
        "7Б",
        "Спортзал",
    ),
    (
        "2024-10-25",
        "12:35 - 13:20",
        "Разговоры о важном",
        "Смирнова М. В.",
        "7Б",
        "Каб. 302",
    ),
}

EXPECTED_SUBJECT_TEACHER_W8 = {
    ("2024-10-21", "09:30 - 10:15", "Математика (Алгебра)", "Козлов А. П.", "7Б"),
    ("2024-10-22", "10:30 - 11:15", "Математика (Алгебра)", "Козлов А. П.", "8А"),
    ("2024-10-22", "11:30 - 12:15", "Алгебра", "Козлов А. П.", "9В"),
    ("2024-10-23", "10:30 - 11:15", "Математика (Алгебра)", "Козлов А. П.", "8А"),
    ("2024-10-24", "09:30 - 10:15", "Математика (Алгебра)", "Козлов А. П.", "7Б"),
    ("2024-10-24", "11:30 - 12:15", "Алгебра", "Козлов А. П.", "9В"),
    ("2024-10-25", "10:30 - 11:15", "Математика (Алгебра)", "Козлов А. П.", "8А"),
    ("2024-10-25", "11:30 - 12:15", "Алгебра", "Козлов А. П.", "9В"),
}


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


def wait_any_cards(driver, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(
            lambda d: schedule_cards(d) or False
        )
    except TimeoutException:
        pytest.fail("В расписании нет ни одного занятия")


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
    status = next(
        (
            text
            for text in spans
            if text in {"Проведено", "Запланировано"}
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
        "status": status,
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


def click_id(driver, element_id):
    driver.find_element(By.ID, element_id).click()


def test_sch_01_week_grid(driver):
    """Проверить недельную сетку расписания и состав занятий 7Б."""
    login(driver, TEACHER)
    open_schedule(driver)

    wait_week_title(driver, "21.10.2024", "25.10.2024")
    wait_cards(driver, 7)

    headers = [
        normalized(header.text).upper()
        for header in driver.find_elements(
            By.CSS_SELECTOR, "#schedule-grid thead th"
        )
    ]
    assert len(headers) == 6, (
        "В шапке сетки ожидались колонка времени и пять дней, "
        f"получено: {headers}"
    )
    for day in (
        "ПОНЕДЕЛЬНИК",
        "ВТОРНИК",
        "СРЕДА",
        "ЧЕТВЕРГ",
        "ПЯТНИЦА",
    ):
        assert any(day in header for header in headers), (
            f"В шапке нет дня «{day}»: {headers}"
        )

    rows = driver.find_elements(
        By.CSS_SELECTOR, "#schedule-grid tbody tr"
    )
    assert len(rows) == 5, (
        f"Ожидалось пять временных слотов, получено: {len(rows)}"
    )

    actual = set(signatures(driver))
    assert actual == EXPECTED_W8, (
        "Состав занятий 7Б не совпадает с расписанием. "
        f"Лишние: {sorted(actual - EXPECTED_W8)}. "
        f"Отсутствуют: {sorted(EXPECTED_W8 - actual)}"
    )


def test_sch_02_week_switch(driver):
    """Проверить переключение недель кнопками и восстановление текущей
    недели."""
    login(driver, TEACHER)
    open_schedule(driver)
    wait_week_title(driver, "21.10.2024", "25.10.2024")
    wait_cards(driver, 7)

    click_id(driver, "btn-prev-week")
    wait_week_title(driver, "14.10.2024", "18.10.2024")
    wait_cards(driver, 5)

    click_id(driver, "btn-next-week")
    wait_week_title(driver, "21.10.2024", "25.10.2024")
    wait_cards(driver, 7)

    click_id(driver, "btn-current-week")
    wait_week_title(driver, "21.10.2024", "25.10.2024")
    wait_cards(driver, 7)


def test_sch_03_parent_readonly(driver):
    """Проверить расписание родителя в режиме только для просмотра."""
    login(driver, PARENT)
    open_schedule(driver)
    wait_any_cards(driver)

    title = week_title(driver)
    assert "21.10.2024" in title and "25.10.2024" in title, (
        f"Родитель открыл не текущую неделю: «{title}»"
    )

    class_badge = normalized(
        driver.find_element(By.ID, "schedule-class-badge").text
    )
    assert class_badge == "Класс 7Б", (
        f"Родитель видит чужой класс: «{class_badge}»"
    )

    read_only = driver.find_element(
        By.CSS_SELECTOR, ".badge-read-only"
    )
    assert read_only.is_displayed(), (
        "У родителя нет пометки «Только для просмотра»"
    )
    assert "Только для просмотра" in normalized(read_only.text), (
        f"Неверная пометка режима: «{normalized(read_only.text)}»"
    )

    for selector in (
        "#btn-add-lesson",
        "#btn-empty-add-lesson",
        "button[data-action='edit-lesson']",
        "button[data-action='delete-lesson']",
        "button[data-action='slot-add-lesson']",
    ):
        controls = driver.find_elements(By.CSS_SELECTOR, selector)
        assert not controls, (
            f"У родителя доступны действия редактирования: {selector}"
        )

    class_ids = {
        card.get_attribute("data-class-id")
        for card in schedule_cards(driver)
    }
    assert class_ids <= {"class-7b"}, (
        f"В расписании родителя есть чужой класс: {class_ids}"
    )


def test_sch_04_student_today_highlight(driver):
    """Проверить подсветку текущего дня в расписании ученика."""
    login(driver, STUDENT)
    open_schedule(driver)
    wait_any_cards(driver)

    read_only = driver.find_element(
        By.CSS_SELECTOR, ".badge-read-only"
    )
    assert read_only.is_displayed(), (
        "У ученика нет пометки «Только для просмотра»"
    )

    today_headers = driver.find_elements(
        By.CSS_SELECTOR, "#schedule-grid th[data-today='true']"
    )
    assert len(today_headers) == 1, (
        "Текущим должен быть выделен ровно один день, "
        f"выделено: {[normalized(h.text) for h in today_headers]}"
    )
    today_text = normalized(today_headers[0].text).upper()
    assert "ЧЕТВЕРГ" in today_text and "24.10" in today_text, (
        "Выделен не текущий день: "
        f"«{normalized(today_headers[0].text)}»"
    )

    for selector in (
        "#btn-add-lesson",
        "button[data-action='edit-lesson']",
        "button[data-action='delete-lesson']",
        "button[data-action='slot-add-lesson']",
    ):
        controls = driver.find_elements(By.CSS_SELECTOR, selector)
        assert not controls, (
            f"У ученика доступны действия редактирования: {selector}"
        )


def assert_foreign_class_denied(driver):
    open_schedule(driver, "classId=class-8a")

    try:
        alert = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located(
                (By.ID, "schedule-forbidden-alert")
            )
        )
    except TimeoutException:
        pytest.fail(
            "При открытии расписания 8А нет сообщения об отказе в доступе"
        )

    alert_text = normalized(alert.text)
    assert "отклонён" in alert_text, (
        f"Неверное сообщение об отказе: «{alert_text}»"
    )

    class_badge = normalized(
        driver.find_element(By.ID, "schedule-class-badge").text
    )
    assert class_badge == "Класс 7Б", (
        f"После отказа показан чужой класс: «{class_badge}»"
    )

    wait_any_cards(driver)
    class_ids = {
        card.get_attribute("data-class-id")
        for card in schedule_cards(driver)
    }
    assert class_ids <= {"class-7b"}, (
        f"В сетке показаны занятия чужого класса: {class_ids}"
    )


def test_sch_05_foreign_class_denied(driver):
    """Проверить отказ в доступе к расписанию чужого класса."""
    login(driver, PARENT)
    assert_foreign_class_denied(driver)

    login(driver, STUDENT)
    assert_foreign_class_denied(driver)


def schedule_for(driver, username):
    login(driver, username)
    open_schedule(driver)
    wait_any_cards(driver)
    return signatures(driver)


def test_sch_06_same_schedule_all_roles(driver):
    """Проверить совпадение занятий у классрука, родителя и ученика."""
    teacher_lessons = sorted(schedule_for(driver, TEACHER))
    parent_lessons = sorted(schedule_for(driver, PARENT))
    student_lessons = sorted(schedule_for(driver, STUDENT))

    assert len(teacher_lessons) == 7, (
        f"У классрука ожидалось 7 занятий, получено "
        f"{len(teacher_lessons)}: {teacher_lessons}"
    )
    assert parent_lessons == teacher_lessons, (
        "Расписание родителя отличается от расписания классрука. "
        f"Получено: {parent_lessons}"
    )
    assert student_lessons == teacher_lessons, (
        "Расписание ученика отличается от расписания классрука. "
        f"Получено: {student_lessons}"
    )


def test_sch_07_subject_teacher_all_classes(driver):
    """Проверить расписание учителя-предметника по всем его классам."""
    login(driver, SUBJECT_TEACHER)
    open_schedule(driver)
    wait_cards(driver, 8)

    cards = collect_cards(driver)
    actual = {
        (
            card["date"],
            card["time"],
            card["subject"],
            card["teacher"],
            card["class_label"],
        )
        for card in cards
    }

    assert actual == EXPECTED_SUBJECT_TEACHER_W8, (
        "Расписание предметника не совпадает с его нагрузкой. "
        f"Лишние: {sorted(actual - EXPECTED_SUBJECT_TEACHER_W8)}. "
        "Отсутствуют: "
        f"{sorted(EXPECTED_SUBJECT_TEACHER_W8 - actual)}"
    )

    classes = {card["class_label"] for card in cards}
    assert classes == {"7Б", "8А", "9В"}, (
        f"Предметник видит не все свои классы: {classes}"
    )
    teachers = {card["teacher"] for card in cards}
    assert teachers == {"Козлов А. П."}, (
        f"В расписании предметника есть чужие уроки: {teachers}"
    )
