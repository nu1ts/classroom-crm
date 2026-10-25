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
    button = driver.find_element(By.ID, "btn-clear-student-search")
    button.click()
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


def test_ov_01_students_list_order(driver):
    """Проверяет состав, колонки и алфавитный порядок списка, а также
    основного родителя Петровой Анны."""
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
    wait_counter_contains(driver, "из 25")
    assert student_rows(driver), "После включения фильтра список пуст"

    toggle_absences_filter(driver)
    wait_filter_active(driver, False)
    wait_counter_contains(driver, "из 28")


def test_ov_06_search_and_filter_combined(driver):
    """Проверяет одновременное применение поиска и фильтра, пустой результат
    и сброс фильтров."""
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
    wait_rows_at_least(driver, 2)
    assert filter_active(driver), "Фильтр сбросился при очистке поиска"

    search_students(driver, "фыва")
    wait_row_count(driver, 0)
    wait_counter_contains(driver, "из 0")
    table_text = normalized(
        driver.find_element(By.ID, "students-table-wrapper").text
    )
    assert "Ничего не найдено" in table_text, (
        f"Нет пустого состояния списка: «{table_text}»"
    )
    reset_buttons = driver.find_elements(
        By.ID, "btn-reset-students-filters"
    )
    assert reset_buttons, "Нет кнопки сброса фильтров"
    reset_buttons[0].click()

    wait_search_value(driver, "")
    wait_filter_active(driver, False)
    wait_counter_contains(driver, "из 28")
    wait_rows_at_least(driver, 2)


def test_ov_08_pagination(driver):
    """Проверяет размер страницы, счётчик и отсутствие повторов учеников
    между страницами."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    wait_counter_contains(driver, "Показано 1–10 из 28")
    page_buttons = driver.find_elements(
        By.CSS_SELECTOR, ".btn-pagination-page"
    )
    assert len(page_buttons) == 3, (
        f"Ожидалось 3 страницы, получено: {len(page_buttons)}"
    )
    first_page_ids = row_ids(driver)
    assert len(first_page_ids) == 10, (
        f"На первой странице {len(first_page_ids)} строк вместо 10"
    )

    driver.find_element(
        By.CSS_SELECTOR, '.btn-pagination-page[data-page="2"]'
    ).click()
    wait_counter_contains(driver, "Показано 11–20 из 28")
    second_page_ids = row_ids(driver)
    assert len(second_page_ids) == 10, (
        f"На второй странице {len(second_page_ids)} строк вместо 10"
    )
    assert not set(first_page_ids) & set(second_page_ids), (
        "Ученики повторяются на первой и второй страницах"
    )

    driver.find_element(
        By.CSS_SELECTOR, '.btn-pagination-page[data-page="3"]'
    ).click()
    wait_counter_contains(driver, "Показано 21–28 из 28")
    third_page_ids = row_ids(driver)
    assert len(third_page_ids) == 8, (
        f"На третьей странице {len(third_page_ids)} строк вместо 8"
    )
    assert not set(second_page_ids) & set(third_page_ids), (
        "Ученики повторяются на второй и третьей страницах"
    )
    assert len(set(first_page_ids + second_page_ids + third_page_ids)) == 28, (
        "На трёх страницах не 28 уникальных учеников"
    )
