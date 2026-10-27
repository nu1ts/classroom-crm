import os

import pytest
from selenium import webdriver
from selenium.common.exceptions import NoAlertPresentException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
TEACHER = "smirnova@school.ru"
PARENT = "petrov@mail.ru"
STUDENT = "petrova.a@school.ru"
PASSWORD = "Test#2024"

LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")
ANNOUNCEMENT_TITLE = "Родительское собрание 31 октября"
VACATION_TITLE = "Каникулы с 28 октября по 5 ноября"


@pytest.fixture(scope="module")
def driver():
    """Создаёт браузер Chrome и закрывает его после выполнения набора тестов."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    browser = webdriver.Remote(SELENIUM, options=options)
    yield browser
    browser.quit()


def app_url(path=""):
    return f"{BASE_URL}/{path.lstrip('/')}" if path else f"{BASE_URL}/"


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
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    driver.get(app_url("login/"))
    wait_until(driver, EC.visibility_of_element_located(LOGIN_FORM), "Не открылась форма входа")


def submit_login(driver, username):
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    password = driver.find_element(By.ID, "login-password")
    password.clear()
    password.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    wait_until(driver, EC.visibility_of_element_located(SIDEBAR), "После входа не открылось приложение")


def login(driver, username):
    reset_all(driver)
    submit_login(driver, username)


def switch_user(driver, username):
    driver.execute_script("window.localStorage.removeItem('classroom_crm_session');")
    driver.get(app_url("login/"))
    wait_until(driver, EC.visibility_of_element_located(LOGIN_FORM), "Не открылась форма повторного входа")
    submit_login(driver, username)


def open_announcements(driver):
    driver.get(app_url("announcements/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "announcements-page-title"),
        "Не открылась страница «Объявления»",
    )


def announcement_card(driver, title):
    for card in driver.find_elements(By.CSS_SELECTOR, ".announcement-card"):
        if title in text_of(card):
            return card
    pytest.fail(f"Не найдена карточка объявления «{title}»")


def read_counter(card):
    return text_of(card.find_element(By.CSS_SELECTOR, ".announcement-reads"))


def read_full(driver, title):
    card = announcement_card(driver, title)
    card.find_element(By.CSS_SELECTOR, ".btn-read-full").click()
    wait_until(
        driver,
        lambda d: "opacity-100" in (d.find_element(By.ID, "modal-announcement-detail").get_attribute("class") or ""),
        "Не открылось полное объявление",
    )


def close_detail(driver):
    driver.find_element(By.ID, "btn-modal-dismiss").click()
    wait_until(
        driver,
        lambda d: "opacity-0" in (d.find_element(By.ID, "modal-announcement-detail").get_attribute("class") or ""),
        "Не закрылось полное объявление",
    )


def read_db(driver):
    return driver.execute_script(
        "const raw = window.localStorage.getItem('classroom_crm_db');"
        "return raw ? JSON.parse(raw) : null;"
    )


def announcement_from_db(driver, title):
    db = read_db(driver) or {}
    for item in db.get("announcements", []):
        if item.get("title") == title:
            return item
    pytest.fail(f"В localStorage нет объявления «{title}»")


def set_vacation_boundary(driver):
    driver.execute_script(
        "const db = JSON.parse(window.localStorage.getItem('classroom_crm_db'));"
        "const item = db.announcements.find((a) => a.title === arguments[0]);"
        "item.readBy = Array.from({ length: 27 }, (_, index) => `st-${String(index + 1).padStart(2, '0')}`)"
        ".filter((key) => key !== 'st-23');"
        "item.readBy.push('st-28');"
        "item.readBy = item.readBy.slice(0, 27);"
        "item.readCount = 27;"
        "item.totalCount = 28;"
        "window.localStorage.setItem('classroom_crm_db', JSON.stringify(db));",
        VACATION_TITLE,
    )


def delete_all_announcements(driver):
    for expected_remaining in (1, 0):
        buttons = driver.find_elements(By.CSS_SELECTOR, ".btn-delete-announcement")
        if not buttons:
            pytest.fail("До удаления не найдена кнопка объявления")
        buttons[0].click()
        try:
            WebDriverWait(driver, 3).until(EC.alert_is_present()).accept()
        except (TimeoutException, NoAlertPresentException):
            pytest.fail("Удаление объявления не запросило подтверждение")
        wait_until(
            driver,
            lambda d: len(d.find_elements(By.CSS_SELECTOR, ".announcement-card"))
            == expected_remaining,
            "После удаления не обновился список объявлений",
        )


def test_an_06_parent_student_see(driver):
    """Родитель и ребёнок одной семьи видят общую ленту и один счётчик."""
    login(driver, PARENT)
    open_announcements(driver)

    parent_card = announcement_card(driver, ANNOUNCEMENT_TITLE)
    assert read_counter(parent_card) == "прочитали 19 из 28"
    assert "Читают родители и ученики класса" in text_of(driver.find_element(By.ID, "announcements-page-subtitle"))

    read_full(driver, ANNOUNCEMENT_TITLE)
    assert ANNOUNCEMENT_TITLE in text_of(driver.find_element(By.ID, "modal-announcement-title"))
    assert "20 из 28" in text_of(driver.find_element(By.ID, "modal-announcement-reads"))
    close_detail(driver)
    assert read_counter(announcement_card(driver, ANNOUNCEMENT_TITLE)) == "прочитали 20 из 28"

    switch_user(driver, STUDENT)
    open_announcements(driver)
    student_card = announcement_card(driver, ANNOUNCEMENT_TITLE)
    assert "Адресовано классу 7Б" in text_of(student_card)
    assert "25.10.2024" in text_of(student_card)
    assert read_counter(student_card) == "прочитали 20 из 28"
    read_full(driver, ANNOUNCEMENT_TITLE)
    close_detail(driver)
    assert read_counter(announcement_card(driver, ANNOUNCEMENT_TITLE)) == "прочитали 20 из 28"

    switch_user(driver, TEACHER)
    open_announcements(driver)
    assert read_counter(announcement_card(driver, ANNOUNCEMENT_TITLE)) == "прочитали 20 из 28"


def test_an_08_publish_from_meeting(driver):
    """Публикация из собрания не создаёт связь между двумя сущностями."""
    login(driver, TEACHER)
    driver.get(app_url("meetings/"))
    wait_until(driver, lambda d: d.find_elements(By.CSS_SELECTOR, ".btn-publish-announcement"), "Не найдена кнопка публикации из собрания")
    meeting_title = text_of(driver.find_element(By.ID, "next-meeting-title"))
    driver.find_element(By.CSS_SELECTOR, ".btn-publish-announcement").click()

    wait_until(
        driver,
        lambda d: "opacity-100" in (d.find_element(By.ID, "modal-announcement-create").get_attribute("class") or ""),
        "Не открылась форма публикации объявления",
    )
    title_input = driver.find_element(By.ID, "announcement-create-title")
    assert title_input.get_attribute("value") == meeting_title
    assert driver.find_element(By.ID, "announcement-create-class").get_attribute("value") == "7Б"

    body_input = driver.find_element(By.ID, "announcement-create-content")
    body_input.send_keys("Просим родителей подтвердить участие в собрании.")
    driver.find_element(By.ID, "btn-submit-create-announcement").click()
    wait_until(driver, lambda d: d.find_elements(By.CSS_SELECTOR, ".announcement-card"), "После публикации не открылась лента")

    first_card = driver.find_elements(By.CSS_SELECTOR, ".announcement-card")[0]
    assert meeting_title in text_of(first_card)
    created = announcement_from_db(driver, meeting_title)
    assert not created.get("meetingId"), "Объявление не должно хранить связь с собранием"

    driver.get(app_url("meetings/"))
    wait_until(driver, lambda d: d.find_elements(By.ID, "next-meeting-title"), "Не открылась карточка собрания")
    assert "Объявление опубликовано" not in text_of(driver.find_element(By.TAG_NAME, "body"))


def test_an_09_read_counter(driver):
    """Счётчик ограничен числом семей и не растёт от повторных открытий."""
    login(driver, PARENT)
    set_vacation_boundary(driver)
    open_announcements(driver)
    assert read_counter(announcement_card(driver, VACATION_TITLE)) == "прочитали 27 из 28"

    read_full(driver, VACATION_TITLE)
    close_detail(driver)
    assert read_counter(announcement_card(driver, VACATION_TITLE)) == "прочитали 28 из 28"
    assert announcement_from_db(driver, VACATION_TITLE)["readCount"] == 28

    read_full(driver, VACATION_TITLE)
    close_detail(driver)
    assert announcement_from_db(driver, VACATION_TITLE)["readCount"] == 28

    switch_user(driver, STUDENT)
    open_announcements(driver)
    read_full(driver, VACATION_TITLE)
    close_detail(driver)
    item = announcement_from_db(driver, VACATION_TITLE)
    assert item["readCount"] == 28
    assert read_counter(announcement_card(driver, VACATION_TITLE)) == "прочитали 28 из 28"


def test_an_10_empty_state(driver):
    """После удаления последнего объявления пустая лента доступна всем ролям."""
    login(driver, TEACHER)
    open_announcements(driver)
    delete_all_announcements(driver)

    empty = driver.find_element(By.ID, "announcements-empty-state")
    assert "Объявлений пока нет" in text_of(empty)
    assert driver.find_element(By.ID, "btn-create-announcement").is_displayed()

    for username in (PARENT, STUDENT):
        switch_user(driver, username)
        open_announcements(driver)
        assert driver.find_element(By.ID, "announcements-empty-state").is_displayed()
        assert "Объявлений пока нет" in text_of(driver.find_element(By.ID, "announcements-empty-state"))
        assert not driver.find_elements(By.CSS_SELECTOR, ".announcement-card")
