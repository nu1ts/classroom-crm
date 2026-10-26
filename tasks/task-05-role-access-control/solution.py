import os
from urllib.parse import quote

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

BASE_URL = (TEST_URL or "").rstrip("/")
HOMEROOM_TEACHER = "smirnova@school.ru"
SUBJECT_TEACHER = "kozlov@school.ru"
ADMIN = "admin@school.ru"
PARENT = "petrov@mail.ru"
STUDENT = "petrova.a@school.ru"
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


def reset_all(driver):
    driver.get(app_url("login/"))
    driver.execute_script(
        "window.localStorage.clear(); window.sessionStorage.clear();"
    )
    driver.get(app_url("login/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def login(driver, username):
    reset_all(driver)
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(username)
    secret = driver.find_element(By.ID, "login-password")
    secret.clear()
    secret.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_path(driver, path):
    driver.get(app_url(path))
    WebDriverWait(driver, 10).until(
        lambda d: d.find_elements(By.ID, "app-content")
        or "Доступ ограничен" in d.page_source
    )


def page_text(driver):
    return normalized(driver.find_element(By.TAG_NAME, "body").text)


def assert_forbidden(driver, context):
    text = page_text(driver)
    assert "Доступ ограничен" in text, (
        f"{context}: ожидался отказ в доступе, получено «{text}»"
    )
    assert "У вас нет прав для просмотра данного раздела или объекта системы." in text, (
        f"{context}: отказ должен быть стандартным и не раскрывать причину"
    )


def assert_no_sensitive_data(driver, context):
    text = page_text(driver)
    forbidden_fragments = (
        "Петрова Анна Сергеевна",
        "Сидоров Никита",
        "Козлов Андрей Павлович",
        "+7 999",
        "Математика (Алгебра)",
        "Ученики класса",
    )
    exposed = [fragment for fragment in forbidden_fragments if fragment in text]
    assert not exposed, f"{context}: отказ раскрыл данные: {exposed}; текст «{text}»"


def current_grade(driver, lesson_id="lsn-39", student_id="st-02"):
    db = driver.execute_script("return window.crmApi.getDB();")
    return next(
        (
            grade
            for grade in db.get("grades", [])
            if grade.get("lessonId") == lesson_id
            and grade.get("studentId") == student_id
        ),
        None,
    )


def forbidden_snapshot(driver, path):
    open_path(driver, path)
    assert_forbidden(driver, path)
    assert_no_sensitive_data(driver, path)
    return normalized(page_text(driver))


def test_rm_06_forbidden_actions(driver):
    """Классрук не видит и не может вызвать изменение оценки."""
    login(driver, HOMEROOM_TEACHER)
    open_path(driver, "journal/")
    assert driver.find_elements(By.ID, "journal-table-container"), (
        "Классный руководитель должен открыть журнал своего класса"
    )

    edit_controls = driver.find_elements(
        By.CSS_SELECTOR,
        "#journal-table-container input:not([readonly]), "
        "#journal-table-container select, #btn-save-journal",
    )
    assert not edit_controls, (
        "У классного руководителя в журнале не должно быть элементов изменения "
        f"оценок, найдено: {len(edit_controls)}"
    )

    before = current_grade(driver)
    assert before is not None, "Не найдена исходная оценка Беляева на уроке lsn-39"
    result = driver.execute_script(
        "return window.crmApi.saveGradeRecord({"
        "lessonId: 'lsn-39', studentId: 'st-02', value: 2});"
    )
    assert result and result.get("success") is False, (
        f"Прямое изменение оценки классруком должно быть отклонено, получено {result}"
    )
    assert "недоступно" in result.get("error", "").lower(), (
        f"Нет сообщения о запрете действия: {result}"
    )
    after = current_grade(driver)
    assert after == before, "Оценка изменилась несмотря на запрет для классрука"


def test_rm_07_admin_routes_direct_access(driver):
    """Классрук и предметник не открывают разделы администратора по адресу."""
    for username, role_name in (
        (HOMEROOM_TEACHER, "классрук"),
        (SUBJECT_TEACHER, "предметник"),
    ):
        login(driver, username)
        for path in ("accounts/", "directories/"):
            open_path(driver, path)
            assert_forbidden(driver, f"{role_name}, {path}")
            assert_no_sensitive_data(driver, f"{role_name}, {path}")
            assert not driver.find_elements(By.ID, "accounts-view"), (
                f"{role_name}: на запрещённом маршруте показан список учётных записей"
            )


def test_rm_08_class_routes_direct_access(driver):
    """Родитель и ученик не открывают общеклассные разделы напрямую."""
    protected_paths = ("journal/", "students/", "parents/", "analytics/")
    for username, role_name in ((PARENT, "родитель"), (STUDENT, "ученик")):
        login(driver, username)
        for path in protected_paths:
            open_path(driver, path)
            assert_forbidden(driver, f"{role_name}, {path}")
            assert_no_sensitive_data(driver, f"{role_name}, {path}")


def test_rm_09_teacher_foreign_class(driver):
    """Классрук не подменяет класс в адресе учеников и аналитики."""
    login(driver, HOMEROOM_TEACHER)

    open_path(driver, "students/?classId=class-7b")
    assert driver.find_elements(By.ID, "students-table-wrapper"), (
        "Список учеников своего класса должен быть доступен"
    )
    own_rows = driver.find_elements(By.CSS_SELECTOR, "#students-table-wrapper tbody tr")
    assert own_rows, "В списке своего класса нет учеников"

    for class_id in ("class-8a", "class-9v"):
        for path in (
            f"students/?classId={class_id}",
            f"analytics/?classId={class_id}&periodId=q1_2024",
        ):
            open_path(driver, path)
            assert_forbidden(driver, path)
            assert_no_sensitive_data(driver, path)

    open_path(driver, "students/?classId=class-7b")
    assert driver.find_elements(By.ID, "students-table-wrapper"), (
        "После запроса чужого класса свой список должен оставаться доступен"
    )


def test_rm_10_admin_journal_meetings(driver):
    """Администратор не получает доступ к классным разделам."""
    login(driver, ADMIN)
    for path in ("journal/", "attendance/", "meetings/", "analytics/"):
        open_path(driver, path)
        assert_forbidden(driver, path)
        assert_no_sensitive_data(driver, path)

    open_path(driver, "teachers/")
    assert driver.find_elements(By.ID, "teachers-view"), (
        "Администратор должен открывать разрешённый раздел «Учителя»"
    )
    assert "Учителя" in page_text(driver), "В разделе учителей нет заголовка"


def test_rm_11_subject_teacher_workload(driver):
    """Предметник открывает журнал только по своей нагрузке."""
    login(driver, SUBJECT_TEACHER)

    open_path(driver, "journal/?classId=class-7b&subjectId=math")
    assert driver.find_elements(By.ID, "journal-table-container"), (
        "Предметник должен открыть журнал математики 7Б"
    )
    text = page_text(driver)
    assert "Математика" in text, "В разрешённом журнале нет предмета математики"

    for path in (
        "journal/?classId=class-7b&subjectId=phys",
        "journal/?classId=class-7v&subjectId=math",
    ):
        open_path(driver, path)
        assert_forbidden(driver, path)
        assert_no_sensitive_data(driver, path)


def test_rm_12_forbidden_no_disclosure(driver):
    """Отказ для чужого и несуществующего ученика не раскрывает сведения."""
    paths = (
        "student/?id=st-01",
        "student/?id=missing-student",
    )
    for username, role_name in ((PARENT, "родитель"), (STUDENT, "ученик")):
        login(driver, username)
        snapshots = [forbidden_snapshot(driver, path) for path in paths]
        assert snapshots[0] == snapshots[1], (
            f"{role_name}: ответы для чужого и несуществующего ученика различаются"
        )
        for text in snapshots:
            assert "Ученик не найден" not in text, (
                f"{role_name}: ответ позволяет отличить несуществующую запись"
            )


def test_rm_13_profile_read_only(driver):
    """Роль и привязка в профиле справочные и не меняются сменой языка."""
    login(driver, HOMEROOM_TEACHER)
    open_path(driver, "profile/")

    labels = driver.find_elements(By.CSS_SELECTOR, "#app-content label")
    fields = {}
    for label in labels:
        text = normalized(label.text)
        if text in ("Роль в системе", "Курируемый класс", "Привязка"):
            fields[text] = label.find_element(By.XPATH, "following-sibling::input[1]")

    assert "Роль в системе" in fields, "В профиле нет поля роли"
    assert "Курируемый класс" in fields or "Привязка" in fields, (
        "В профиле нет поля привязки"
    )
    role_field = fields["Роль в системе"]
    binding_field = fields.get("Курируемый класс") or fields.get("Привязка")
    assert binding_field is not None, "Не найдено поле привязки"
    assert role_field.get_attribute("readonly") is not None, "Поле роли доступно для правки"
    assert binding_field.get_attribute("readonly") is not None, (
        "Поле привязки доступно для правки"
    )
    assert role_field.get_attribute("value") == "Классный руководитель", (
        "В профиле указана неверная роль"
    )
    assert binding_field.get_attribute("value") == "7Б", (
        "В профиле указана неверная привязка"
    )

    lang = driver.find_element(By.ID, "profile-lang-select")
    driver.execute_script(
        "arguments[0].value = 'en';"
        "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
        lang,
    )
    assert role_field.get_attribute("value") == "Классный руководитель", (
        "Смена языка не должна менять роль"
    )
    assert binding_field.get_attribute("value") == "7Б", (
        "Смена языка не должна менять привязку"
    )
    assert not driver.find_elements(
        By.CSS_SELECTOR, "#app-content #select-edit-role, #app-content #select-edit-binding"
    ), "В профиле не должно быть полей администраторского редактирования"
