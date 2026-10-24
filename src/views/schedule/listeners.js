import { getDB } from "../../services/storage.js";
import {
  addLesson,
  updateLesson,
  cancelLesson,
  normalizeLessonTime,
} from "../../services/schedule-ops.js";

export function setupScheduleListeners(navigate) {
  function refreshView() {
    if (navigate) {
      const url = new URL(window.location.href);
      const search = url.search.replace(/^\?/, "");
      navigate(`schedule${search ? `?${search}` : ""}`);
    } else {
      window.dispatchEvent(new Event("popstate"));
    }
  }

  const selectWeek = document.getElementById("select-schedule-week");
  if (selectWeek) {
    selectWeek.addEventListener("change", (e) => {
      const weekId = e.target.value;
      if (navigate) {
        navigate(`schedule?week=${weekId}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", weekId);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  const btnPrev = document.getElementById("btn-prev-week");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      const targetWeek = btnPrev.getAttribute("data-week-id");
      if (targetWeek) {
        if (navigate) {
          navigate(`schedule?week=${targetWeek}`);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.set("week", targetWeek);
          window.history.pushState({}, "", url.toString());
          window.dispatchEvent(new Event("popstate"));
        }
      }
    });
  }

  const btnNext = document.getElementById("btn-next-week");
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      const targetWeek = btnNext.getAttribute("data-week-id");
      if (targetWeek) {
        if (navigate) {
          navigate(`schedule?week=${targetWeek}`);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.set("week", targetWeek);
          window.history.pushState({}, "", url.toString());
          window.dispatchEvent(new Event("popstate"));
        }
      }
    });
  }

  const btnCurrent = document.getElementById("btn-current-week");
  if (btnCurrent) {
    btnCurrent.addEventListener("click", () => {
      const targetWeek = btnCurrent.getAttribute("data-week-id") || "w8";
      if (navigate) {
        navigate(`schedule?week=${targetWeek}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", targetWeek);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  const btnEmptyReturn = document.getElementById("btn-empty-return-current");
  if (btnEmptyReturn) {
    btnEmptyReturn.addEventListener("click", () => {
      const targetWeek = btnEmptyReturn.getAttribute("data-week-id") || "w8";
      if (navigate) {
        navigate(`schedule?week=${targetWeek}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", targetWeek);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  function showModal(modalEl, dialogEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
    requestAnimationFrame(() => {
      modalEl.classList.remove("opacity-0", "pointer-events-none");
      modalEl.classList.add("opacity-100", "pointer-events-auto");
      if (dialogEl) {
        dialogEl.classList.remove("scale-95");
        dialogEl.classList.add("scale-100");
      }
    });
  }

  function hideModal(modalEl, dialogEl) {
    if (!modalEl) return;
    modalEl.classList.remove("opacity-100", "pointer-events-auto");
    modalEl.classList.add("opacity-0", "pointer-events-none");
    if (dialogEl) {
      dialogEl.classList.remove("scale-100");
      dialogEl.classList.add("scale-95");
    }
    modalEl.classList.add("hidden");
  }

  const modalLesson = document.getElementById("modal-lesson-form");
  const modalLessonDialog = document.getElementById("modal-lesson-dialog");
  const modalTitle = document.getElementById("modal-lesson-title");
  const formLesson = document.getElementById("form-lesson");
  const lessonIdInput = document.getElementById("lesson-id-input");
  const conflictErrorBox = document.getElementById("lesson-room-conflict-error");
  const conflictErrorText = document.getElementById("lesson-conflict-error-text");

  const selectSubject = document.getElementById("lesson-subject-select");
  const selectClass = document.getElementById("lesson-class-select");
  const selectDate = document.getElementById("lesson-date-select");
  const selectTime = document.getElementById("lesson-time-select");
  const selectRoom = document.getElementById("lesson-room-select");
  const selectTeacher = document.getElementById("lesson-teacher-select");

  function openLessonModal(lessonData = null) {
    if (!modalLesson) return;

    if (conflictErrorBox) {
      conflictErrorBox.classList.add("hidden");
    }

    if (lessonData) {
      if (modalTitle) modalTitle.textContent = "Редактировать занятие";
      if (lessonIdInput) lessonIdInput.value = lessonData.id || "";

      setSelectValueOrAdd(selectSubject, lessonData.subjectName);
      setSelectValueOrAdd(selectClass, lessonData.classId || "class-7b");
      setSelectValueOrAdd(selectDate, lessonData.date);

      if (selectTime && lessonData.time) {
        const norm = normalizeLessonTime(lessonData.time);
        const match = Array.from(selectTime.options).find(
          (o) => normalizeLessonTime(o.value) === norm
        );
        if (match) {
          selectTime.value = match.value;
        } else {
          setSelectValueOrAdd(selectTime, lessonData.time);
        }
      }

      setSelectValueOrAdd(selectRoom, lessonData.room);
      setSelectValueOrAdd(selectTeacher, lessonData.teacher);
    } else {
      if (modalTitle) modalTitle.textContent = "Добавить занятие";
      if (lessonIdInput) lessonIdInput.value = "";
      if (selectSubject) selectSubject.selectedIndex = 0;
      if (selectClass) selectClass.value = "class-7b";
      if (selectTime) selectTime.value = "11:30 - 12:15";
      if (selectRoom) selectRoom.value = "Каб. 401";
      if (selectTeacher) selectTeacher.selectedIndex = 0;
    }

    showModal(modalLesson, modalLessonDialog);
  }

  function closeLessonModal() {
    hideModal(modalLesson, modalLessonDialog);
    if (conflictErrorBox) conflictErrorBox.classList.add("hidden");
  }

  function setSelectValueOrAdd(selectElem, val) {
    if (!selectElem || !val) return;
    const exists = Array.from(selectElem.options).some((o) => o.value === val);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      selectElem.appendChild(opt);
    }
    selectElem.value = val;
  }

  const btnAddLesson = document.getElementById("btn-add-lesson");
  if (btnAddLesson) {
    btnAddLesson.addEventListener("click", () => {
      openLessonModal();
    });
  }

  const btnEmptyAddLesson = document.getElementById("btn-empty-add-lesson");
  if (btnEmptyAddLesson) {
    btnEmptyAddLesson.addEventListener("click", () => {
      openLessonModal();
    });
  }

  const btnCloseModal = document.getElementById("btn-close-lesson-modal");
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeLessonModal);
  }

  const btnCancelForm = document.getElementById("btn-cancel-lesson-form");
  if (btnCancelForm) {
    btnCancelForm.addEventListener("click", closeLessonModal);
  }

  if (modalLesson) {
    modalLesson.addEventListener("click", (e) => {
      if (e.target === modalLesson) closeLessonModal();
    });
  }

  document.querySelectorAll('button[data-action="slot-add-lesson"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const date = btn.getAttribute("data-date");
      const time = btn.getAttribute("data-time");
      openLessonModal();
      if (date && selectDate) setSelectValueOrAdd(selectDate, date);
      if (time && selectTime) {
        const norm = normalizeLessonTime(time);
        const match = Array.from(selectTime.options).find(
          (o) => normalizeLessonTime(o.value) === norm
        );
        if (match) selectTime.value = match.value;
      }
    });
  });

  document.querySelectorAll('button[data-action="edit-lesson"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lessonId = btn.getAttribute("data-lesson-id");
      const db = getDB();
      const lesson = (db.lessons || []).find((l) => l.id === lessonId);
      if (lesson) {
        openLessonModal(lesson);
      }
    });
  });

  if (formLesson) {
    formLesson.addEventListener("submit", (e) => {
      e.preventDefault();

      const lessonId = lessonIdInput ? lessonIdInput.value.trim() : "";
      const subjectName = selectSubject ? selectSubject.value : "";
      const classId = selectClass ? selectClass.value : "class-7b";
      const date = selectDate ? selectDate.value : "";
      const time = selectTime ? selectTime.value : "";
      const room = selectRoom ? selectRoom.value : "";
      const teacher = selectTeacher ? selectTeacher.value : "";

      let res;
      if (lessonId) {
        res = updateLesson(lessonId, {
          subjectName,
          classId,
          date,
          time,
          room,
          teacher,
        });
      } else {
        res = addLesson({
          subjectName,
          classId,
          date,
          time,
          room,
          teacher,
        });
      }

      if (!res.success) {
        if (conflictErrorBox && conflictErrorText) {
          conflictErrorText.textContent = res.error || "Аудитория уже занята в это время";
          conflictErrorBox.classList.remove("hidden");
        }
        return;
      }

      closeLessonModal();
      refreshView();
    });
  }

  const modalCancel = document.getElementById("modal-confirm-delete-lesson");
  const modalCancelDialog = document.getElementById("modal-confirm-delete-lesson-dialog");
  const deleteIdInput = document.getElementById("delete-lesson-id-input");
  const btnCloseDeleteX = document.getElementById("btn-close-delete-x");
  const btnCloseCancelModal = document.getElementById("btn-cancel-delete-lesson");
  const btnConfirmDelete = document.getElementById("btn-confirm-delete-lesson");

  function openCancelModal(lessonId) {
    if (modalCancel && deleteIdInput) {
      deleteIdInput.value = lessonId || "";
      showModal(modalCancel, modalCancelDialog);
    }
  }

  function closeCancelModal() {
    hideModal(modalCancel, modalCancelDialog);
  }

  document.querySelectorAll('button[data-action="delete-lesson"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lessonId = btn.getAttribute("data-lesson-id");
      openCancelModal(lessonId);
    });
  });

  if (btnCloseDeleteX) btnCloseDeleteX.addEventListener("click", closeCancelModal);
  if (btnCloseCancelModal) btnCloseCancelModal.addEventListener("click", closeCancelModal);
  if (modalCancel) {
    modalCancel.addEventListener("click", (e) => {
      if (e.target === modalCancel) closeCancelModal();
    });
  }

  if (btnConfirmDelete && modalCancel) {
    btnConfirmDelete.addEventListener("click", () => {
      const lessonId = deleteIdInput ? deleteIdInput.value : "";
      if (lessonId) {
        cancelLesson(lessonId);
      }
      closeCancelModal();
      refreshView();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalLesson && !modalLesson.classList.contains("hidden")) {
        closeLessonModal();
      }
      if (modalCancel && !modalCancel.classList.contains("hidden")) {
        closeCancelModal();
      }
    }
  });
}
