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


def first_row_id(driver):
    rows = student_rows(driver)
    return rows[0].get_attribute("data-student-id") if rows else None


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


def wait_row_count(driver, expected, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: len(student_rows(d)) == expected
        )
    except TimeoutException:
        pytest.fail(
            f"Ожидалось строк: {expected}, получено: "
            f"{len(student_rows(driver))}, счётчик: «{counter_text(driver)}»"
        )


def search_students(driver, query):
    field = driver.find_element(By.ID, "input-search-student-list")
    driver.execute_script(
        "arguments[0].value = ''; "
        "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));",
        field,
    )
    field.send_keys(query)


def search_value(driver):
    return driver.find_element(
        By.ID, "input-search-student-list"
    ).get_attribute("value")


def toggle_absences_filter(driver):
    driver.find_element(By.ID, "btn-filter-absences-toggle").click()


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
    driver.find_element(
        By.ID, "btn-close-students-summary-footer"
    ).click()
    WebDriverWait(driver, timeout).until(
        lambda d: "opacity-0"
        in (
            d.find_element(
                By.ID, "modal-student-summary"
            ).get_attribute("class")
            or ""
        )
    )


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


def test_ov_07_empty_search_with_filter(driver):
    """Проверяет пустой результат поиска при включённом фильтре и сброс
    фильтров."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    toggle_absences_filter(driver)
    wait_counter_contains(driver, "из 25")

    search_students(driver, "александров")
    wait_counter_contains(driver, "из 0")

    try:
        WebDriverWait(driver, 10).until(
            lambda d: "Ничего не найдено"
            in normalized(
                d.find_element(
                    By.ID, "students-table-wrapper"
                ).text
            )
        )
    except TimeoutException:
        pytest.fail(
            "При пустом результате нет сообщения «Ничего не найдено»: "
            f"«{normalized(driver.find_element(By.ID, 'students-table-wrapper').text)}»"
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

    wait_counter_contains(driver, "из 28")
    wait_first_row(driver, "st-01")
    assert search_value(driver) == "", (
        f"После сброса поиск не очищен: «{search_value(driver)}»"
    )


def test_ov_09_pagination_keeps_sort(driver):
    """Проверяет сохранение поиска и сортировки при переходе по страницам."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "ов")
    wait_counter_contains(driver, "из 12")

    click_sort(driver, "absences")
    wait_first_row(driver, "st-01")
    click_sort(driver, "absences")
    wait_first_row(driver, "st-14")

    go_to_page(driver, 2)
    wait_row_count(driver, 2)
    wait_counter_contains(driver, "11–12 из 12")
    page_two_ids = [
        row.get_attribute("data-student-id") for row in student_rows(driver)
    ]
    assert page_two_ids == ["st-13", "st-01"], (
        "На второй странице ожидались Романов Илья и Александров Егор, "
        f"получено: {page_two_ids}"
    )

    go_to_page(driver, 1)
    wait_first_row(driver, "st-14")
    assert search_value(driver) == "ов", (
        f"Поиск сбросился при переходе по страницам: «{search_value(driver)}»"
    )
    wait_counter_contains(driver, "1–10 из 12")
    wait_row_count(driver, 10)


def test_ov_10_sort_by_average(driver):
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


def test_ov_11_summary_close_keeps_state(driver):
    """Проверяет сохранение поиска и сортировки после закрытия сводки
    ученика."""
    reset_all(driver)
    submit_login(driver, TEACHER, PASSWORD)
    wait_for_app(driver)
    open_students(driver)

    search_students(driver, "ов")
    wait_counter_contains(driver, "из 12")
    click_sort(driver, "absences")
    wait_first_row(driver, "st-01")
    click_sort(driver, "absences")
    wait_first_row(driver, "st-14")

    summary = open_summary_for_first_row(driver)
    assert "Сидоров Никита Артёмович" in summary, (
        f"Открыта не сводка Сидорова Никиты: «{summary}»"
    )
    assert "3,1" in summary, (
        f"В сводке Сидорова нет среднего балла 3,1: «{summary}»"
    )

    close_summary(driver)

    assert search_value(driver) == "ов", (
        "После закрытия сводки поиск сбросился: "
        f"«{search_value(driver)}»"
    )
    wait_first_row(driver, "st-14")
    wait_counter_contains(driver, "1–10 из 12")
    wait_row_count(driver, 10)
