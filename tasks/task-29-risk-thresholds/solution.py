import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TEST_URL = os.getenv("TEST_URL")
SELENIUM = os.getenv("SELENIUM_HUB")

TEACHER = "smirnova@school.ru"
PASSWORD = "Test#2024"
BASE_URL = (TEST_URL or "").rstrip("/")


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
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-form"))
    )


def login_as_teacher(driver):
    email = driver.find_element(By.ID, "login-email")
    email.clear()
    email.send_keys(TEACHER)
    password = driver.find_element(By.ID, "login-password")
    password.clear()
    password.send_keys(PASSWORD)
    driver.find_element(By.ID, "btn-login-submit").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "app-sidebar"))
    )


def open_overview(driver):
    driver.get(app_url("overview/"))
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".risk-card, #empty-risk-zone"))
    )


def risk_cards(driver):
    return driver.find_elements(By.CSS_SELECTOR, ".risk-card")


def risk_card_names(driver):
    return [
        card.get_attribute("data-student-name").strip()
        for card in risk_cards(driver)
    ]


def set_risk_fixture(driver, student_id, absence_count, overall_grades, fixture_all_students=False):
    script = """
const [studentId, absenceCount, overallGrades, resetAllStudents] = arguments;
const db = window.crmApi.getDB();
const student = db.students.find((item) => item.id === studentId);
if (!student) throw new Error(`Ученик ${studentId} не найден`);
const lessons = db.lessons.filter(
  (lesson) => (lesson.classId || "class-7b") === "class-7b" && lesson.periodId === "q1_2024",
).filter((lesson) => lesson.isMarked || lesson.status === "closed")
  .sort((a, b) => a.date.localeCompare(b.date) || (a.lessonNumber || 0) - (b.lessonNumber || 0)).slice(0, 40);
if (lessons.length !== 40) throw new Error(`Ожидалось 40 уроков, получено ${lessons.length}`);
const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const targetStudentIds = resetAllStudents
  ? new Set(db.students.filter((item) => item.classId === "class-7b").map((item) => item.id))
  : new Set([studentId]);
const scenarioStudentIds = new Set(
  db.students.filter((item) => item.classId === "class-7b").map((item) => item.id),
);
db.attendance = db.attendance.filter(
  (item) => !(targetStudentIds.has(item.studentId) && lessonIds.has(item.lessonId)));
lessons.forEach((lesson, index) => {
  const isAbsent = index < absenceCount;
  db.attendance.push({
    id: `threshold-att-${studentId}-${index}`,
    lessonId: lesson.id,
    studentId,
    date: lesson.date,
    value: isAbsent ? "absent" : "present",
    status: isAbsent ? "unconfirmed" : "present",
    code: isAbsent ? "Н (без)" : "",
    reason: isAbsent ? "Причина не указана" : "",
  });
});
db.grades = db.grades.filter(
  (item) => !(targetStudentIds.has(item.studentId) && item.periodId === "q1_2024"),
);
db.parentContacts = (db.parentContacts || []).filter(
  (item) => !scenarioStudentIds.has(item.studentId),
);
db.notes = (db.notes || []).filter(
  (item) => !scenarioStudentIds.has(item.studentId),
);
if (resetAllStudents) {
  db.students.filter((item) => item.classId === "class-7b" && item.id !== studentId).forEach((item, studentIndex) => {
    lessons.forEach((lesson, lessonIndex) => {
      db.attendance.push({
        id: `threshold-present-${item.id}-${lessonIndex}`,
        lessonId: lesson.id,
        studentId: item.id,
        date: lesson.date,
        value: "present",
        status: "present",
        code: "",
        reason: "",
      });
    });
    db.grades.push({
      id: `threshold-grade-${item.id}`,
      lessonId: lessons[studentIndex % lessons.length].id,
      studentId: item.id,
      subjectId: "math",
      date: lessons[studentIndex % lessons.length].date,
      teacher: "Козлов А. П.",
      value: 4,
      periodId: "q1_2024",
    });
  });
}
overallGrades.forEach((value, index) => {
  db.grades.push({
    id: `threshold-grade-${studentId}-${index}`,
    lessonId: lessons[index].id,
    studentId,
    subjectId: "math",
    date: lessons[index].date,
    teacher: "Козлов А. П.",
    value,
    periodId: "q1_2024",
  });
});
window.crmApi.saveDB(db);
return { name: student.fullName, absenceCount, gradeCount: overallGrades.length };
"""
    return driver.execute_script(
        script, student_id, absence_count, overall_grades, fixture_all_students
    )


def configure_single_risk_student(driver):
    script = """
const db = window.crmApi.getDB();
const students = db.students.filter((item) => item.classId === "class-7b");
const lessons = db.lessons.filter(
  (lesson) => (lesson.classId || "class-7b") === "class-7b" && lesson.periodId === "q1_2024",
).filter((lesson) => lesson.isMarked || lesson.status === "closed")
  .sort((a, b) => a.date.localeCompare(b.date) || (a.lessonNumber || 0) - (b.lessonNumber || 0)).slice(0, 40);
if (lessons.length !== 40) throw new Error(`Ожидалось 40 уроков, получено ${lessons.length}`);
const lessonIds = new Set(lessons.map((lesson) => lesson.id));
db.attendance = db.attendance.filter(
  (item) => !lessonIds.has(item.lessonId) || !students.some((student) => student.id === item.studentId),
);
db.grades = db.grades.filter(
  (item) => !(item.periodId === "q1_2024" && students.some((student) => student.id === item.studentId)),
);
students.forEach((student, studentIndex) => {
  lessons.forEach((lesson, lessonIndex) => {
    const isRiskStudent = student.id === "st-17";
    const isAbsent = isRiskStudent && lessonIndex < 12;
    db.attendance.push({
      id: `single-risk-att-${student.id}-${lessonIndex}`,
      lessonId: lesson.id,
      studentId: student.id,
      date: lesson.date,
      value: isAbsent ? "absent" : "present",
      status: isAbsent ? "unconfirmed" : "present",
      code: isAbsent ? "Н (без)" : "",
      reason: isAbsent ? "Причина не указана" : "",
    });
  });
  db.grades.push({
    id: `single-risk-grade-${student.id}`,
    lessonId: lessons[studentIndex % lessons.length].id,
    studentId: student.id,
    subjectId: "math",
    date: lessons[studentIndex % lessons.length].date,
    teacher: "Козлов А. П.",
    value: 4,
    periodId: "q1_2024",
  });
});
db.parentContacts = (db.parentContacts || []).filter(
  (item) => !(item.reminderDate && item.reminderDate <= "2024-10-28"),
);
db.notes = (db.notes || []).filter(
  (item) => !(item.isReminder && item.reminderDate && item.reminderDate <= "2024-10-28"),
);
window.crmApi.saveDB(db);
return students.length;
"""
    return driver.execute_script(script)


def test_bp_16_absence_threshold_20(driver):
    """Проверяет, что ровно 20 % пропусков не включают ученика в список внимания."""
    reset_all(driver)
    login_as_teacher(driver)
    fixture = set_risk_fixture(driver, "st-06", 8, [4, 4, 4, 4], fixture_all_students=True)
    assert fixture["absenceCount"] == 8

    open_overview(driver)
    names = risk_card_names(driver)
    assert fixture["name"] not in names, (
        f"{fixture['name']} с ровно 20 % пропусков ошибочно попал в список: {names}"
    )


def test_bp_17_grade_threshold_3_5(driver):
    """Проверяет, что средний балл ровно 3,5 не включает ученика в список внимания."""
    reset_all(driver)
    login_as_teacher(driver)
    fixture = set_risk_fixture(driver, "st-09", 0, [3, 4], fixture_all_students=True)
    assert fixture["gradeCount"] == 2

    open_overview(driver)
    names = risk_card_names(driver)
    assert fixture["name"] not in names, (
        f"{fixture['name']} со средним баллом ровно 3,5 ошибочно попал в список: {names}"
    )


def test_bp_18_risk_not_cached(driver):
    """Проверяет пересчёт списка внимания после исправления пропусков ученика."""
    reset_all(driver)
    login_as_teacher(driver)
    fixture = set_risk_fixture(driver, "st-17", 12, [4, 4, 4, 4], fixture_all_students=True)

    open_overview(driver)
    assert fixture["name"] in risk_card_names(driver), (
        f"{fixture['name']} с 12 пропусками из 40 не попал в список внимания"
    )

    set_risk_fixture(driver, "st-17", 7, [4, 4, 4, 4], fixture_all_students=True)
    open_overview(driver)
    names = risk_card_names(driver)
    assert fixture["name"] not in names, (
        f"После снижения пропусков до 17,5 % {fixture['name']} остался в списке: {names}"
    )


def test_bp_19_risk_order(driver):
    """Проверяет сортировку списка внимания по убыванию доли пропусков."""
    reset_all(driver)
    login_as_teacher(driver)
    configure_single_risk_student(driver)
    set_risk_fixture(driver, "st-17", 0, [4, 4, 4, 4])
    first = set_risk_fixture(driver, "st-01", 12, [4, 4, 4, 4])
    second = set_risk_fixture(driver, "st-02", 9, [4, 4, 4, 4])
    third = set_risk_fixture(driver, "st-03", 9, [4, 4, 4, 4])

    open_overview(driver)
    names = risk_card_names(driver)
    expected = [first["name"], second["name"], third["name"]]
    assert all(name in names for name in expected), (
        f"Сценарные ученики должны быть в списке: ожидались {expected}, получено {names}"
    )
    positions = [names.index(name) for name in expected]
    assert positions == sorted(positions), (
        f"Ожидался порядок по убыванию пропусков {expected}, получено {names}"
    )


def test_bp_37_single_student_report(driver):
    """Проверяет переход к отчёту после обработки единственного ученика."""
    reset_all(driver)
    login_as_teacher(driver)
    students_count = configure_single_risk_student(driver)
    assert students_count == 28

    open_overview(driver)
    cards = risk_cards(driver)
    assert len(cards) == 1, f"Ожидался один ученик в списке внимания, получено {len(cards)}"

    cards[0].find_element(By.CSS_SELECTOR, '[data-action="add-note"]').click()
    note = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "note-text"))
    )
    note.send_keys("Обработан единственный ученик списка внимания")
    driver.find_element(By.ID, "form-add-note").submit()

    report_link = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//div[contains(@class, 'bg-emerald-50')][.//div[contains(normalize-space(), 'Все 1 учеников списка внимания обработаны')]]//a[@href='/analytics' and contains(normalize-space(), 'К отчёту')]",
        ))
    )
    assert report_link.is_displayed(), "После обработки единственного ученика нет целевого перехода к отчёту"
