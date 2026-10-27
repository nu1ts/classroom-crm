import {
  getDB,
  getCurrentUser,
  confirmAbsenceRecord,
  batchConfirmAbsences,
} from "../../services/storage.js";
import { getUnconfirmedAbsences } from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";
import { navigate } from "../../services/navigation.js";

export function setupAttendanceListeners(onNavigate) {
  const db = getDB();
  const currentUser = getCurrentUser();
  const isSubjectTeacher = currentUser && currentUser.role === "subject_teacher";
  const periodId = "q1_2024";

  const modal = document.getElementById("modal-confirm-absence");
  const modalDialog = document.getElementById("modal-confirm-dialog");
  const closeX = document.getElementById("btn-close-confirm-x");
  const cancelBtn = document.getElementById("btn-cancel-confirm");
  const form = document.getElementById("form-confirm-absence");

  const inputAttId = document.getElementById("confirm-attendance-id");
  const inputStudentName = document.getElementById("confirm-student-name");
  const inputDate = document.getElementById("confirm-absence-date");
  const inputLesson = document.getElementById("confirm-absence-lesson");
  const selectReasonType = document.getElementById("confirm-reason-type");
  const checkHasDoc = document.getElementById("confirm-has-certificate");
  const inputDocText = document.getElementById("confirm-document-text");
  const inputNotes = document.getElementById("confirm-notes");
  const blockDocFields = document.getElementById("block-document-fields");

  function openConfirmModal(attId) {
    if (isSubjectTeacher) return;
    if (!modal) return;
    const currentDB = getDB();
    const attRecord = (currentDB.attendance || []).find((a) => a.id === attId);
    if (!attRecord) return;

    const student = (currentDB.students || []).find(
      (s) => s.id === attRecord.studentId,
    );
    const lesson = (currentDB.lessons || []).find(
      (l) => l.id === attRecord.lessonId,
    );

    if (inputAttId) inputAttId.value = attRecord.id;
    if (inputStudentName)
      inputStudentName.value = student ? student.fullName : "Ученик";
    if (inputDate) inputDate.value = attRecord.date;
    if (inputLesson)
      inputLesson.value = lesson
        ? `${lesson.subjectName || "Урок"} (${lesson.time || ""})`
        : "Урок";

    if (selectReasonType) selectReasonType.value = "excused";
    if (checkHasDoc) checkHasDoc.checked = true;
    if (blockDocFields) blockDocFields.style.display = "block";
    if (inputDocText) inputDocText.value = "";
    if (inputNotes) inputNotes.value = "";

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100", "pointer-events-auto");
    if (modalDialog) {
      modalDialog.classList.remove("scale-95");
      modalDialog.classList.add("scale-100");
    }
  }

  function closeConfirmModal() {
    if (!modal) return;
    modal.classList.remove("opacity-100", "pointer-events-auto");
    modal.classList.add("opacity-0", "pointer-events-none");
    if (modalDialog) {
      modalDialog.classList.remove("scale-100");
      modalDialog.classList.add("scale-95");
    }
    if (form) form.reset();
  }

  if (closeX) closeX.onclick = closeConfirmModal;
  if (cancelBtn) cancelBtn.onclick = closeConfirmModal;
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeConfirmModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modal &&
      !modal.classList.contains("pointer-events-none")
    ) {
      closeConfirmModal();
    }
  });

  if (selectReasonType && blockDocFields) {
    selectReasonType.addEventListener("change", () => {
      if (selectReasonType.value === "unexcused") {
        blockDocFields.style.display = "none";
      } else {
        blockDocFields.style.display = "block";
      }
    });
  }

  document.querySelectorAll(".btn-open-confirm-cell").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const attId = btn.getAttribute("data-att-id");
      if (attId) openConfirmModal(attId);
    });
  });

  const btnBanner = document.getElementById("btn-banner-confirm");
  if (btnBanner) {
    btnBanner.addEventListener("click", () => {
      const currentDB = getDB();
      const unconfirmedList = getUnconfirmedAbsences(
        currentDB.attendance,
        currentDB.lessons,
        currentDB.students,
        { periodId },
      );
      if (unconfirmedList.length > 0) {
        openConfirmModal(unconfirmedList[0].id);
      }
    });
  }

  const btnBatch = document.getElementById("btn-open-batch-confirm");
  if (btnBatch) {
    btnBatch.addEventListener("click", () => {
      const currentDB = getDB();
      const unconfirmedList = getUnconfirmedAbsences(
        currentDB.attendance,
        currentDB.lessons,
        currentDB.students,
        { periodId },
      );
      if (unconfirmedList.length > 0) {
        openConfirmModal(unconfirmedList[0].id);
      } else {
        alert("Все пропуски на выбранный период уже подтверждены!");
      }
    });
  }

  const checkFilterAbsences = document.getElementById("filter-only-absences");
  if (checkFilterAbsences) {
    checkFilterAbsences.addEventListener("change", () => {
      const showOnly = checkFilterAbsences.checked;
      document.querySelectorAll(".student-row").forEach((row) => {
        const hasAbsences = row.getAttribute("data-has-absences") === "true";
        if (showOnly && !hasAbsences) {
          row.style.display = "none";
        } else {
          row.style.display = "";
        }
      });
    });
  }

  const selectClass = document.getElementById("select-attendance-class");
  if (selectClass) {
    selectClass.addEventListener("change", () => {
      const currentUrl = new URL(window.location.href);
      const week = currentUrl.searchParams.get("week") || "w8";
      const targetHash = `/attendance?class=${selectClass.value}&week=${week}`;
      if (onNavigate) {
        onNavigate(targetHash);
      } else {
        navigate(targetHash);
      }
    });
  }

  const selectWeek = document.getElementById("select-attendance-week");
  if (selectWeek) {
    selectWeek.addEventListener("change", () => {
      const currentUrl = new URL(window.location.href);
      const classId = currentUrl.searchParams.get("class");
      const classQuery = classId ? `&class=${classId}` : "";
      const targetHash = `/attendance?week=${selectWeek.value}${classQuery}`;
      if (onNavigate) {
        onNavigate(targetHash);
      } else {
        navigate(targetHash);
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const attId = inputAttId ? inputAttId.value : null;
      if (!attId) return;

      const reasonType = selectReasonType ? selectReasonType.value : "excused";
      const hasDoc = checkHasDoc ? checkHasDoc.checked : false;
      const docText = inputDocText ? inputDocText.value.trim() : "";
      const notes = inputNotes ? inputNotes.value.trim() : "";

      const isExcused = reasonType === "excused";
      const documentValue = isExcused
        ? hasDoc
          ? docText || "Медицинская справка"
          : "Заявление родителей"
        : null;
      const reasonValue =
        notes || (isExcused ? "Болезнь / справка" : "Неуважительная причина");

      confirmAbsenceRecord(attId, {
        status: isExcused ? "excused" : "unexcused",
        reason: reasonValue,
        document: documentValue,
        confirmedBy: "Смирнова М. В.",
      });

      closeConfirmModal();

      const currentHash = "/attendance" + (window.location.search || "");
      if (onNavigate) {
        onNavigate(currentHash);
      } else {
        window.location.reload();
      }
    });
  }
}
