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
PARENT_USER = "petrov@mail.ru"
PASSWORD = "Test#2024"

LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")
ANNOUNCEMENT_CARDS = (By.CSS_SELECTOR, ".announcement-card")


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
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(LOGIN_FORM)
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
        EC.visibility_of_element_located(SIDEBAR)
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
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(LOGIN_FORM)
    )
    submit_login(driver, username, password)
    wait_for_app(driver)


def open_announcements(driver, timeout=10):
    driver.get(app_url("announcements/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "announcements-page-title"),
        "Не открылась страница «Объявления»",
        timeout,
    )


def open_meetings(driver, timeout=10):
    driver.get(app_url("meetings/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "section-next-meeting"),
        "Не открылась страница «Собрания»",
        timeout,
    )


def announcement_cards(driver):
    return driver.find_elements(*ANNOUNCEMENT_CARDS)


def card_by_title(driver, title):
    for card in announcement_cards(driver):
        if title in text_of(card):
            return card
    pytest.fail(f"Не найдена карточка объявления «{title}»")


def read_count(card):
    text = text_of(card.find_element(By.CSS_SELECTOR, ".announcement-reads"))
    return text


def wait_card_count(driver, expected, timeout=10):
    wait_until(
        driver,
        lambda d: len(announcement_cards(d)) == expected,
        f"Ожидалось карточек объявлений: {expected}, получено: "
        f"{len(announcement_cards(driver))}",
        timeout,
    )


def modal_is_open(driver, modal_id):
    classes = driver.find_element(By.ID, modal_id).get_attribute("class") or ""
    return "opacity-100" in classes and "hidden" not in classes.split()


def wait_modal(driver, modal_id, opened=True, timeout=10):
    state = "открылось" if opened else "закрылось"
    wait_until(
        driver,
        lambda d: modal_is_open(d, modal_id) == opened,
        f"Модальное окно {modal_id} не {state}",
        timeout,
    )


def set_field(driver, element_id, value):
    element = driver.find_element(By.ID, element_id)
    driver.execute_script(
        "const el = arguments[0];"
        "const proto = el.tagName === 'TEXTAREA'"
        "  ? window.HTMLTextAreaElement.prototype"
        "  : window.HTMLInputElement.prototype;"
        "const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;"
        "setter.call(el, arguments[1]);"
        "el.dispatchEvent(new Event('input', { bubbles: true }));",
        element,
        value,
    )


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def announcement_from_db(driver, title):
    db = read_db(driver) or {}
    matches = [
        item
        for item in db.get("announcements", [])
        if item.get("title") == title
    ]
    if not matches:
        pytest.fail(f"В localStorage нет объявления «{title}»")
    return matches[0]


def confirm_next_dialog(driver, accept):
    driver.execute_script(
        "window.__announcementConfirm = window.confirm;"
        "window.confirm = () => arguments[0];",
        accept,
    )


def restore_confirm(driver):
    driver.execute_script(
        "if (window.__announcementConfirm) {"
        "  window.confirm = window.__announcementConfirm;"
        "  delete window.__announcementConfirm;"
        "}"
    )


def test_an_01_list_audience(driver):
    """Проверить состав ленты, адресатов и действия классного руководителя."""
    login(driver, HOMEROOM_TEACHER)
    open_announcements(driver)

    assert "Объявления 7Б" in text_of(
        driver.find_element(By.ID, "announcements-page-title")
    )
    assert "Читают родители и ученики класса" in text_of(
        driver.find_element(By.ID, "announcements-page-subtitle")
    )
    assert driver.find_element(By.ID, "btn-create-announcement").is_displayed()
    wait_card_count(driver, 2)

    meeting = card_by_title(driver, "Родительское собрание 31 октября")
    assert "25.10.2024" in text_of(meeting)
    assert read_count(meeting) == "прочитали 19 из 28"
    assert "Адресовано классу 7Б" in text_of(meeting)
    assert meeting.find_element(By.CSS_SELECTOR, ".btn-read-full").is_displayed()
    assert meeting.find_element(
        By.CSS_SELECTOR, ".btn-edit-announcement"
    ).is_displayed()
    assert meeting.find_element(
        By.CSS_SELECTOR, ".btn-delete-announcement"
    ).is_displayed()

    vacation = card_by_title(driver, "Каникулы с 28 октября по 5 ноября")
    assert "24.10.2024" in text_of(vacation)
    assert read_count(vacation) == "прочитали 22 из 28"
    assert "Адресовано классу 7Б" in text_of(vacation)


def test_an_02_publish_keeps_read_counts(driver):
    """Проверить публикацию без изменения счётчиков исходных карточек."""
    login(driver, HOMEROOM_TEACHER)
    open_announcements(driver)

    driver.find_element(By.ID, "btn-create-announcement").click()
    wait_modal(driver, "modal-announcement-create")
    assert driver.find_element(By.ID, "announcement-create-class").get_attribute(
        "value"
    ) == "7Б"
    assert driver.find_element(By.ID, "announcement-create-date").get_attribute(
        "value"
    ) == "28.10.2024"

    set_field(driver, "announcement-create-title", "Организация дежурства")
    set_field(
        driver,
        "announcement-create-content",
        "Утвержден график дежурств по классу 7Б на вторую четверть.",
    )
    driver.find_element(By.ID, "btn-submit-create-announcement").click()
    wait_modal(driver, "modal-announcement-create", opened=False)
    wait_card_count(driver, 3)

    first = announcement_cards(driver)[0]
    assert "Организация дежурства" in text_of(first)
    assert "28.10.2024" in text_of(first)
    assert read_count(first) == "прочитали 0 из 28"
    assert "Адресовано классу 7Б" in text_of(first)
    assert read_count(
        card_by_title(driver, "Родительское собрание 31 октября")
    ) == "прочитали 19 из 28"
    assert read_count(
        card_by_title(driver, "Каникулы с 28 октября по 5 ноября")
    ) == "прочитали 22 из 28"

    driver.refresh()
    wait_card_count(driver, 3)
    assert "Организация дежурства" in text_of(announcement_cards(driver)[0])
    db = read_db(driver) or {}
    assert len(
        [
            item
            for item in db.get("announcements", [])
            if item.get("title") == "Организация дежурства"
        ]
    ) == 1
    assert announcement_from_db(
        driver, "Родительское собрание 31 октября"
    ).get("readCount") == 19
    assert announcement_from_db(
        driver, "Каникулы с 28 октября по 5 ноября"
    ).get("readCount") == 22


def test_an_03_required_fields(driver):
    """Проверить обязательность заголовка и текста при публикации."""
    login(driver, HOMEROOM_TEACHER)
    open_announcements(driver)
    driver.find_element(By.ID, "btn-create-announcement").click()
    wait_modal(driver, "modal-announcement-create")

    set_field(
        driver,
        "announcement-create-content",
        "Текст объявления без заголовка",
    )
    driver.find_element(By.ID, "btn-submit-create-announcement").click()
    title_error = driver.find_element(By.ID, "announcement-title-error")
    assert title_error.is_displayed()
    assert "обязателен для заполнения" in text_of(title_error)
    assert modal_is_open(driver, "modal-announcement-create")

    set_field(driver, "announcement-create-title", "Заголовок без текста")
    set_field(driver, "announcement-create-content", "")
    driver.find_element(By.ID, "btn-submit-create-announcement").click()
    content_error = driver.find_element(By.ID, "announcement-content-error")
    assert content_error.is_displayed()
    assert "обязателен для заполнения" in text_of(content_error)
    assert modal_is_open(driver, "modal-announcement-create")

    driver.find_element(By.ID, "btn-close-create-modal").click()
    wait_modal(driver, "modal-announcement-create", opened=False)
    wait_card_count(driver, 2)
    db = read_db(driver) or {}
    assert len(db.get("announcements", [])) == 2


def test_an_04_edit_keeps_date(driver):
    """Проверить изменение текста без смены даты, счётчика и дубликата."""
    login(driver, HOMEROOM_TEACHER)
    open_announcements(driver)

    title = "Каникулы с 28 октября по 5 ноября"
    addition = "Просьба сообщить классному руководителю о планах поездок."
    card = card_by_title(driver, title)
    assert "24.10.2024" in text_of(card)
    assert read_count(card) == "прочитали 22 из 28"
    card.find_element(By.CSS_SELECTOR, ".btn-edit-announcement").click()
    wait_modal(driver, "modal-announcement-edit")

    content = driver.find_element(By.ID, "announcement-edit-content").get_attribute(
        "value"
    )
    set_field(driver, "announcement-edit-content", f"{content} {addition}")
    driver.find_element(By.ID, "btn-submit-edit-announcement").click()
    wait_modal(driver, "modal-announcement-edit", opened=False)

    updated = card_by_title(driver, title)
    assert addition in text_of(updated)
    assert "24.10.2024" in text_of(updated)
    assert read_count(updated) == "прочитали 22 из 28"
    assert len(
        [card for card in announcement_cards(driver) if title in text_of(card)]
    ) == 1

    switch_user(driver, PARENT_USER)
    open_announcements(driver)
    parent_card = card_by_title(driver, title)
    assert addition in text_of(parent_card)
    assert "24.10.2024" in text_of(parent_card)
    assert read_count(parent_card) == "прочитали 22 из 28"


def test_an_05_delete_confirmation(driver):
    """Проверить отмену и подтверждение удаления объявления."""
    login(driver, HOMEROOM_TEACHER)
    open_announcements(driver)

    driver.find_element(By.ID, "btn-create-announcement").click()
    wait_modal(driver, "modal-announcement-create")
    set_field(driver, "announcement-create-title", "Организация дежурства")
    set_field(
        driver,
        "announcement-create-content",
        "График дежурств на вторую четверть опубликован для класса 7Б.",
    )
    driver.find_element(By.ID, "btn-submit-create-announcement").click()
    wait_card_count(driver, 3)

    card = card_by_title(driver, "Организация дежурства")
    confirm_next_dialog(driver, False)
    try:
        card.find_element(By.CSS_SELECTOR, ".btn-delete-announcement").click()
    finally:
        restore_confirm(driver)
    driver.refresh()
    wait_card_count(driver, 3)
    assert "Организация дежурства" in text_of(
        card_by_title(driver, "Организация дежурства")
    )

    card = card_by_title(driver, "Организация дежурства")
    confirm_next_dialog(driver, True)
    try:
        card.find_element(By.CSS_SELECTOR, ".btn-delete-announcement").click()
    finally:
        restore_confirm(driver)
    wait_card_count(driver, 2)
    assert not any(
        "Организация дежурства" in text_of(item)
        for item in announcement_cards(driver)
    )

    driver.refresh()
    wait_card_count(driver, 2)
    titles = [text_of(card) for card in announcement_cards(driver)]
    assert any("Родительское собрание 31 октября" in text for text in titles)
    assert any("Каникулы с 28 октября по 5 ноября" in text for text in titles)


def test_an_07_delete_keeps_meeting(driver):
    """Проверить независимость удаления объявления и родительского собрания."""
    login(driver, HOMEROOM_TEACHER)
    open_meetings(driver)
    before = text_of(driver.find_element(By.ID, "section-next-meeting"))
    for value in ("Итоги первой четверти 7Б", "31.10.2024", "18:30", "Каб. 302"):
        assert value in before

    open_announcements(driver)
    card = card_by_title(driver, "Родительское собрание 31 октября")
    confirm_next_dialog(driver, True)
    try:
        card.find_element(By.CSS_SELECTOR, ".btn-delete-announcement").click()
    finally:
        restore_confirm(driver)
    wait_card_count(driver, 1)
    assert not any(
        "Родительское собрание 31 октября" in text_of(item)
        for item in announcement_cards(driver)
    )

    open_meetings(driver)
    after = text_of(driver.find_element(By.ID, "section-next-meeting"))
    for value in ("Итоги первой четверти 7Б", "31.10.2024", "18:30", "Каб. 302"):
        assert value in after
