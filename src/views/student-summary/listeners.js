import {
  getDB,
  saveDB,
  confirmAbsenceRecord,
  addParentContact,
  addStudentNote,
} from "../../services/storage.js";
import {
  calculateStudentAverage,
  calculateStudentAttendance,
  getRiskZoneStudents,
} from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";

export function setupStudentSummaryListeners(onNavigate) {
  const queryString = window.location.search || "";
  const params = new URLSearchParams(queryString);
  const studentId = params.get("id") || params.get("student") || "st-23";

  function showToast(message, isSuccess = true) {
    const toast = document.getElementById("summary-toast");
    const msgEl = document.getElementById("summary-toast-message");
    const iconEl = document.getElementById("summary-toast-icon");
    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = message;
    iconEl.innerHTML = isSuccess
      ? renderIcon("check", "w-4 h-4 text-emerald-400")
      : renderIcon("alert", "w-4 h-4 text-rose-400");
    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");

    setTimeout(() => {
      toast.classList.remove(
        "opacity-100",
        "translate-y-0",
        "pointer-events-auto",
      );
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, 3200);
  }

  const toggleGradesBtn = document.getElementById("btn-toggle-grades-journal");
  const gradesJournalWrapper = document.getElementById(
    "grades-journal-wrapper",
  );
  if (toggleGradesBtn && gradesJournalWrapper) {
    toggleGradesBtn.addEventListener("click", () => {
      const isHidden = gradesJournalWrapper.classList.toggle("hidden");
      const icon = toggleGradesBtn.querySelector("svg");
      if (icon) {
        icon.classList.toggle("rotate-180", !isHidden);
      }
    });
  }

  const modalContact = document.getElementById("modal-contact-parent");
  const modalContactDialog = document.getElementById("modal-contact-dialog");
  const btnOpenContact = document.getElementById("btn-open-contact-modal");
  const btnCloseContactX = document.getElementById("btn-close-contact-modal-x");
  const btnCancelContact = document.getElementById("btn-cancel-contact-modal");
  const formContact = document.getElementById("form-contact-parent");
  const contactDateInput = document.getElementById("contact-date");
  const contactChannelSelect = document.getElementById(
    "contact-channel-select",
  );
  const contactSummaryInput = document.getElementById("contact-summary-input");
  const contactAgreementCheckbox = document.getElementById(
    "contact-agreement-checkbox",
  );
  const contactReminderWrapper = document.getElementById(
    "contact-reminder-date-wrapper",
  );
  const contactNextDateInput = document.getElementById(
    "contact-next-date-input",
  );
  const contactErrorBox = document.getElementById("contact-error-box");

  function openContactModal() {
    if (!modalContact) return;
    if (contactDateInput && !contactDateInput.value) {
      contactDateInput.value = "2024-10-28";
    }
    if (contactNextDateInput && !contactNextDateInput.value) {
      contactNextDateInput.value = "2024-11-05";
    }
    if (contactErrorBox) {
      contactErrorBox.classList.add("hidden");
      contactErrorBox.textContent = "";
    }
    modalContact.classList.remove("opacity-0", "pointer-events-none");
    modalContact.classList.add("opacity-100", "pointer-events-auto");
    if (modalContactDialog) {
      modalContactDialog.classList.remove("scale-95");
      modalContactDialog.classList.add("scale-100");
    }
  }

  function closeContactModal() {
    if (!modalContact) return;
    modalContact.classList.remove("opacity-100", "pointer-events-auto");
    modalContact.classList.add("opacity-0", "pointer-events-none");
    if (modalContactDialog) {
      modalContactDialog.classList.remove("scale-100");
      modalContactDialog.classList.add("scale-95");
    }
    if (formContact) formContact.reset();
    if (contactReminderWrapper) contactReminderWrapper.classList.add("hidden");
  }

  if (btnOpenContact) btnOpenContact.onclick = openContactModal;
  if (btnCloseContactX) btnCloseContactX.onclick = closeContactModal;
  if (btnCancelContact) btnCancelContact.onclick = closeContactModal;
  if (modalContact) {
    modalContact.addEventListener("click", (e) => {
      if (e.target === modalContact) closeContactModal();
    });
  }

  if (contactAgreementCheckbox && contactReminderWrapper) {
    contactAgreementCheckbox.addEventListener("change", () => {
      contactReminderWrapper.classList.toggle(
        "hidden",
        contactAgreementCheckbox.checked,
      );
    });
  }

  if (formContact) {
    formContact.addEventListener("submit", (e) => {
      e.preventDefault();

      const summary = (contactSummaryInput?.value || "").trim();
      const channel = contactChannelSelect?.value || "";
      const parentId =
        document.getElementById("contact-parent-select")?.value || "";
      const date = contactDateInput?.value || "2024-10-28";
      const agreementReached = contactAgreementCheckbox?.checked ?? true;
      const nextContactDate =
        !agreementReached && contactNextDateInput
          ? contactNextDateInput.value
          : null;

      if (!summary) {
        if (contactErrorBox) {
          contactErrorBox.textContent =
            "Поле «Итог» обязательно для заполнения";
          contactErrorBox.classList.remove("hidden");
        }
        if (contactSummaryInput) {
          contactSummaryInput.classList.add("border-rose-500");
          contactSummaryInput.focus();
        }
        return;
      }

      if (!channel) {
        if (contactErrorBox) {
          contactErrorBox.textContent = "Выберите канал связи";
          contactErrorBox.classList.remove("hidden");
        }
        if (contactChannelSelect) {
          contactChannelSelect.classList.add("border-rose-500");
          contactChannelSelect.focus();
        }
        return;
      }

      const res = addParentContact({
        studentId,
        parentId,
        date,
        channel,
        summary,
        agreementReached,
        nextContactDate,
      });

      if (!res.success) {
        if (contactErrorBox) {
          contactErrorBox.textContent = res.error;
          contactErrorBox.classList.remove("hidden");
        }
        return;
      }

      closeContactModal();
      showToast("Контакт с родителем успешно зафиксирован");

      if (onNavigate) {
        onNavigate(
          window.location.search
            ? "/student" + window.location.search
            : `/student?id=${studentId}`,
        );
      }
    });
  }

  const modalNote = document.getElementById("modal-add-note");
  const modalNoteDialog = document.getElementById("modal-note-dialog");
  const btnOpenNote = document.getElementById("btn-open-note-modal");
  const btnCloseNoteX = document.getElementById("btn-close-note-modal-x");
  const btnCancelNote = document.getElementById("btn-cancel-note-modal");
  const formNote = document.getElementById("form-add-note");
  const noteTextInput = document.getElementById("note-text-input");
  const notePrivateCheckbox = document.getElementById("note-private-checkbox");
  const noteErrorBox = document.getElementById("note-error-box");

  function openNoteModal() {
    if (!modalNote) return;
    if (noteErrorBox) {
      noteErrorBox.classList.add("hidden");
      noteErrorBox.textContent = "";
    }
    modalNote.classList.remove("opacity-0", "pointer-events-none");
    modalNote.classList.add("opacity-100", "pointer-events-auto");
    if (modalNoteDialog) {
      modalNoteDialog.classList.remove("scale-95");
      modalNoteDialog.classList.add("scale-100");
    }
  }

  function closeNoteModal() {
    if (!modalNote) return;
    modalNote.classList.remove("opacity-100", "pointer-events-auto");
    modalNote.classList.add("opacity-0", "pointer-events-none");
    if (modalNoteDialog) {
      modalNoteDialog.classList.remove("scale-100");
      modalNoteDialog.classList.add("scale-95");
    }
    if (formNote) formNote.reset();
  }

  if (btnOpenNote) btnOpenNote.onclick = openNoteModal;
  if (btnCloseNoteX) btnCloseNoteX.onclick = closeNoteModal;
  if (btnCancelNote) btnCancelNote.onclick = closeNoteModal;
  if (modalNote) {
    modalNote.addEventListener("click", (e) => {
      if (e.target === modalNote) closeNoteModal();
    });
  }

  if (formNote) {
    formNote.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = (noteTextInput?.value || "").trim();
      const isPrivate = notePrivateCheckbox?.checked ?? true;

      if (!text) {
        if (noteErrorBox) {
          noteErrorBox.textContent = "Введите текст педагогической заметки";
          noteErrorBox.classList.remove("hidden");
        }
        if (noteTextInput) {
          noteTextInput.classList.add("border-rose-500");
          noteTextInput.focus();
        }
        return;
      }

      const res = addStudentNote({
        studentId,
        text,
        isPrivate,
      });

      if (!res.success) {
        if (noteErrorBox) {
          noteErrorBox.textContent = res.error;
          noteErrorBox.classList.remove("hidden");
        }
        return;
      }

      closeNoteModal();
      showToast("Педагогическая заметка сохранена");

      if (onNavigate) {
        onNavigate(
          window.location.search
            ? "/student" + window.location.search
            : `/student?id=${studentId}`,
        );
      }
    });
  }

  const modalAbsence = document.getElementById("modal-confirm-student-absence");
  const modalAbsenceDialog = document.getElementById("modal-confirm-dialog");
  const btnCloseAbsenceX = document.getElementById("btn-close-absence-modal-x");
  const btnCancelAbsence = document.getElementById("btn-cancel-absence-modal");
  const formAbsence = document.getElementById("form-confirm-student-absence");
  const absenceRecordIdsInput = document.getElementById("absence-record-ids");
  const selectReasonType = document.getElementById("confirm-reason-type");
  const checkHasDoc = document.getElementById("confirm-has-doc-check");
  const blockDocFields = document.getElementById("block-absence-doc-fields");
  const inputDocText = document.getElementById("confirm-doc-text-input");
  const inputAbsenceNotes = document.getElementById(
    "confirm-absence-notes-input",
  );

  if (selectReasonType && blockDocFields) {
    selectReasonType.addEventListener("change", () => {
      blockDocFields.classList.toggle(
        "hidden",
        selectReasonType.value !== "excused",
      );
    });
  }

  function openAbsenceModal(recordIds) {
    if (!modalAbsence) return;
    if (absenceRecordIdsInput) absenceRecordIdsInput.value = recordIds;
    if (formAbsence) formAbsence.reset();
    if (selectReasonType) selectReasonType.value = "excused";
    if (checkHasDoc) checkHasDoc.checked = true;
    if (blockDocFields) blockDocFields.classList.remove("hidden");
    if (inputDocText) inputDocText.value = "";
    if (inputAbsenceNotes) inputAbsenceNotes.value = "";

    modalAbsence.classList.remove("opacity-0", "pointer-events-none");
    modalAbsence.classList.add("opacity-100", "pointer-events-auto");
    if (modalAbsenceDialog) {
      modalAbsenceDialog.classList.remove("scale-95");
      modalAbsenceDialog.classList.add("scale-100");
    }
  }

  function closeAbsenceModal() {
    if (!modalAbsence) return;
    modalAbsence.classList.remove("opacity-100", "pointer-events-auto");
    modalAbsence.classList.add("opacity-0", "pointer-events-none");
    if (modalAbsenceDialog) {
      modalAbsenceDialog.classList.remove("scale-100");
      modalAbsenceDialog.classList.add("scale-95");
    }
  }

  if (btnCloseAbsenceX) btnCloseAbsenceX.onclick = closeAbsenceModal;
  if (btnCancelAbsence) btnCancelAbsence.onclick = closeAbsenceModal;
  if (modalAbsence) {
    modalAbsence.addEventListener("click", (e) => {
      if (e.target === modalAbsence) closeAbsenceModal();
    });
  }

  document.querySelectorAll(".btn-confirm-absence-action").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const ids = btn.getAttribute("data-absence-ids");
      openAbsenceModal(ids);
    });
  });

  if (formAbsence) {
    formAbsence.addEventListener("submit", (e) => {
      e.preventDefault();
      const ids = (absenceRecordIdsInput?.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const isExcused = selectReasonType
        ? selectReasonType.value === "excused"
        : true;
      const hasDoc = checkHasDoc ? checkHasDoc.checked : true;
      const docText = inputDocText ? inputDocText.value.trim() : "";
      const notes = inputAbsenceNotes ? inputAbsenceNotes.value.trim() : "";

      const documentValue = isExcused
        ? hasDoc
          ? docText || "Медицинская справка"
          : "Заявление родителей"
        : null;
      const reasonValue =
        notes || (isExcused ? "По болезни" : "Неуважительная причина");

      ids.forEach((id) => {
        confirmAbsenceRecord(id, {
          status: isExcused ? "excused" : "unexcused",
          reason: reasonValue,
          document: documentValue,
          confirmedBy: "Смирнова М. В.",
        });
      });

      closeAbsenceModal();
      showToast("Уважительная причина пропуска успешно подтверждена");

      if (onNavigate) {
        onNavigate(
          window.location.search
            ? "/student" + window.location.search
            : `/student?id=${studentId}`,
        );
      }
    });
  }
}
