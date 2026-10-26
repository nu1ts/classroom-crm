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
PARENT = "petrov@mail.ru"
PASSWORD = "Test#2024"
PETROVA_ID = "st-23"
NOTE_TEXT = "Приватная заметка классрука для проверки"


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


def logout(driver):
    driver.execute_script("window.crmApi.logout();")
    driver.get(app_url("login/"))
    wait_for_login_form(driver)


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


def metric_card(driver, label, timeout=10):
    element = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(
            (By.XPATH, f"//div[normalize-space()='{label}']")
        )
    )
    return element.find_element(By.XPATH, "./..")


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


def add_note(driver, text, timeout=10):
    driver.find_element(By.ID, "btn-open-note-modal").click()
    wait_modal_open(driver, "modal-add-note")
    driver.find_element(By.ID, "note-text-input").send_keys(text)
    driver.find_element(By.ID, "btn-submit-note-modal").click()
    wait_modal_closed(driver, "modal-add-note")


def open_child_view(driver, timeout=10):
    driver.get(app_url("child/"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "child-view-container"))
    )


def child_average_text(driver, timeout=10):
    element = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//span[contains(normalize-space(.), 'Средний балл:')]",
            )
        )
    )
    return element.text.strip()


def child_subject_average(driver, subject_name):
    for row in driver.find_elements(
        By.CSS_SELECTOR, "#child-grades-table tbody tr"
    ):
        cells = row.find_elements(By.CSS_SELECTOR, "td")
        if len(cells) >= 3 and subject_name in cells[0].text:
            return cells[2].text.strip()
    return None


def test_ov_12_summary_content(driver):
    """Проверяет основные показатели сводки ученика: средний балл, пропуски,
    контакты родителей и список предметов."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)

    text = summary_text(driver)
    assert "Петрова Анна Сергеевна" in text, (
        f"Открыта не карточка Петровой Анны: «{text}»"
    )
    assert "Класс 7Б" in text, f"Нет хлебных крошек класса: «{text}»"
    assert "Дата рождения: 12.04.2011 (13 лет)" in text, (
        f"Неверная дата рождения в карточке: «{text}»"
    )
    assert "7Б · Активен" in text, f"Нет бейджа «7Б · Активен»: «{text}»"

    average = normalized(metric_card(driver, "Средний балл").text)
    assert "4.5" in average, (
        f"В карточке «Средний балл» ожидалось 4.5: «{average}»"
    )

    absences = normalized(metric_card(driver, "Пропусков всего").text)
    assert "4 дня" in absences, (
        f"В карточке «Пропусков всего» ожидалось 4 дня: «{absences}»"
    )
    assert "4 уроков за период" in absences, (
        "В карточке «Пропусков всего» должно быть указано число пропущенных "
        f"уроков за период, получено: «{absences}»"
    )

    excused = normalized(metric_card(driver, "Из них по болезни").text)
    assert "4 дня" in excused, (
        f"В карточке «Из них по болезни» ожидалось 4 дня: «{excused}»"
    )

    assert "Отец: Петров Сергей Викторович" in text, (
        f"Нет основного контакта — отца: «{text}»"
    )
    assert "Мать: Петрова Елена Игоревна" in text, (
        f"Нет второго контакта — матери: «{text}»"
    )
    assert "Основной контакт" in text, (
        f"Нет отметки «Основной контакт»: «{text}»"
    )
    assert "+7 999 123-45-63" in text, (
        f"Нет телефона основного контакта: «{text}»"
    )
    assert "+7 999 765-43-21" in text, (
        f"Нет телефона второго контакта: «{text}»"
    )
    assert "Эл. почта" not in text, (
        "В сводке ученика не должно быть поля «Эл. почта»"
    )

    math = subject_card(driver, "Математика (Алгебра)")
    assert "3.2" in normalized(math.text), (
        f"Средний балл по математике не 3.2: «{normalized(math.text)}»"
    )

    rows = absence_rows(driver)
    assert len(rows) == 4, (
        f"Ожидалось 4 даты пропусков, получено {len(rows)}: "
        f"{[normalized(row.text) for row in rows]}"
    )


def test_ov_13_subject_threshold_highlight(driver):
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


def test_ov_14_last_absences_details(driver):
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

    add_note(driver, NOTE_TEXT)
    wait_summary_contains(driver, NOTE_TEXT)

    assert NOTE_TEXT in summary_text(driver), (
        f"Заметка не появилась в карточке: «{summary_text(driver)}»"
    )

    stored_notes = driver.execute_script(
        "return (JSON.parse(window.localStorage.getItem('classroom_crm_db')) "
        "|| {}).notes || [];"
    )
    assert any(
        note.get("studentId") == PETROVA_ID and note.get("text") == NOTE_TEXT
        for note in stored_notes
    ), f"Заметка не сохранена в localStorage: {stored_notes}"

    driver.refresh()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "student-summary-view"))
    )
    wait_summary_contains(driver, NOTE_TEXT)
    assert NOTE_TEXT in summary_text(driver), (
        "Заметка не сохранилась после перезагрузки страницы"
    )
    assert driver.find_elements(
        By.CSS_SELECTOR, "#student-notes-history-container"
    ), "После перезагрузки пропал раздел заметок"


def test_ov_16_contact_history_order(driver):
    """Проверяет порядок истории контактов с родителями от новых записей
    к старым и форму добавления записи."""
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
    assert "Смирнова М. В." in first_text, (
        f"В записи контакта нет автора: «{first_text}»"
    )
    assert "Звонок" in first_text, (
        f"В записи контакта нет бейджа канала: «{first_text}»"
    )

    driver.find_element(By.ID, "btn-open-contact-modal").click()
    wait_modal_open(driver, "modal-contact-parent")
    for field_id in (
        "contact-date",
        "contact-parent-select",
        "contact-channel-select",
        "contact-summary-input",
    ):
        assert driver.find_elements(By.ID, field_id), (
            f"В форме контакта нет поля {field_id}"
        )


def test_ov_17_summary_read_only(driver):
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


def test_ov_18_parent_child_summary(driver):
    """Проверяет сводку ребёнка в разделе родителя и недоступность приватных
    заметок классрука."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_student_summary(driver)
    add_note(driver, NOTE_TEXT)
    wait_summary_contains(driver, NOTE_TEXT)

    logout(driver)
    submit_login(driver, PARENT, PASSWORD)
    wait_for_app(driver)
    open_child_view(driver)

    page_text = normalized(
        driver.find_element(By.ID, "child-view-container").text
    )
    assert "Петрова Анна Сергеевна" in page_text, (
        f"В разделе родителя открыт не его ребёнок: «{page_text[:400]}»"
    )

    average = child_average_text(driver)
    assert "4.50" in average, (
        f"В разделе родителя ожидался средний балл 4.50: «{average}»"
    )

    math = child_subject_average(driver, "Математика")
    assert math == "3.20", (
        f"В разделе родителя по математике ожидалось 3.20, получено: «{math}»"
    )

    assert NOTE_TEXT not in page_text, (
        "Приватная заметка классрука не должна показываться родителю: "
        f"«{page_text[:400]}»"
    )
    assert "Заметки классрука" not in page_text, (
        "В разделе родителя не должно быть блока «Заметки классрука»"
    )


def test_ov_19_student_foreign_summary_denied(driver):
    """Проверяет, что родителю карточка ученика недоступна."""
    reset_all(driver)
    submit_login(driver, PARENT, PASSWORD)
    wait_for_app(driver)

    driver.get(app_url("student/?id=st-01"))
    WebDriverWait(driver, 10).until(
        lambda d: d.find_elements(By.ID, "student-summary-view")
        or "Доступ ограничен" in d.page_source
    )

    assert "Доступ ограничен" in driver.page_source, (
        "Родитель должен получить сообщение «Доступ ограничен», "
        f"получено: «{normalized(driver.page_source)[:400]}»"
    )
    assert not driver.find_elements(By.ID, "student-summary-view"), (
        "Родителю не должна открываться карточка ученика"
    )
