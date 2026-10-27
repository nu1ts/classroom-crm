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


def search_value(driver):
    return driver.find_element(
        By.ID, "input-search-student-list"
    ).get_attribute("value")


def search_students(driver, query):
    field = driver.find_element(By.ID, "input-search-student-list")
    driver.execute_script(
        "arguments[0].value = ''; "
        "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));",
        field,
    )
    field.send_keys(query)


def click_sort(driver, sort_by):
    driver.find_element(
        By.CSS_SELECTOR, f"th[data-sort-by='{sort_by}']"
    ).click()


def active_page(driver):
    for button in driver.find_elements(
        By.CSS_SELECTOR, ".btn-pagination-page"
    ):
        classes = button.get_attribute("class") or ""
        if "bg-brand-500" in classes:
            return int(button.get_attribute("data-page"))
    return None


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


def wait_first_row(driver, student_id, timeout=10):
    def check(d):
        rows = student_rows(d)
        if rows and rows[0].get_attribute("data-student-id") == student_id:
            return rows[0]
        return False

    try:
        return WebDriverWait(driver, timeout).until(check)
    except TimeoutException:
        pytest.fail(
            f"Первой ожидалась строка {student_id}, получено: "
            f"{[row.get_attribute('data-student-id') for row in student_rows(driver)]}"
        )


def wait_order_changed(driver, previous_ids, timeout=10):
    def check(d):
        return [
            row.get_attribute("data-student-id") for row in student_rows(d)
        ] != previous_ids

    try:
        WebDriverWait(driver, timeout).until(check)
    except TimeoutException:
        pytest.fail("Сортировка не изменила порядок строк списка")


def open_summary_for_first_row(driver, timeout=10):
    row = student_rows(driver)[0]
    row.find_element(
        By.CSS_SELECTOR, ".btn-open-student-summary"
    ).click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-100"
        in (
            d.find_element(
                By.ID, "modal-student-summary"
            ).get_attribute("class")
            or ""
        )
    )
    content = WebDriverWait(driver, timeout).until(
        lambda d: d.find_element(By.ID, "student-summary-content")
        if normalized(
            d.find_element(By.ID, "student-summary-content").text
        )
        else False
    )
    return normalized(content.text)


def close_summary(driver, timeout=10):
    driver.find_element(By.ID, "btn-close-students-summary-footer").click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-0"
        in (
            d.find_element(
                By.ID, "modal-student-summary"
            ).get_attribute("class")
            or ""
        )
    )


def test_ov_08_pagination_page_size(driver):
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


def test_ov_09_pagination_keeps_state(driver):
    """Проверяет сохранение поиска и сортировки при переходе по страницам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "ов")
    wait_counter_contains(driver, "Показано 1–10 из 28 учеников 7Б класса")

    before_sort = row_ids(driver)
    click_sort(driver, "grade")
    wait_order_changed(driver, before_sort)
    page_one_ids = row_ids(driver)

    go_to_page(driver, 2)
    wait_counter_contains(driver, "Показано 11–12 из 28 учеников 7Б класса")
    page_two_ids = row_ids(driver)

    assert not set(page_one_ids) & set(page_two_ids), (
        "Ученики повторяются на первой и второй страницах"
    )
    assert len(set(page_one_ids + page_two_ids)) == 12, (
        "На двух страницах не 12 уникальных учеников: "
        f"{sorted(set(page_one_ids + page_two_ids))}"
    )

    go_to_page(driver, 1)
    wait_counter_contains(driver, "Показано 1–10 из 28 учеников 7Б класса")
    assert search_value(driver) == "ов", (
        f"Поиск сбросился при переходе по страницам: «{search_value(driver)}»"
    )
    assert row_ids(driver) == page_one_ids, (
        "После возврата на первую страницу изменился порядок учеников: "
        f"{row_ids(driver)} вместо {page_one_ids}"
    )

    go_to_page(driver, 2)
    wait_counter_contains(driver, "Показано 11–12 из 28 учеников 7Б класса")
    assert row_ids(driver) == page_two_ids, (
        "Состав второй страницы изменился после возврата: "
        f"{row_ids(driver)} вместо {page_two_ids}"
    )


def test_ov_10_sort_columns(driver):
    """Проверяет сортировку списка по среднему баллу в обоих направлениях."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    click_sort(driver, "grade")
    first = wait_first_row(driver, "st-14")
    rows = student_rows(driver)
    assert "Сидоров" in normalized(first.text) and "3,1" in normalized(
        first.text
    ), f"Первая строка по возрастанию: «{first.text}»"
    assert rows[1].get_attribute("data-student-id") == "st-06", (
        "Второй по возрастанию ожидался Котов Максим, получено: "
        f"{rows[1].get_attribute('data-student-id')}"
    )
    assert "3,3" in normalized(rows[1].text), (
        f"У Котова Максима не 3,3: «{rows[1].text}»"
    )

    click_sort(driver, "grade")
    first = wait_first_row(driver, "st-13")
    rows = student_rows(driver)
    assert "Романов" in normalized(first.text) and "5,0" in normalized(
        first.text
    ), f"Первая строка по убыванию: «{first.text}»"
    assert rows[1].get_attribute("data-student-id") == "st-01", (
        "Второй по убыванию ожидался Александров Егор, получено: "
        f"{rows[1].get_attribute('data-student-id')}"
    )
    assert "4,8" in normalized(rows[1].text), (
        f"У Александрова Егора не 4,8: «{rows[1].text}»"
    )


def test_ov_11_back_keeps_state(driver):
    """Проверяет сохранение поиска, сортировки и страницы после закрытия
    сводки ученика."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "ов")
    wait_counter_contains(driver, "Показано 1–10 из 28 учеников 7Б класса")

    before_sort = row_ids(driver)
    click_sort(driver, "absences")
    wait_order_changed(driver, before_sort)

    go_to_page(driver, 2)
    wait_counter_contains(driver, "Показано 11–12 из 28 учеников 7Б класса")
    page_two_ids = row_ids(driver)
    expected_id = student_rows(driver)[0].get_attribute("data-student-id")

    summary = open_summary_for_first_row(driver)
    assert f"Личное дело № {expected_id}" in summary, (
        f"Открыта не сводка ученика {expected_id}: «{summary}»"
    )

    close_summary(driver)

    assert search_value(driver) == "ов", (
        "После закрытия сводки поиск сбросился: "
        f"«{search_value(driver)}»"
    )
    wait_counter_contains(driver, "Показано 11–12 из 28 учеников 7Б класса")
    assert active_page(driver) == 2, (
        f"После закрытия сводки открыта страница {active_page(driver)} вместо 2"
    )
    assert row_ids(driver) == page_two_ids, (
        "После закрытия сводки изменился состав второй страницы: "
        f"{row_ids(driver)} вместо {page_two_ids}"
    )
