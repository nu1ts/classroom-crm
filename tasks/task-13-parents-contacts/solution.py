import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.common.exceptions import TimeoutException

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
HOMEROOM_TEACHER = "smirnova@school.ru"
SUBJECT_TEACHER = "kozlov@school.ru"
PARENT_USER = "petrov@mail.ru"
STUDENT_USER = "petrova.a@school.ru"
PASSWORD = "Test#2024"

LOGIN_FORM = (By.ID, "login-form")
SIDEBAR = (By.ID, "app-sidebar")

PARENTS_SUBTITLE = (By.ID, "parents-total-subtitle")
PARENTS_TABLE = (By.CSS_SELECTOR, "table")
PARENTS_COUNT = (By.ID, "parents-count-summary")
PARENTS_SEARCH = (By.ID, "input-parents-search")
PARENTS_FILTER = (By.ID, "select-parents-filter")
PARENTS_RESET = (By.ID, "btn-reset-parents-filters")
PARENTS_ROWS = (By.CSS_SELECTOR, "tr[data-parent-id]")
PARENTS_TOAST_MESSAGE = (By.ID, "parents-toast-message")

ADD_MODAL = (By.ID, "modal-add-parent")
ADD_PHONE_ERROR = (By.ID, "add-parent-phone-error")
EDIT_MODAL = (By.ID, "modal-edit-parent")
LINK_MODAL = (By.ID, "modal-link-parent")

SUMMARY_RECORD_BUTTON = (By.ID, "btn-card-record-contact")
SUMMARY_UNLINK_BUTTON = (By.ID, "btn-card-unlink-student")
CONTACT_MODAL = (By.ID, "modal-record-parent-contact")
CONTACT_CHANNEL_ERROR = (By.ID, "contact-channel-error")
CONTACT_SUMMARY_ERROR = (By.ID, "contact-summary-error")
UNLINK_MODAL = (By.ID, "modal-card-unlink-student")
HISTORY_LIST = (By.ID, "parent-communication-history-list")


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
    return normalized(
        element.get_attribute("textContent") or element.text or ""
    )


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


def wait_body(driver, *parts, timeout=10):
    def check(d):
        body = text_of(d.find_element(By.TAG_NAME, "body"))
        return all(part in body for part in parts)

    wait_until(driver, check, f"На странице нет текста: {', '.join(parts)}", timeout)
    return text_of(driver.find_element(By.TAG_NAME, "body"))


def body_text(driver):
    return text_of(driver.find_element(By.TAG_NAME, "body"))


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


def select_value(driver, element_id, value):
    Select(driver.find_element(By.ID, element_id)).select_by_value(value)


def click_js(driver, element):
    driver.execute_script(
        "arguments[0].scrollIntoView({ block: 'center' });", element
    )
    driver.execute_script("arguments[0].click();", element)


def wait_modal(driver, locator, opened=True, timeout=10):
    element_id = locator[1]

    def check(d):
        classes = d.find_element(By.ID, element_id).get_attribute("class") or ""
        if opened:
            return "opacity-100" in classes
        return "opacity-0" in classes

    state = "открылось" if opened else "закрылось"
    wait_until(driver, check, f"Модальное окно не {state}: {element_id}", timeout)


def open_parents(driver, query=""):
    path = "parents/"
    if query:
        path += f"?{query}"
    driver.get(app_url(path))
    wait_until(
        driver,
        lambda d: d.find_elements(*PARENTS_SUBTITLE),
        "Не открылась страница «Родители»",
    )


def open_parent_summary(driver, parent_id):
    driver.get(app_url(f"parent/?id={parent_id}"))
    wait_until(
        driver,
        lambda d: d.find_elements(*SUMMARY_RECORD_BUTTON),
        f"Не открылась сводка родителя {parent_id}",
    )


def open_student_summary(driver, student_id):
    driver.get(app_url(f"student/?id={student_id}&period=q1_2024"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.CSS_SELECTOR, "#app-content h1"),
        f"Не открылась сводка ученика {student_id}",
    )


def parent_rows(driver):
    return driver.find_elements(*PARENTS_ROWS)


def wait_parent_rows(driver, count, contains=None, timeout=10):
    def check(d):
        rows = parent_rows(d)
        if len(rows) != count:
            return False
        if contains:
            text = " ".join(text_of(row) for row in rows)
            return all(value in text for value in contains)
        return True

    message = f"В списке родителей не {count} строк"
    if contains:
        message += f" с текстом {', '.join(contains)}"
    wait_until(driver, check, message, timeout)


def find_row_by_text(driver, value):
    for row in parent_rows(driver):
        if value in text_of(row):
            return row
    pytest.fail(f"Не найдена строка родителя со значением: {value}")


def open_row_action(driver, row, action_class):
    parent_id = row.get_attribute("data-parent-id")
    click_js(driver, row.find_element(By.CSS_SELECTOR, ".btn-parent-actions"))
    action = driver.find_element(
        By.CSS_SELECTOR, f"#menu-parent-{parent_id} .{action_class}"
    )
    click_js(driver, action)


def submit_form(driver, form_id):
    click_js(
        driver,
        driver.find_element(
            By.CSS_SELECTOR, f"#{form_id} button[type='submit']"
        ),
    )


def wait_element_visible(driver, element_id, message, timeout=10):
    wait_until(
        driver,
        lambda d: "hidden"
        not in (
            d.find_element(By.ID, element_id).get_attribute("class") or ""
        ),
        message,
        timeout,
    )


def wait_toast(driver, message, timeout=10):
    def check(d):
        text = text_of(d.find_element(*PARENTS_TOAST_MESSAGE))
        return message in text

    wait_until(driver, check, f"Нет уведомления: «{message}»", timeout)


def parent_block(driver, heading):
    return driver.find_element(
        By.XPATH,
        f"//h3[contains(., '{heading}')]"
        "/ancestor::div[contains(@class, 'rounded-3xl')][1]",
    )


def contacts_block(driver):
    return driver.find_element(
        By.XPATH,
        "//h3[contains(., 'Контакты родителей')]"
        "/ancestor::div[contains(@class, 'space-y-4')][1]",
    )


def history_items(driver):
    return driver.find_elements(
        By.CSS_SELECTOR, "#parent-communication-history-list > div"
    )


def wait_history_first(driver, *parts, timeout=10):
    def check(d):
        items = history_items(d)
        if not items:
            return False
        text = text_of(items[0])
        return all(part in text for part in parts)

    wait_until(
        driver,
        check,
        f"Первая запись истории не содержит: {', '.join(parts)}",
        timeout,
    )


def primary_relations(db, student_id):
    return [
        relation
        for relation in db.get("parentStudentRelations", [])
        if relation.get("studentId") == student_id
        and relation.get("isPrimary")
    ]


def test_pr_01_02_list_and_phone_search(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    assert normalized(
        driver.find_element(*PARENTS_SUBTITLE).text
    ) == "32 родителя · у 28 учеников"

    headers = text_of(driver.find_element(By.CSS_SELECTOR, "table thead"))
    for column in [
        "Родитель",
        "Дети",
        "Роль связи",
        "Основной контакт",
        "Действия",
    ]:
        assert column in headers, f"Нет колонки «{column}»"

    rows = parent_rows(driver)
    assert len(rows) == 10, "На первой странице должно быть 10 родителей"
    first_text = text_of(rows[0])
    for value in [
        "Александрова Ирина Алексеевна",
        "+7 999 123-45-60",
        "Александров Егор",
        "(7Б)",
        "Мать",
        "Основной контакт",
    ]:
        assert value in first_text, f"В первой строке нет значения «{value}»"

    assert "из 32 родителей" in normalized(
        driver.find_element(*PARENTS_COUNT).text
    )

    set_field(driver, "input-parents-search", "сидор")
    wait_parent_rows(driver, 1, ["Сидорова Ольга Николаевна"])

    set_field(driver, "input-parents-search", "")
    wait_parent_rows(driver, 10)

    set_field(driver, "input-parents-search", "123-45-64")
    wait_parent_rows(driver, 1, ["Сидорова Ольга Николаевна"])

    set_field(driver, "input-parents-search", "123-45-62")
    wait_parent_rows(driver, 1, ["Котова Елена Павловна"])


def test_pr_03_04_05_filter_add_and_phone_validation(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    select_value(driver, "select-parents-filter", "no_link")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])
    row = parent_rows(driver)[0]
    cells = row.find_elements(By.TAG_NAME, "td")
    assert "—" in text_of(cells[1]), "У родителя без связи должен быть прочерк"
    assert "—" in text_of(cells[2]), "Роль связи должна быть прочерком"
    assert "Показано 1 из 32 родителей" in normalized(
        driver.find_element(*PARENTS_COUNT).text
    )

    set_field(driver, "input-parents-search", "петров")
    wait_until(
        driver,
        lambda d: not parent_rows(d),
        "При поиске внутри фильтра не пропали строки",
    )
    wait_body(driver, "Ничего не найдено")
    assert driver.find_element(*PARENTS_RESET).is_displayed()

    click_js(driver, driver.find_element(*PARENTS_RESET))
    wait_parent_rows(driver, 10)
    assert driver.find_element(*PARENTS_SEARCH).get_attribute("value") == ""
    assert (
        Select(driver.find_element(*PARENTS_FILTER)).first_selected_option.get_attribute(
            "value"
        )
        == "all"
    )

    click_js(driver, driver.find_element(By.ID, "btn-open-add-parent"))
    wait_modal(driver, ADD_MODAL)

    set_field(driver, "add-parent-fullname", "Котов Дмитрий Сергеевич")
    submit_form(driver, "form-add-parent")
    wait_element_visible(
        driver,
        "add-parent-phone-error",
        "Не появилась подсказка об обязательном телефоне",
    )

    assert "32 родителя · у 28 учеников" in normalized(
        driver.find_element(*PARENTS_SUBTITLE).text
    )
    assert len(read_db(driver)["parents"]) == 32

    set_field(driver, "add-parent-phone", "+7 999 123-45-66")
    select_value(driver, "add-parent-student-select", "st-06")
    select_value(driver, "add-parent-role-select", "Отец")
    primary = driver.find_element(By.ID, "add-parent-is-primary")
    if primary.is_selected():
        primary.click()
    submit_form(driver, "form-add-parent")

    wait_modal(driver, ADD_MODAL, opened=False)

    def has_new_parent(db):
        return len(db.get("parents", [])) == 33 and any(
            parent.get("fullName") == "Котов Дмитрий Сергеевич"
            for parent in db["parents"]
        )

    wait_db(driver, has_new_parent, "Новый родитель не сохранился")
    wait_body(driver, "33 родителя · у 28 учеников")

    set_field(driver, "input-parents-search", "Котов Дмитрий")
    wait_parent_rows(driver, 1, ["Котов Дмитрий Сергеевич"])
    row_text = text_of(parent_rows(driver)[0])
    for value in [
        "+7 999 123-45-66",
        "Котов Максим",
        "Отец",
        "Дополнительный",
    ]:
        assert value in row_text, f"В новой строке нет значения «{value}»"
    assert "Основной контакт" not in row_text

    def relation_saved(db):
        parent = next(
            p
            for p in db["parents"]
            if p.get("fullName") == "Котов Дмитрий Сергеевич"
        )
        relation = next(
            (
                r
                for r in db["parentStudentRelations"]
                if r.get("parentId") == parent["id"]
            ),
            None,
        )
        return (
            relation is not None
            and relation.get("studentId") == "st-06"
            and relation.get("relationRole") == "Отец"
            and relation.get("isPrimary") is False
        )

    wait_db(driver, relation_saved, "Связь нового родителя не сохранилась")


def test_pr_06_07_edit_phone_single_record(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    set_field(driver, "input-parents-search", "Котова Елена")
    wait_parent_rows(driver, 1, ["Котова Елена Павловна"])

    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-edit-parent"
    )
    wait_modal(driver, EDIT_MODAL)

    assert (
        driver.find_element(By.ID, "edit-parent-fullname").get_attribute("value")
        == "Котова Елена Павловна"
    )
    assert (
        driver.find_element(By.ID, "edit-parent-phone").get_attribute("value")
        == "+7 999 123-45-62"
    )
    assert (
        len(
            driver.find_elements(
                By.CSS_SELECTOR, "#form-edit-parent input[type='tel']"
            )
        )
        == 1
    ), "У родителя должно быть одно поле телефона"
    assert "Добавить второй телефон" not in text_of(
        driver.find_element(By.ID, "form-edit-parent")
    )

    set_field(driver, "edit-parent-phone", "+7 999 123-45-68")
    submit_form(driver, "form-edit-parent")
    wait_modal(driver, EDIT_MODAL, opened=False)

    wait_db(
        driver,
        lambda db: next(
            (p for p in db["parents"] if p.get("id") == "pr-10"), {}
        ).get("phone")
        == "+7 999 123-45-68",
        "Новый телефон Котовой Е. П. не сохранился",
    )

    def row_has_phone(d):
        rows = [
            row
            for row in parent_rows(d)
            if "Котова Елена Павловна" in text_of(row)
        ]
        return len(rows) == 1 and "+7 999 123-45-68" in text_of(rows[0])

    wait_until(driver, row_has_phone, "Список не показал новый телефон")

    open_parent_summary(driver, "pr-10")
    summary_text = body_text(driver)
    assert "Котова Елена Павловна" in summary_text
    assert "+7 999 123-45-68" in summary_text
    assert "+7 999 123-45-62" not in summary_text

    open_student_summary(driver, "st-06")
    student_text = body_text(driver)
    assert "+7 999 123-45-68" in student_text
    assert "+7 999 123-45-62" not in student_text

    open_parents(driver)
    set_field(driver, "input-parents-search", "Петров Сергей")
    wait_parent_rows(driver, 1, ["Петров Сергей Викторович"])

    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-edit-parent"
    )
    wait_modal(driver, EDIT_MODAL)
    assert (
        driver.find_element(By.ID, "edit-parent-phone").get_attribute("value")
        == "+7 999 123-45-63"
    )
    set_field(driver, "edit-parent-phone", "+7 999 123-45-69")
    submit_form(driver, "form-edit-parent")
    wait_modal(driver, EDIT_MODAL, opened=False)

    wait_db(
        driver,
        lambda db: next(
            (p for p in db["parents"] if p.get("id") == "pr-23"), {}
        ).get("phone")
        == "+7 999 123-45-69",
        "Новый телефон Петрова С. В. не сохранился",
    )

    def petrov_row_has_phone(d):
        rows = [
            row
            for row in parent_rows(d)
            if "Петров Сергей Викторович" in text_of(row)
        ]
        return len(rows) == 1 and "+7 999 123-45-69" in text_of(rows[0])

    wait_until(
        driver, petrov_row_has_phone, "Список не показал телефон Петрова"
    )

    db = read_db(driver)
    assert len(db["parents"]) == 32
    assert (
        len(
            [
                p
                for p in db["parents"]
                if p.get("phone") == "+7 999 123-45-68"
            ]
        )
        == 1
    )
    assert (
        len(
            [
                p
                for p in db["parents"]
                if p.get("phone") == "+7 999 123-45-69"
            ]
        )
        == 1
    )
    assert all(
        p.get("phone") not in ("+7 999 123-45-62", "+7 999 123-45-63")
        for p in db["parents"]
    )


def test_pr_08_09_link_and_primary_contact(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    set_field(driver, "input-parents-search", "Орлова Надежда")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])

    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-link-parent"
    )
    wait_modal(driver, LINK_MODAL)
    wait_body(
        driver,
        "На одного ученика может быть несколько родителей. Основным считается один.",
    )

    select_value(driver, "link-parent-student-select", "st-16")
    select_value(driver, "link-parent-role-select", "Опекун")
    checkbox = driver.find_element(By.ID, "link-parent-is-primary")
    if not checkbox.is_selected():
        checkbox.click()
    submit_form(driver, "form-link-parent")
    wait_modal(driver, LINK_MODAL, opened=False)

    def linked(db):
        relations = [
            r
            for r in db.get("parentStudentRelations", [])
            if r.get("studentId") == "st-16"
        ]
        primaries = primary_relations(db, "st-16")
        return (
            len(relations) == 2
            and len(primaries) == 1
            and primaries[0].get("parentId") == "pr-21"
        )

    wait_db(driver, linked, "Основной контакт ученика не перешёл к Орловой")

    def orlova_row_linked(d):
        rows = [
            row
            for row in parent_rows(d)
            if "Орлова Надежда Павловна" in text_of(row)
        ]
        if len(rows) != 1:
            return False
        text = text_of(rows[0])
        return all(
            value in text
            for value in ("Васильева Дарья", "Опекун", "Основной контакт")
        )

    wait_until(driver, orlova_row_linked, "Строка Орловой не обновилась")

    set_field(driver, "input-parents-search", "")
    wait_parent_rows(driver, 10)
    select_value(driver, "select-parents-filter", "no_link")
    wait_until(
        driver,
        lambda d: not parent_rows(d),
        "Фильтр «Без связи» не стал пустым",
    )

    select_value(driver, "select-parents-filter", "all")
    set_field(driver, "input-parents-search", "Васильев Константин")
    wait_parent_rows(driver, 1, ["Васильев Константин Дмитриевич"])
    vasiliev_text = text_of(parent_rows(driver)[0])
    assert "Дополнительный" in vasiliev_text
    assert "Основной контакт" not in vasiliev_text

    open_student_summary(driver, "st-16")
    block_text = text_of(contacts_block(driver))
    assert "Орлова Надежда Павловна" in block_text
    assert "Васильев Константин Дмитриевич" in block_text
    assert (
        block_text.index("Орлова")
        < block_text.index("Основной контакт")
        < block_text.index("Васильев")
    ), "Основной контакт должен быть указан первым"


def test_pr_10_11_12_unlink_and_delete_rules(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    set_field(driver, "input-parents-search", "Орлова Надежда")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])
    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-link-parent"
    )
    wait_modal(driver, LINK_MODAL)
    select_value(driver, "link-parent-student-select", "st-16")
    submit_form(driver, "form-link-parent")
    wait_modal(driver, LINK_MODAL, opened=False)

    wait_db(
        driver,
        lambda db: any(
            r.get("parentId") == "pr-21" and r.get("studentId") == "st-16"
            for r in db.get("parentStudentRelations", [])
        ),
        "Связь Орловой с ученицей не создалась",
    )

    open_parent_summary(driver, "pr-21")
    click_js(driver, driver.find_element(*SUMMARY_UNLINK_BUTTON))
    wait_modal(driver, UNLINK_MODAL)
    submit_form(driver, "form-card-unlink-student")
    wait_modal(driver, UNLINK_MODAL, opened=False)
    wait_body(driver, "Нет связанных учеников")

    def unlinked(db):
        has_relation = any(
            r.get("parentId") == "pr-21"
            for r in db.get("parentStudentRelations", [])
        )
        has_parent = any(p.get("id") == "pr-21" for p in db.get("parents", []))
        return not has_relation and has_parent

    wait_db(driver, unlinked, "Снятие связи удалило карточку родителя")

    open_parents(driver)
    set_field(driver, "input-parents-search", "Орлова Надежда")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])
    cells = parent_rows(driver)[0].find_elements(By.TAG_NAME, "td")
    assert "—" in text_of(cells[1])

    select_value(driver, "select-parents-filter", "no_link")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])

    select_value(driver, "select-parents-filter", "all")
    set_field(driver, "input-parents-search", "Петров Сергей")
    wait_parent_rows(driver, 1, ["Петров Сергей Викторович"])
    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-delete-parent"
    )
    wait_toast(driver, "Сначала снимите связь с учеником в карточке или сводке")
    wait_parent_rows(driver, 1, ["Петров Сергей Викторович"])
    assert any(
        p.get("id") == "pr-23" for p in read_db(driver).get("parents", [])
    )

    set_field(driver, "input-parents-search", "Орлова Надежда")
    wait_parent_rows(driver, 1, ["Орлова Надежда Павловна"])
    open_row_action(
        driver, parent_rows(driver)[0], "btn-action-delete-parent"
    )
    wait_until(
        driver,
        lambda d: not parent_rows(d),
        "Удалённый родитель остался в списке",
    )
    wait_body(driver, "Ничего не найдено")
    wait_db(
        driver,
        lambda db: not any(
            p.get("id") == "pr-21" for p in db.get("parents", [])
        ),
        "Родитель без связей не удалился",
    )

    set_field(driver, "input-parents-search", "")
    wait_parent_rows(driver, 10)
    subtitle = normalized(driver.find_element(*PARENTS_SUBTITLE).text)
    assert "31 родителя" in subtitle
    assert "у 28 учеников" in subtitle

    select_value(driver, "select-parents-filter", "no_link")
    wait_until(
        driver,
        lambda d: not parent_rows(d),
        "Фильтр «Без связи» не опустел после удаления",
    )


def test_pr_13_14_parent_summary_children(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    set_field(driver, "input-parents-search", "Сидорова Ольга")
    wait_parent_rows(driver, 1, ["Сидорова Ольга Николаевна"])
    click_js(
        driver,
        parent_rows(driver)[0].find_element(
            By.CSS_SELECTOR, ".btn-open-parent-summary"
        ),
    )
    wait_until(
        driver,
        lambda d: d.find_elements(*SUMMARY_RECORD_BUTTON),
        "Не открылась сводка Сидоровой О. Н.",
    )

    assert (
        normalized(driver.find_element(By.CSS_SELECTOR, "h2").text)
        == "Сидорова Ольга Николаевна"
    )
    breadcrumbs = text_of(
        driver.find_element(
            By.XPATH, "//nav[.//a[contains(., 'Класс 7Б')]]"
        )
    )
    for value in ("Класс 7Б", "Родители", "Сидорова Ольга Николаевна"):
        assert value in breadcrumbs

    summary_text = body_text(driver)
    for value in [
        "+7 999 123-45-64",
        "Основной контакт",
        "Анкетные данные — только чтение в сводке",
    ]:
        assert value in summary_text, f"В сводке нет значения «{value}»"

    children_text = text_of(parent_block(driver, "Связанные ученики"))
    for value in (
        "Сидоров Никита",
        "Мать",
        "7Б класс",
        "Открыть сводку по ученику",
    ):
        assert value in children_text, f"В блоке детей нет «{value}»"

    history_text = text_of(parent_block(driver, "История общения с родителем"))
    assert "26.10.2024" in history_text
    assert "18.10.2024" in history_text

    for button_id in (
        "btn-card-record-contact",
        "btn-card-link-student",
        "btn-card-unlink-student",
    ):
        assert driver.find_element(By.ID, button_id).is_displayed()

    open_parents(driver)
    set_field(driver, "input-parents-search", "Котова Елена")
    wait_parent_rows(driver, 1, ["Котова Елена Павловна"])
    click_js(
        driver,
        parent_rows(driver)[0].find_element(
            By.CSS_SELECTOR, ".btn-open-parent-summary"
        ),
    )
    wait_until(
        driver,
        lambda d: d.find_elements(*SUMMARY_RECORD_BUTTON),
        "Не открылась сводка Котовой Е. П.",
    )

    children_text = text_of(parent_block(driver, "Связанные ученики"))
    for value in (
        "Котов Максим",
        "7Б класс",
        "Котова Дарья",
        "9В класс",
        "Дочь",
    ):
        assert value in children_text, f"В блоке детей нет «{value}»"

    risk_text = text_of(
        driver.find_element(
            By.XPATH,
            "//h4[contains(., 'Ребёнок под наблюдением')]"
            "/ancestor::div[contains(@class, 'rounded-3xl')][1]",
        )
    )
    assert "Ребёнок под наблюдением" in risk_text
    assert "Котов Максим" in risk_text

    external_links = parent_block(
        driver, "Связанные ученики"
    ).find_elements(By.CSS_SELECTOR, 'a[href*="ext-"]')
    assert external_links, "Нет ссылки на сводку ребёнка из другого класса"
    click_js(driver, external_links[0])
    wait_body(
        driver,
        "Данные ученика из другого класса (9В) доступны только для чтения",
        "Котова Дарья",
    )


def test_pr_15_16_17_18_contacts_history(driver):
    login(driver, HOMEROOM_TEACHER)
    open_parents(driver)

    set_field(driver, "input-parents-search", "Сидорова Ольга")
    wait_parent_rows(driver, 1, ["Сидорова Ольга Николаевна"])
    click_js(
        driver,
        parent_rows(driver)[0].find_element(
            By.CSS_SELECTOR, ".btn-open-parent-summary"
        ),
    )
    wait_until(
        driver,
        lambda d: d.find_elements(*SUMMARY_RECORD_BUTTON),
        "Не открылась сводка Сидоровой О. Н.",
    )

    wait_until(
        driver,
        lambda d: len(history_items(d)) >= 2,
        "В истории общения меньше двух записей",
    )
    items = history_items(driver)
    first_text = text_of(items[0])
    second_text = text_of(items[1])
    assert "26.10.2024" in first_text
    assert "Звонок" in first_text
    assert "18.10.2024" in second_text
    assert "Мессенджер" in second_text

    click_js(driver, driver.find_element(*SUMMARY_RECORD_BUTTON))
    wait_modal(driver, CONTACT_MODAL)
    assert (
        driver.find_element(By.ID, "contact-date-input").get_attribute("value")
        == "2024-10-28"
    )
    selected_student = Select(
        driver.find_element(By.ID, "contact-student-select")
    ).first_selected_option.get_attribute("value")
    assert selected_student == "st-14"

    select_value(driver, "contact-channel-select", "phone")
    summary_text = "Дозвонились, справку принесёт 29.10"
    set_field(driver, "contact-summary-input", summary_text)
    assert driver.find_element(By.ID, "contact-agreement-check").is_selected()
    submit_form(driver, "form-record-parent-contact")
    wait_modal(driver, CONTACT_MODAL, opened=False)

    wait_history_first(
        driver,
        "28.10.2024",
        "Смирнова М. В.",
        "Звонок",
        summary_text,
        "Договорённость достигнута",
    )
    wait_db(
        driver,
        lambda db: any(
            c.get("summary") == summary_text
            and c.get("studentId") == "st-14"
            for c in db.get("parentContacts", [])
        ),
        "Контакт с родителем не сохранился",
    )

    open_student_summary(driver, "st-14")
    wait_body(driver, summary_text)

    open_parent_summary(driver, "pr-27")
    click_js(driver, driver.find_element(*SUMMARY_RECORD_BUTTON))
    wait_modal(driver, CONTACT_MODAL)
    set_field(driver, "contact-summary-input", "Проверка обязательности канала")
    submit_form(driver, "form-record-parent-contact")
    wait_element_visible(
        driver,
        "contact-channel-error",
        "Не подсветился обязательный канал связи",
    )

    select_value(driver, "contact-channel-select", "chat")
    set_field(driver, "contact-summary-input", "")
    submit_form(driver, "form-record-parent-contact")
    wait_element_visible(
        driver,
        "contact-summary-error",
        "Не подсветился обязательный итог разговора",
    )

    final_summary = "Успешный контакт после проверок"
    set_field(driver, "contact-summary-input", final_summary)
    submit_form(driver, "form-record-parent-contact")
    wait_modal(driver, CONTACT_MODAL, opened=False)
    wait_history_first(driver, "28.10.2024", final_summary)

    open_parent_summary(driver, "pr-10")
    click_js(driver, driver.find_element(*SUMMARY_RECORD_BUTTON))
    wait_modal(driver, CONTACT_MODAL)
    select_value(driver, "contact-student-select", "")
    select_value(driver, "contact-channel-select", "chat")
    general_summary = "Напоминание о собрании 31.10"
    set_field(driver, "contact-summary-input", general_summary)
    submit_form(driver, "form-record-parent-contact")
    wait_modal(driver, CONTACT_MODAL, opened=False)
    wait_history_first(driver, "28.10.2024", "Мессенджер", general_summary)

    open_student_summary(driver, "st-06")
    assert general_summary not in body_text(driver)

    open_parent_summary(driver, "pr-23")
    wait_body(driver, "Разговоров с этим родителем ещё не было")
    assert driver.find_element(By.ID, "btn-empty-record-contact").is_displayed()


def test_pr_19_20_role_access_and_privacy(driver):
    login(driver, SUBJECT_TEACHER)

    driver.get(app_url("parents/"))
    wait_body(driver, "Доступ ограничен")
    assert "Родители 7Б" not in body_text(driver)

    switch_user(driver, PARENT_USER)

    driver.get(app_url("parents/"))
    wait_body(driver, "Доступ ограничен")

    driver.get(app_url("profile/"))
    wait_body(driver, "Мой профиль")
    profile_values = [
        field.get_attribute("value")
        for field in driver.find_elements(
            By.CSS_SELECTOR, "#app-content input"
        )
    ]
    assert "Петров Сергей Викторович" in profile_values
    assert "Родитель" in profile_values
    assert "petrov@mail.ru" in profile_values

    driver.get(app_url("child/"))
    wait_until(
        driver,
        lambda d: d.find_elements(By.ID, "child-view-container"),
        "Не открылась страница ребёнка",
    )
    parent_child_text = body_text(driver)
    assert "Петрова Анна Сергеевна" in parent_child_text
    assert "История общения с родителями" not in parent_child_text
    assert "Заметки классрука" not in parent_child_text

    switch_user(driver, STUDENT_USER)

    driver.get(app_url("student/?id=st-23&period=q1_2024"))
    wait_body(driver, "Доступ ограничен")
    student_text = body_text(driver)
    assert "История общения с родителями" not in student_text
    assert "Заметки классрука" not in student_text

    driver.get(app_url("parents/"))
    wait_body(driver, "Доступ ограничен")

    driver.get(app_url("grades/"))
    wait_body(driver, "Мои оценки")
    assert "Доступ ограничен" not in body_text(driver)
