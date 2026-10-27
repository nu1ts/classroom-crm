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
SUBJECT_TEACHER = "kozlov@school.ru"
PARENT = "petrov@mail.ru"
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


def normalized(text):
    return " ".join((text or "").split())


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
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def login(driver, username, password=PASSWORD):
    reset_all(driver)
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(password)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_meetings(driver):
    driver.get(app_url("meetings/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "meetings-view"),
        "Не открылся раздел «Собрания»",
    )


def wait_modal(driver, modal_id, opened=True, timeout=10):
    def check(d):
        modal = d.find_element(By.ID, modal_id)
        classes = modal.get_attribute("class") or ""
        return ("opacity-100" in classes) if opened else ("opacity-0" in classes)

    state = "открылось" if opened else "закрылось"
    return wait_until(driver, check, f"Модальное окно не {state}: {modal_id}", timeout)


def set_value(driver, element_id, value):
    element = driver.find_element(By.ID, element_id)
    driver.execute_script(
        "const el = arguments[0];"
        "const proto = el.tagName === 'TEXTAREA'"
        " ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;"
        "const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;"
        "setter.call(el, arguments[1]);"
        "el.dispatchEvent(new Event('input', {bubbles: true}));",
        element,
        value,
    )


def body_text(driver):
    return normalized(driver.find_element(By.TAG_NAME, "body").text)


def read_db(driver):
    return driver.execute_script(
        "const raw = localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def test_mg_01_meetings_order(driver):
    """Проверить разделение ближайшего и прошедшего собраний по дате."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)

    assert "Родительские собрания 7Б" in normalized(
        driver.find_element(By.ID, "meetings-page-title").text
    )
    next_section = driver.find_element(By.ID, "section-next-meeting")
    next_text = normalized(next_section.text)
    for value in (
        "Ближайшее собрание",
        "Итоги первой четверти 7Б",
        "31.10.2024, 18:30",
        "Каб. 302",
        "Результаты первой четверти класса 7Б",
        "Проблемы с посещаемостью и успеваемостью",
        "Безопасность на осенних каникулах",
    ):
        assert value in next_text, f"У ближайшего собрания нет «{value}»"
    assert len(next_section.find_elements(By.CSS_SELECTOR, ".agenda-item")) == 3
    assert next_section.find_element(By.CSS_SELECTOR, ".btn-edit-meeting").is_displayed()
    assert next_section.find_element(By.CSS_SELECTOR, ".btn-publish-announcement").is_displayed()

    past_text = normalized(driver.find_element(By.ID, "section-past-meetings").text)
    for value in ("05.09.2024", "Организация учебного года", "24 из 28"):
        assert value in past_text, f"В истории нет «{value}»"


def test_mg_02_create_meeting_room(driver):
    """Проверить создание собрания с сохранением места и повестки."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    driver.find_element(By.ID, "btn-create-meeting").click()
    wait_modal(driver, "modal-meeting-form")

    set_value(driver, "meeting-title-input", "Подготовка к новогодним мероприятиям")
    set_value(driver, "meeting-date-input", "2024-12-20")
    set_value(driver, "meeting-time-input", "18:30")
    set_value(driver, "meeting-room-input", "Каб. 302")
    set_value(driver, "input-new-agenda-item", "Новогодний утренник и сценарий")
    driver.find_element(By.ID, "btn-add-agenda-item").click()
    set_value(driver, "input-new-agenda-item", "Подарки и праздничный бюджет")
    driver.find_element(By.ID, "btn-add-agenda-item").click()
    driver.find_element(By.ID, "btn-save-meeting").click()
    wait_modal(driver, "modal-meeting-form", opened=False)

    def created(d):
        cards = d.find_elements(By.CSS_SELECTOR, "#section-other-upcoming > div > div")
        return any(
            "Подготовка к новогодним мероприятиям" in normalized(card.text)
            and "20.12.2024" in normalized(card.text)
            and "Каб. 302" in normalized(card.text)
            for card in cards
        )

    wait_until(driver, created, "Созданное собрание не содержит тему, дату и место")
    db = read_db(driver)
    meeting = next(
        (m for m in db.get("meetings", []) if m.get("title") == "Подготовка к новогодним мероприятиям"),
        None,
    )
    assert meeting is not None
    assert meeting.get("room") == "Каб. 302"
    assert meeting.get("agendaItems") == [
        "Новогодний утренник и сценарий",
        "Подарки и праздничный бюджет",
    ]


def test_mg_03_required_fields(driver):
    """Проверить обязательность темы, даты и времени без обязательной повестки."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    driver.find_element(By.ID, "btn-create-meeting").click()
    wait_modal(driver, "modal-meeting-form")

    set_value(driver, "meeting-title-input", "Собрание без даты и времени")
    driver.find_element(By.ID, "btn-save-meeting").click()
    assert driver.find_element(By.ID, "error-meeting-date").is_displayed()
    assert driver.find_element(By.ID, "error-meeting-time").is_displayed()

    set_value(driver, "meeting-date-input", "2024-11-20")
    driver.find_element(By.ID, "btn-save-meeting").click()
    assert driver.find_element(By.ID, "error-meeting-time").is_displayed()

    set_value(driver, "meeting-time-input", "18:00")
    driver.find_element(By.ID, "btn-save-meeting").click()
    wait_modal(driver, "modal-meeting-form", opened=False)
    assert "Собрание без даты и времени" in body_text(driver)


def test_mg_04_agenda_edit(driver):
    """Проверить изменение состава и порядка пунктов повестки."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    driver.find_element(
        By.CSS_SELECTOR, "#section-next-meeting .btn-edit-meeting"
    ).click()
    wait_modal(driver, "modal-meeting-form")

    driver.find_elements(By.CSS_SELECTOR, ".btn-agenda-remove")[2].click()
    set_value(driver, "input-new-agenda-item", "Организация дежурства")
    driver.find_element(By.ID, "btn-add-agenda-item").click()
    driver.find_elements(By.CSS_SELECTOR, ".btn-agenda-up")[-1].click()
    driver.find_element(By.ID, "btn-save-meeting").click()
    wait_modal(driver, "modal-meeting-form", opened=False)
    driver.refresh()

    items = [
        normalized(item.text)
        for item in driver.find_elements(
            By.CSS_SELECTOR, "#next-meeting-agenda-list .agenda-item"
        )
    ]
    assert len(items) == 3
    assert "Результаты первой четверти класса 7Б" in items[0]
    assert "Организация дежурства" in items[1]
    assert "Проблемы с посещаемостью и успеваемостью" in items[2]
    assert "Безопасность на осенних каникулах" not in " ".join(items)


def test_mg_05_reschedule(driver):
    """Проверить перенос существующего собрания без создания дубликата."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    driver.find_element(
        By.CSS_SELECTOR, "#section-next-meeting .btn-edit-meeting"
    ).click()
    wait_modal(driver, "modal-meeting-form")
    meeting_id = driver.find_element(By.ID, "meeting-id-input").get_attribute("value")

    set_value(driver, "meeting-date-input", "2024-11-07")
    set_value(driver, "meeting-time-input", "18:00")
    set_value(driver, "meeting-room-input", "Каб. 204")
    driver.find_element(By.ID, "btn-save-meeting").click()
    wait_modal(driver, "modal-meeting-form", opened=False)

    next_text = normalized(driver.find_element(By.ID, "section-next-meeting").text)
    assert "07.11.2024, 18:00" in next_text
    assert "Каб. 204" in next_text
    matching = [
        m
        for m in read_db(driver).get("meetings", [])
        if m.get("title") == "Итоги первой четверти 7Б"
    ]
    assert len(matching) == 1, "Перенос не должен создавать вторую запись"
    assert matching[0].get("id") == meeting_id
    assert matching[0].get("date") == "2024-11-07"
    assert matching[0].get("time") == "18:00"
    assert matching[0].get("room") == "Каб. 204"

    # TC-MG-05 проверяет изменение единственной записи собрания. Отдельный
    # блок на странице «Ребёнок» не является частью сценария и не проверяется.


def test_mg_06_cancel_keeps_announcement(driver):
    """Проверить, что отмена собрания не удаляет опубликованное объявление."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    driver.find_element(By.ID, "btn-create-meeting").click()
    wait_modal(driver, "modal-meeting-form")
    set_value(driver, "meeting-title-input", "Подготовка к новогодним мероприятиям")
    set_value(driver, "meeting-date-input", "2024-12-20")
    set_value(driver, "meeting-time-input", "18:30")
    set_value(driver, "input-new-agenda-item", "Подготовка к новогодним мероприятиям")
    driver.find_element(By.ID, "btn-add-agenda-item").click()
    driver.find_element(By.ID, "btn-save-meeting").click()
    wait_modal(driver, "modal-meeting-form", opened=False)

    driver.find_element(
        By.CSS_SELECTOR, "#section-next-meeting .btn-meeting-menu"
    ).click()
    driver.find_element(
        By.CSS_SELECTOR, "#section-next-meeting .btn-cancel-meeting"
    ).click()
    wait_modal(driver, "modal-cancel-meeting")
    driver.find_element(By.ID, "btn-confirm-cancel-meeting").click()
    wait_until(
        driver,
        lambda d: "Подготовка к новогодним мероприятиям"
        in normalized(d.find_element(By.ID, "next-meeting-title").text),
        "После отмены не сменилось ближайшее собрание",
    )

    driver.get(app_url("announcements/"))
    wait_until(
        driver,
        lambda d: "Родительское собрание 31 октября" in body_text(d),
        "Отмена собрания удалила опубликованное объявление",
    )


def test_mg_12_subject_teacher_forbidden(driver):
    """Проверить запрет раздела и создания собраний для предметника."""
    login(driver, SUBJECT_TEACHER)
    assert not driver.find_elements(By.ID, "nav-meetings")
    assert not driver.find_elements(By.CSS_SELECTOR, 'a[href="/meetings"]')

    driver.get(app_url("meetings/"))
    wait_until(
        driver,
        lambda d: "Доступ ограничен" in body_text(d),
        "Предметнику не показано сообщение об ограничении доступа",
    )
    text = body_text(driver)
    assert "Родительские собрания 7Б" not in text
    assert not driver.find_elements(By.ID, "btn-create-meeting")
