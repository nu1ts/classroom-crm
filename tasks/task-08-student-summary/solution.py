import os
from urllib.parse import quote

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
PETROVA_ID = "st-23"


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


def normalized(text):
    return " ".join((text or "").split())


def summary_text(driver):
    return normalized(driver.find_element(By.ID, "student-summary-view").text)


def wait_summary_contains(driver, expected, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: expected in summary_text(d)
        )
    except TimeoutException:
        pytest.fail(
            f"В карточке ученика ожидалось «{expected}», "
            f"получено: «{summary_text(driver)}»"
        )


def open_student_summary(driver, student_id=PETROVA_ID, timeout=10):
    driver.get(
        app_url(f"student/?id={quote(str(student_id), safe='')}")
    )
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )
    WebDriverWait(driver, timeout).until(
        lambda d: normalized(
            d.find_element(By.ID, "student-summary-view").text
        )
    )


def subject_card(driver, name):
    cards = driver.find_elements(
        By.XPATH,
        "//div[contains(@class,'p-3.5') "
        "and contains(@class,'rounded-2xl') "
        "and contains(@class,'border')]",
    )
    for card in cards:
        if normalized(card.text).startswith(name):
            return card
    pytest.fail(f"Не найдена карточка предмета «{name}»")


def absence_rows(driver):
    heading = driver.find_element(
        By.XPATH, "//h3[normalize-space()='Последние пропуски занятий']"
    )
    section = heading.find_element(
        By.XPATH, "./ancestor::div[contains(@class,'rounded-3xl')][1]"
    )
    return section.find_elements(
        By.XPATH, ".//div[contains(@class,'divide-y')]/div"
    )


def absence_row(driver, date_text, timeout=10):
    def find_row(d):
        for row in absence_rows(d):
            if date_text in normalized(row.text):
                return row
        return False

    try:
        return WebDriverWait(driver, timeout).until(find_row)
    except TimeoutException:
        rows = [normalized(row.text) for row in absence_rows(driver)]
        pytest.fail(f"Нет строки пропуска за {date_text}: {rows}")


def contact_blocks(driver):
    container = driver.find_element(
        By.ID, "parent-contacts-history-container"
    )
    return container.find_elements(By.XPATH, "./div")


def wait_modal_open(driver, modal_id, timeout=10):
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-100"
        in (d.find_element(By.ID, modal_id).get_attribute("class") or "")
    )


def wait_modal_closed(driver, modal_id, timeout=10):
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-0"
        in (d.find_element(By.ID, modal_id).get_attribute("class") or "")
    )


def test_ov_13_subject_threshold(driver):
    """Проверяет средние баллы по предметам и выделение предметов ниже
    порога 3,5."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)

    assert "Петрова Анна Сергеевна" in summary_text(driver), (
        f"Открыта не карточка Петровой Анны: «{summary_text(driver)}»"
    )

    math = subject_card(driver, "Математика (Алгебра)")
    math_text = normalized(math.text)
    math_classes = math.get_attribute("class") or ""
    assert "3.2" in math_text, (
        f"Средний балл по математике не 3.2: «{math_text}»"
    )
    assert "text-rose-600" in math_classes, (
        f"Математика ниже порога 3,5 не выделена красным: «{math_classes}»"
    )
    assert "border-rose-200" in math_classes, (
        f"У карточки математики нет красной рамки: «{math_classes}»"
    )

    russian = subject_card(driver, "Русский язык")
    russian_text = normalized(russian.text)
    russian_classes = russian.get_attribute("class") or ""
    assert "4.6" in russian_text, (
        f"Средний балл по русскому языку не 4.6: «{russian_text}»"
    )
    assert "text-emerald-600" in russian_classes, (
        f"Русский язык с баллом 4,6 не выделен зелёным: "
        f"«{russian_classes}»"
    )
    assert "text-rose-600" not in russian_classes, (
        f"Русский язык ошибочно выделен красным: «{russian_classes}»"
    )

    talks = subject_card(driver, "Разговоры о важном")
    assert "—" in normalized(talks.text), (
        f"Предмет без оценок показывает не прочерк: «{talks.text}»"
    )


def test_ov_14_absence_status(driver):
    """Проверяет статусы подтверждения пропусков и кнопку подтверждения
    только у неподтверждённой записи."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)

    rows = absence_rows(driver)
    assert len(rows) == 4, (
        f"Ожидалось 4 даты пропусков, получено {len(rows)}: "
        f"{[normalized(row.text) for row in rows]}"
    )

    for date_text in ("13.09.2024", "26.09.2024", "25.10.2024"):
        row = absence_row(driver, date_text)
        row_text = normalized(row.text)
        assert "Подтверждено" in row_text, (
            f"У пропуска {date_text} нет статуса «Подтверждено»: "
            f"«{row_text}»"
        )
        assert not row.find_elements(
            By.CSS_SELECTOR, ".btn-confirm-absence-action"
        ), f"У подтверждённого пропуска {date_text} есть кнопка"

    pending = absence_row(driver, "24.10.2024")
    pending_text = normalized(pending.text)
    assert "Подтвердить причину" in pending_text, (
        f"У пропуска 24.10.2024 нет кнопки подтверждения: «{pending_text}»"
    )
    pending_buttons = pending.find_elements(
        By.CSS_SELECTOR, ".btn-confirm-absence-action"
    )
    assert len(pending_buttons) == 1, (
        f"У пропуска 24.10.2024 кнопок: {len(pending_buttons)}"
    )

    all_buttons = driver.find_elements(
        By.CSS_SELECTOR, "#student-summary-view .btn-confirm-absence-action"
    )
    assert len(all_buttons) == 1, (
        f"В карточке должна быть одна кнопка подтверждения, "
        f"найдено: {len(all_buttons)}"
    )


def test_ov_15_notes_persisted(driver):
    """Проверяет добавление приватной заметки, её отображение и сохранение
    после перезагрузки страницы."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)

    assert "Приватно (только для классрука)" in summary_text(driver), (
        "В карточке нет метки приватности заметок"
    )
    assert "Заметок классного руководителя пока нет." in summary_text(driver), (
        "У Петровой Анны неожиданно уже есть заметки"
    )

    driver.find_element(By.ID, "btn-open-note-modal").click()
    wait_modal_open(driver, "modal-add-note")

    note_text = "Проверка сохранения заметки классрука"
    driver.find_element(By.ID, "note-text-input").send_keys(note_text)
    driver.find_element(By.ID, "btn-submit-note-modal").click()
    wait_modal_closed(driver, "modal-add-note")
    wait_summary_contains(driver, note_text)

    assert note_text in summary_text(driver), (
        f"Заметка не появилась в карточке: «{summary_text(driver)}»"
    )

    stored_notes = driver.execute_script(
        "return (JSON.parse(window.localStorage.getItem('classroom_crm_db')) "
        "|| {}).notes || [];"
    )
    assert any(
        note.get("studentId") == PETROVA_ID and note.get("text") == note_text
        for note in stored_notes
    ), f"Заметка не сохранена в localStorage: {stored_notes}"

    driver.refresh()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )
    wait_summary_contains(driver, note_text)
    assert note_text in summary_text(driver), (
        "Заметка не сохранилась после перезагрузки страницы"
    )
    assert driver.find_elements(
        By.CSS_SELECTOR, "#student-notes-history-container"
    ), "После перезагрузки пропал раздел заметок"


def test_ov_16_contacts_history_order(driver):
    """Проверяет порядок истории контактов с родителями от новых записей
    к старым."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)

    blocks = contact_blocks(driver)
    assert len(blocks) == 2, (
        f"Ожидалось два контакта, получено {len(blocks)}: "
        f"{[normalized(block.text) for block in blocks]}"
    )

    first_text = normalized(blocks[0].text)
    second_text = normalized(blocks[1].text)
    assert "24.10.2024" in first_text, (
        f"Первым должен быть контакт от 24.10.2024: «{first_text}»"
    )
    assert "Звонок матери по поводу пропусков" in first_text, (
        f"Первая запись истории не звонок от 24.10.2024: «{first_text}»"
    )
    assert "15.10.2024" in second_text, (
        f"Вторым должен быть контакт от 15.10.2024: «{second_text}»"
    )
    assert "Обсуждение успеваемости по математике" in second_text, (
        f"Вторая запись истории не беседа от 15.10.2024: «{second_text}»"
    )


def test_ov_17_foreign_summary_read_only(driver):
    """Проверяет режим только для чтения в карточке ученика другого класса."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver, "ext-Котова Дарья")

    text = summary_text(driver)
    assert "Котова Дарья" in text, (
        f"Открыта не карточка Котовой Дарьи: «{text}»"
    )
    assert "доступны только для чтения" in text, (
        f"Нет предупреждения о режиме только для чтения: «{text}»"
    )
    assert "9В" in text, f"В карточке не указан класс 9В: «{text}»"

    read_only_badges = driver.find_elements(
        By.XPATH, "//span[normalize-space()='Только просмотр']"
    )
    assert len(read_only_badges) >= 2, (
        "Ожидались бейджи «Только просмотр» у контактов и заметок, "
        f"найдено: {len(read_only_badges)}"
    )

    assert not driver.find_elements(By.ID, "btn-open-contact-modal"), (
        "В карточке чужого ученика доступна кнопка добавления контакта"
    )
    assert not driver.find_elements(By.ID, "btn-open-note-modal"), (
        "В карточке чужого ученика доступна кнопка добавления заметки"
    )
    assert not driver.find_elements(By.ID, "modal-contact-parent"), (
        "В карточке чужого ученика отрисовано окно добавления контакта"
    )
    assert not driver.find_elements(By.ID, "modal-add-note"), (
        "В карточке чужого ученика отрисовано окно добавления заметки"
    )
