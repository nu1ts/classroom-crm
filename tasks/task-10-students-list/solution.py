import os

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


def open_students(driver, timeout=10):
    driver.get(app_url("students/"))
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.ID, "students-table-wrapper"))
    )
    wait_counter_contains(driver, "из 28", timeout)


def counter_text(driver):
    return normalized(
        driver.find_element(By.ID, "students-counter-label").text
    )


def wait_counter_contains(driver, expected, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: expected in normalized(
                d.find_element(By.ID, "students-counter-label").text
            )
        )
    except TimeoutException:
        pytest.fail(
            f"В счётчике ожидалось «{expected}», получено: «{counter_text(driver)}»"
        )


def student_rows(driver):
    return driver.find_elements(By.CSS_SELECTOR, "tr.student-row-item")


def row_ids(driver):
    return [row.get_attribute("data-student-id") for row in student_rows(driver)]


def row_name(row):
    element = row.find_element(
        By.XPATH,
        ".//span[contains(@class, 'font-bold') and "
        "contains(@class, 'text-slate-900')][1]",
    )
    return normalized(element.text)


def wait_row_count(driver, expected, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: len(student_rows(d)) == expected
        )
    except TimeoutException:
        pytest.fail(
            f"Ожидалось строк: {expected}, получено: {len(student_rows(driver))}, "
            f"счётчик: «{counter_text(driver)}»"
        )


def wait_rows_at_least(driver, minimum, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: len(student_rows(d)) >= minimum
        )
    except TimeoutException:
        pytest.fail(
            f"Ожидалось не меньше {minimum} строк, получено: "
            f"{len(student_rows(driver))}"
        )


def wait_search_value(driver, expected, timeout=10):
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_element(
            By.ID, "input-search-student-list"
        ).get_attribute("value")
        == expected
    )


def search_students(driver, query):
    field = driver.find_element(By.ID, "input-search-student-list")
    driver.execute_script(
        "arguments[0].value = ''; "
        "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));",
        field,
    )
    field.send_keys(query)


def clear_search(driver):
    driver.find_element(By.ID, "btn-clear-student-search").click()
    wait_search_value(driver, "")


def filter_button(driver):
    return driver.find_element(By.ID, "btn-filter-absences-toggle")


def filter_active(driver):
    return "bg-brand-500" in (filter_button(driver).get_attribute("class") or "")


def wait_filter_active(driver, active=True, timeout=10):
    WebDriverWait(driver, timeout).until(
        lambda d: filter_active(d) is active
    )


def toggle_absences_filter(driver):
    filter_button(driver).click()


def wait_row_by_student(driver, student_id, timeout=10):
    def find_row(d):
        for row in student_rows(d):
            if row.get_attribute("data-student-id") == student_id:
                return row
        return False

    return WebDriverWait(driver, timeout).until(find_row)


def wait_row_by_surname(driver, surname, timeout=10):
    def find_row(d):
        for row in student_rows(d):
            if surname in normalized(row.text):
                return row
        return False

    try:
        return WebDriverWait(driver, timeout).until(find_row)
    except TimeoutException:
        pytest.fail(
            f"В списке нет ученика с фамилией {surname}, "
            f"первая строка: «{normalized(student_rows(driver)[0].text)}»"
        )


def open_summary(driver, student_id, timeout=10):
    row = wait_row_by_student(driver, student_id, timeout)
    row.find_element(By.CSS_SELECTOR, ".btn-open-student-summary").click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-100"
        in (d.find_element(By.ID, "modal-student-summary").get_attribute("class") or "")
    )
    content = WebDriverWait(driver, timeout).until(
        lambda d: d.find_element(By.ID, "student-summary-content")
        if normalized(d.find_element(By.ID, "student-summary-content").text)
        else False
    )
    return normalized(content.text)


def close_summary(driver, timeout=10):
    driver.find_element(By.ID, "btn-close-students-summary-footer").click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-0"
        in (d.find_element(By.ID, "modal-student-summary").get_attribute("class") or "")
    )


def add_student(driver, last_name, first_name, timeout=10):
    driver.find_element(By.ID, "btn-add-student-mock").click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-100"
        in (d.find_element(By.ID, "modal-add-student").get_attribute("class") or "")
    )
    driver.find_element(By.ID, "add-student-lastname").send_keys(last_name)
    driver.find_element(By.ID, "add-student-firstname").send_keys(first_name)
    driver.find_element(By.ID, "btn-submit-add-student").click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-0"
        in (d.find_element(By.ID, "modal-add-student").get_attribute("class") or "")
    )


def collect_all_rows(driver):
    collected = []
    page = 1
    while True:
        collected.extend(read_row(row) for row in student_rows(driver))
        has_next = any(
            button.get_attribute("data-page") == str(page + 1)
            for button in driver.find_elements(
                By.CSS_SELECTOR, ".btn-pagination-page"
            )
        )
        if not has_next:
            break
        page += 1
        if page > 10:
            pytest.fail("Пагинация не завершилась за 10 страниц")
        go_to_page(driver, page)
    return collected


def read_row(row):
    cells = row.find_elements(By.TAG_NAME, "td")
    name_text = normalized(cells[0].text)
    return {
        "id": row.get_attribute("data-student-id"),
        "name": name_text,
        "status": normalized(cells[1].text),
        "average": normalized(cells[2].text),
        "risk": "В зоне риска" in name_text,
    }


def go_to_page(driver, page, timeout=10):
    buttons = driver.find_elements(
        By.CSS_SELECTOR, ".btn-pagination-page"
    )
    for button in buttons:
        if button.get_attribute("data-page") == str(page):
            button.click()
            break
    else:
        pytest.fail(f"Не найдена кнопка страницы {page}")

    try:
        WebDriverWait(driver, timeout).until(
            lambda d: active_page(d) == page
        )
    except TimeoutException:
        pytest.fail(
            f"Не удалось перейти на страницу {page}, "
            f"активная страница: {active_page(driver)}"
        )


def active_page(driver):
    for button in driver.find_elements(
        By.CSS_SELECTOR, ".btn-pagination-page"
    ):
        classes = button.get_attribute("class") or ""
        if "bg-brand-500" in classes:
            return int(button.get_attribute("data-page"))
    return None


def test_ov_01_default_list(driver):
    """Проверяет состав, колонки и алфавитный порядок списка, основной
    контакт родителя и сортировку по фамилии после зачисления ученика."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    assert "из 28" in counter_text(driver), (
        f"В списке не 28 учеников: «{counter_text(driver)}»"
    )

    headers = [
        normalized(th.text)
        for th in driver.find_elements(
            By.CSS_SELECTOR, "#students-table-wrapper thead th"
        )
    ]
    for label in (
        "ФИО УЧЕНИКА",
        "СТАТУС",
        "СРЕДНИЙ БАЛЛ",
        "ПРОПУСКИ",
        "РОДИТЕЛЬ ДЛЯ СВЯЗИ",
        "ДЕЙСТВИЯ",
    ):
        assert label in headers, f"Нет колонки «{label}»: {headers}"

    rows = student_rows(driver)
    assert rows, "Список учеников пуст"
    first_id = rows[0].get_attribute("data-student-id")
    assert first_id == "st-01", (
        f"Первая строка не Александров Егор: {first_id} «{rows[0].text}»"
    )
    assert "Александров Егор Алексеевич" in normalized(rows[0].text), (
        f"Первая строка списка: «{rows[0].text}»"
    )

    search_students(driver, "Петрова")
    wait_row_count(driver, 1)
    row_text = normalized(student_rows(driver)[0].text)
    assert "Петрова Анна Сергеевна" in row_text, (
        f"Не найдена Петрова Анна: «{row_text}»"
    )
    assert "Петров Сергей Викторович" in row_text, (
        f"Не указан основной контакт отца: «{row_text}»"
    )
    assert "+7 999 123-45-63" in row_text, (
        f"Не указан телефон основного контакта: «{row_text}»"
    )
    assert "Петрова Елена" not in row_text, (
        f"Вместо основного контакта показана мать: «{row_text}»"
    )

    clear_search(driver)
    wait_counter_contains(driver, "из 28")

    add_student(driver, "Абрамов", "Тимур")
    wait_counter_contains(driver, "из 29")

    added = wait_row_by_surname(driver, "Абрамов")
    assert added.get_attribute("data-student-id") == "st-29", (
        "У зачисленного ученика ожидалось личное дело st-29, получено: "
        f"{added.get_attribute('data-student-id')}"
    )
    first_row = student_rows(driver)[0]
    assert "Абрамов" in normalized(first_row.text), (
        "После зачисления список должен остаться отсортированным по фамилии, "
        f"первая строка: «{first_row.text}»"
    )


def test_ov_02_list_matches_summary(driver):
    """Проверяет, что средний балл и пропуски в списке совпадают со сводкой
    ученика."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "Петрова")
    wait_row_count(driver, 1)
    list_text = normalized(student_rows(driver)[0].text)
    assert "4,5" in list_text, f"В списке нет балла 4,5: «{list_text}»"
    assert "4 из 40" in list_text, f"В списке нет «4 из 40»: «{list_text}»"

    summary_text = open_summary(driver, "st-23")
    assert "4,5" in summary_text, f"В сводке нет балла 4,5: «{summary_text}»"
    assert "4 из 40" in summary_text, (
        f"В сводке нет «4 из 40»: «{summary_text}»"
    )
    close_summary(driver)

    search_students(driver, "Сидоров")
    wait_row_count(driver, 1)
    list_text = normalized(student_rows(driver)[0].text)
    assert "3,1" in list_text, f"В списке нет балла 3,1: «{list_text}»"
    assert "12 из 40" in list_text, f"В списке нет «12 из 40»: «{list_text}»"

    summary_text = open_summary(driver, "st-14")
    assert "3,1" in summary_text, f"В сводке нет балла 3,1: «{summary_text}»"
    assert "12 из 40" in summary_text, (
        f"В сводке нет «12 из 40»: «{summary_text}»"
    )
    close_summary(driver)


def test_ov_03_search_case_insensitive(driver):
    """Проверяет поиск по фамилии без учёта регистра и восстановление списка
    после очистки поиска."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "сидор")
    wait_row_count(driver, 1)
    row_text = normalized(student_rows(driver)[0].text)
    assert "Сидоров Никита Артёмович" in row_text, (
        f"Поиск «сидор» не нашёл Сидорова: «{row_text}»"
    )
    wait_counter_contains(driver, "Показано 1 из 28")

    clear_search(driver)
    wait_rows_at_least(driver, 2)
    wait_counter_contains(driver, "из 28")


def test_ov_04_absences_filter(driver):
    """Проверяет фильтр по пропускам: ученики без пропусков не попадают
    в выборку."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    toggle_absences_filter(driver)
    wait_filter_active(driver, True)
    wait_counter_contains(driver, "Показано 1–10 из 28 учеников 7Б класса")
    assert student_rows(driver), "После включения фильтра список пуст"

    surnames = [
        row_name(row).split()[0] for row in student_rows(driver)
    ]
    for surname in ("Александров", "Николаева", "Романов"):
        assert surname not in surnames, (
            f"{surname} без пропусков попал в выборку фильтра"
        )

    toggle_absences_filter(driver)
    wait_filter_active(driver, False)
    wait_counter_contains(driver, "из 28")


def test_ov_05_status_and_risk_badge(driver):
    """Проверяет, что статус ученика и бейдж зоны риска отображаются
    раздельно."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    records = collect_all_rows(driver)
    assert len(records) == 28, (
        f"Ожидалось 28 учеников, собрано {len(records)}"
    )

    wrong_statuses = [
        (record["name"], record["status"])
        for record in records
        if record["status"] != "Активен"
    ]
    assert not wrong_statuses, (
        "В колонке «Статус» должны быть только «Активен»: "
        f"{wrong_statuses}"
    )

    risk_records = [record for record in records if record["risk"]]
    assert len(risk_records) == 5, (
        "Бейдж «В зоне риска» должен стоять у пяти учеников, "
        f"найдено: {[record['name'] for record in risk_records]}"
    )

    for surname in ("Сидоров", "Морозов", "Петрова", "Волкова", "Котов"):
        assert any(
            record["risk"] and surname in record["name"]
            for record in records
        ), f"Нет бейджа зоны риска у ученика с фамилией {surname}"

    assert all(
        "В зоне риска" not in record["status"] for record in records
    ), "Зона риска попала в колонку «Статус»"


def test_ov_06_search_with_filter(driver):
    """Проверяет одновременное применение поиска и фильтра по пропускам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    toggle_absences_filter(driver)
    wait_filter_active(driver, True)

    search_students(driver, "Петров")
    wait_row_count(driver, 1)
    row_text = normalized(student_rows(driver)[0].text)
    assert "Петрова Анна Сергеевна" in row_text, (
        f"Поиск с фильтром выбрал не Петрову: «{row_text}»"
    )
    wait_counter_contains(driver, "Показано 1 из 28")

    clear_search(driver)
    wait_filter_active(driver, True)


def test_ov_07_empty_result_state(driver):
    """Проверяет пустое состояние списка и сброс фильтров."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    toggle_absences_filter(driver)
    wait_filter_active(driver, True)

    search_students(driver, "александров")
    wait_counter_contains(driver, "Показано 0–0 из 28 учеников 7Б класса")

    table_text = normalized(
        driver.find_element(By.ID, "students-table-wrapper").text
    )
    assert "Ничего не найдено" in table_text, (
        f"Нет пустого состояния списка: «{table_text}»"
    )
    assert not student_rows(driver), (
        "При пустом результате в таблице остались строки учеников"
    )

    reset_button = driver.find_element(
        By.ID, "btn-reset-students-filters"
    )
    assert reset_button.is_displayed(), (
        "В пустом результате нет кнопки сброса фильтров"
    )
    reset_button.click()

    wait_search_value(driver, "")
    wait_filter_active(driver, False)
    wait_counter_contains(driver, "из 28")
    wait_rows_at_least(driver, 2)
