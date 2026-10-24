import {
  getDB,
  getCurrentUser,
  confirmAbsenceRecord,
  addJournalComment,
  getJournalComments,
  validateGradeValue,
  saveGradeRecord,
  deleteGradeRecord,
  setLessonAttendance,
  batchSaveLessonJournal,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { getUnconfirmedAbsences } from "../../mock/calculations.js";
import { hrefFor, navigate } from "../../services/navigation.js";

export function setupJournalListeners(onNavigate) {
  const currentUser = getCurrentUser();
  const selectSubject = document.getElementById("select-journal-subject");
  const selectWeek = document.getElementById("select-journal-week");
  const selectStatus = document.getElementById("select-journal-status");
  const checkOnlyEntries = document.getElementById("check-only-entries");
  const inputSearch = document.getElementById("input-search-student");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const iconSearch = document.getElementById("icon-search-glass");
  const btnToggleHighlight = document.getElementById(
    "btn-toggle-highlight-unconfirmed",
  );
  const tableContainer = document.getElementById("journal-table-container");

  function getUrlParams() {
    const rawHash = "/journal" + (window.location.search || "");
    const queryString = rawHash.includes("?") ? rawHash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    const unconfirmed = params.get("unconfirmed") === "true";
    const absences = params.get("absences") === "true";
    const statusParam =
      params.get("status") ||
      (unconfirmed ? "unconfirmed" : absences ? "absences" : "all");
    return {
      subjectId: params.get("subject") || "all",
      weekId: params.get("week") || "all",
      filterStatus: statusParam,
      filterOnlyAbsences:
        statusParam === "absences" || statusParam === "unconfirmed",
      filterUnconfirmedOnly: statusParam === "unconfirmed",
      filterOnlyEntries: params.get("onlyEntries") === "true",
      searchQuery: params.get("search") || "",
    };
  }

  function updateRoute(newParams) {
    const current = getUrlParams();
    const merged = { ...current, ...newParams };
    const params = new URLSearchParams();

    if (merged.subjectId && merged.subjectId !== "all")
      params.set("subject", merged.subjectId);
    if (merged.weekId && merged.weekId !== "all")
      params.set("week", merged.weekId);
    if (merged.filterStatus && merged.filterStatus !== "all") {
      params.set("status", merged.filterStatus);
      if (merged.filterStatus === "unconfirmed")
        params.set("unconfirmed", "true");
      if (
        merged.filterStatus === "absences" ||
        merged.filterStatus === "unconfirmed"
      )
        params.set("absences", "true");
    }
    if (merged.filterOnlyEntries) params.set("onlyEntries", "true");
    if (merged.searchQuery) params.set("search", merged.searchQuery);

    const queryStr = params.toString();
    const newHash = queryStr ? `/journal?${queryStr}` : "/journal";

    if (onNavigate) {
      onNavigate(newHash);
    } else {
      navigate(newHash);
    }
  }

  if (selectSubject) {
    selectSubject.addEventListener("change", () => {
      updateRoute({ subjectId: selectSubject.value });
    });
  }

  if (selectWeek) {
    selectWeek.addEventListener("change", () => {
      updateRoute({ weekId: selectWeek.value });
    });
  }

  if (selectStatus) {
    selectStatus.addEventListener("change", () => {
      const val = selectStatus.value;
      updateRoute({
        filterStatus: val,
        filterOnlyAbsences: val === "absences" || val === "unconfirmed",
        filterUnconfirmedOnly: val === "unconfirmed",
      });
    });
  }

  if (checkOnlyEntries) {
    checkOnlyEntries.addEventListener("change", () => {
      updateRoute({ filterOnlyEntries: checkOnlyEntries.checked });
    });
  }

  const tableScroll = document.getElementById("journal-table-scroll");

  function updateStickyBoxesWidth() {
    if (!tableScroll) return;
    const visibleWidth = tableScroll.clientWidth;
    if (visibleWidth > 0) {
      document.querySelectorAll(".journal-empty-sticky-box").forEach((box) => {
        box.style.width = `${visibleWidth}px`;
      });
    }
  }

  updateStickyBoxesWidth();
  window.addEventListener("resize", updateStickyBoxesWidth);

  function filterTableRowsLocally(query) {
    const q = (query || "").trim().toLowerCase();
    const rows = document.querySelectorAll("tr.student-row");
    let visibleCount = 0;
    rows.forEach((r) => {
      const name = (r.getAttribute("data-student-name") || "").toLowerCase();
      const match = !q || name.includes(q);
      r.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });

    const noMatchRow = document.getElementById("journal-search-no-results");
    if (noMatchRow) {
      const showEmpty = visibleCount === 0 && rows.length > 0;
      noMatchRow.style.display = showEmpty ? "" : "none";
      if (showEmpty) {
        updateStickyBoxesWidth();
      }
    }

    if (btnClearSearch && iconSearch) {
      if (q) {
        btnClearSearch.classList.remove("hidden");
        iconSearch.classList.add("hidden");
      } else {
        btnClearSearch.classList.add("hidden");
        iconSearch.classList.remove("hidden");
      }
    }
  }

  if (inputSearch) {
    inputSearch.addEventListener("input", () => {
      filterTableRowsLocally(inputSearch.value);
    });
  }

  if (btnClearSearch && inputSearch) {
    btnClearSearch.addEventListener("click", () => {
      inputSearch.value = "";
      filterTableRowsLocally("");
      inputSearch.focus();
    });
  }

  const btnResetEmptySearch = document.getElementById("btn-reset-empty-search");
  if (btnResetEmptySearch && inputSearch) {
    btnResetEmptySearch.addEventListener("click", () => {
      inputSearch.value = "";
      filterTableRowsLocally("");
      inputSearch.focus();
    });
  }

  if (btnToggleHighlight && tableContainer) {
    btnToggleHighlight.addEventListener("click", () => {
      const isNowActive = !tableContainer.classList.contains(
        "journal-highlight-mode",
      );
      tableContainer.classList.toggle("journal-highlight-mode", isNowActive);

      if (isNowActive) {
        btnToggleHighlight.classList.remove(
          "bg-white",
          "text-slate-700",
          "border-slate-200",
        );
        btnToggleHighlight.classList.add(
          "bg-rose-50",
          "text-rose-700",
          "border-rose-300",
          "ring-2",
          "ring-rose-500/20",
        );
      } else {
        btnToggleHighlight.classList.remove(
          "bg-rose-50",
          "text-rose-700",
          "border-rose-300",
          "ring-2",
          "ring-rose-500/20",
        );
        btnToggleHighlight.classList.add(
          "bg-white",
          "text-slate-700",
          "border-slate-200",
        );
      }
    });
  }

  const modal = document.getElementById("modal-journal-entry");
  const modalDialog = document.getElementById("modal-journal-dialog");
  const btnCloseX = document.getElementById("btn-close-journal-modal");
  const btnCloseFooter = document.getElementById(
    "btn-close-journal-modal-footer",
  );
  const formComment = document.getElementById("form-add-journal-comment");
  const inputCommentText = document.getElementById(
    "input-journal-comment-text",
  );

  const modalConfirm = document.getElementById("modal-journal-confirm-absence");
  const modalConfirmDialog = document.getElementById(
    "modal-journal-confirm-dialog",
  );
  const btnCloseConfirmX = document.getElementById(
    "btn-close-journal-confirm-x",
  );
  const btnCancelConfirm = document.getElementById(
    "btn-cancel-journal-confirm",
  );
  const formConfirmAbsence = document.getElementById(
    "form-journal-confirm-absence",
  );
  const inputConfirmAttId = document.getElementById(
    "journal-confirm-attendance-id",
  );
  const inputConfirmStudentName = document.getElementById(
    "journal-confirm-student-name",
  );
  const inputConfirmDate = document.getElementById(
    "journal-confirm-absence-date",
  );
  const inputConfirmLesson = document.getElementById(
    "journal-confirm-absence-lesson",
  );
  const selectConfirmReasonType = document.getElementById(
    "journal-confirm-reason-type",
  );
  const checkConfirmHasDoc = document.getElementById(
    "journal-confirm-has-certificate",
  );
  const inputConfirmDocText = document.getElementById(
    "journal-confirm-document-text",
  );
  const inputConfirmNotes = document.getElementById("journal-confirm-notes");
  const blockConfirmDocFields = document.getElementById(
    "block-journal-document-fields",
  );

  let activeLessonId = null;
  let activeStudentId = null;
  let activeAttendanceRecord = null;

  function closeModal() {
    
    if (!modal) return;
    modal.classList.remove("opacity-100", "pointer-events-auto");
    modal.classList.add("opacity-0", "pointer-events-none");
    if (modalDialog) {
      modalDialog.classList.remove("scale-100");
      modalDialog.classList.add("scale-95");
    }
    if (formComment) formComment.reset();
  }

  function openJournalConfirmModal() {
    const isSubjTeacher = currentUser && currentUser.role === "subject_teacher";
    if (isSubjTeacher) return;
    if (!modalConfirm || !activeAttendanceRecord) return;
    const currentDB = getDB();
    const student = (currentDB.students || []).find(
      (s) => s.id === activeAttendanceRecord.studentId,
    );
    const lesson = (currentDB.lessons || []).find(
      (l) => l.id === activeAttendanceRecord.lessonId,
    );

    if (inputConfirmAttId) inputConfirmAttId.value = activeAttendanceRecord.id;
    if (inputConfirmStudentName)
      inputConfirmStudentName.value = student ? student.fullName : "Ученик";
    if (inputConfirmDate)
      inputConfirmDate.value =
        activeAttendanceRecord.date || (lesson ? lesson.date : "");
    if (inputConfirmLesson)
      inputConfirmLesson.value = lesson
        ? `${lesson.subjectName || "Урок"} (${lesson.time || ""})`
        : "Урок";

    if (selectConfirmReasonType) selectConfirmReasonType.value = "excused";
    if (checkConfirmHasDoc) checkConfirmHasDoc.checked = true;
    if (blockConfirmDocFields) blockConfirmDocFields.style.display = "block";
    if (inputConfirmDocText) inputConfirmDocText.value = "";
    if (inputConfirmNotes) inputConfirmNotes.value = "";

    modalConfirm.classList.remove("opacity-0", "pointer-events-none");
    modalConfirm.classList.add("opacity-100", "pointer-events-auto");
    if (modalConfirmDialog) {
      modalConfirmDialog.classList.remove("scale-95");
      modalConfirmDialog.classList.add("scale-100");
    }
  }

  function closeJournalConfirmModal() {
    if (!modalConfirm) return;
    modalConfirm.classList.remove("opacity-100", "pointer-events-auto");
    modalConfirm.classList.add("opacity-0", "pointer-events-none");
    if (modalConfirmDialog) {
      modalConfirmDialog.classList.remove("scale-100");
      modalConfirmDialog.classList.add("scale-95");
    }
    if (formConfirmAbsence) formConfirmAbsence.reset();
  }

  if (btnCloseX) btnCloseX.onclick = closeModal;
  if (btnCloseFooter) btnCloseFooter.onclick = closeModal;
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnCloseConfirmX) btnCloseConfirmX.onclick = closeJournalConfirmModal;
  if (btnCancelConfirm) btnCancelConfirm.onclick = closeJournalConfirmModal;
  if (modalConfirm) {
    modalConfirm.addEventListener("click", (e) => {
      if (e.target === modalConfirm) closeJournalConfirmModal();
    });
  }

  if (selectConfirmReasonType && blockConfirmDocFields) {
    selectConfirmReasonType.addEventListener("change", () => {
      if (selectConfirmReasonType.value === "unexcused") {
        blockConfirmDocFields.style.display = "none";
      } else {
        blockConfirmDocFields.style.display = "block";
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (
        modalConfirm &&
        !modalConfirm.classList.contains("pointer-events-none")
      ) {
        closeJournalConfirmModal();
      } else if (modal && !modal.classList.contains("pointer-events-none")) {
        closeModal();
      }
    }
  });

  function openJournalEntryModal(lessonId, studentId) {
    
    if (!modal) return;
    activeLessonId = lessonId;
    activeStudentId = studentId;

    const currentDB = getDB();
    const lesson = (currentDB.lessons || []).find((l) => l.id === lessonId);
    const student = (currentDB.students || []).find((s) => s.id === studentId);
    const grade = (currentDB.grades || []).find(
      (g) => g.lessonId === lessonId && g.studentId === studentId,
    );
    const att = (currentDB.attendance || []).find(
      (a) => a.lessonId === lessonId && a.studentId === studentId,
    );
    activeAttendanceRecord = att;

    const elSub = document.getElementById("entry-modal-subject");
    const elDateBadge = document.getElementById(
      "entry-modal-lesson-date-badge",
    );
    const elInfo = document.getElementById("entry-modal-lesson-info");
    const elStudent = document.getElementById("entry-modal-student-name");
    const elStudentAvatar = document.getElementById(
      "entry-modal-student-avatar",
    );
    const elStudentLink = document.getElementById("entry-modal-student-link");
    const elGrade = document.getElementById("entry-modal-grade-badge");
    const elAtt = document.getElementById("entry-modal-attendance-badge");
    const elAbsenceDetails = document.getElementById(
      "entry-modal-absence-details",
    );
    const elConfirmBlock = document.getElementById(
      "block-confirm-from-journal",
    );

    if (elSub && lesson) elSub.textContent = lesson.subjectName || "Урок";
    if (elDateBadge && lesson) {
      elDateBadge.textContent = `${lesson.date || ""} (${lesson.time || ""})`;
    }
    if (elInfo && lesson) {
      elInfo.textContent = `${lesson.room ? lesson.room + " · " : ""}Преподаватель: ${lesson.teacher || "Учитель"}`;
    }
    if (elStudent && student) elStudent.textContent = student.fullName;
    if (elStudentAvatar && student) {
      const parts = (student.fullName || "").trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[1][0]}`
          : student.fullName
            ? student.fullName.slice(0, 2)
            : "УЧ";
      elStudentAvatar.textContent = initials.toUpperCase();
    }
    if (elStudentLink) {
      const isSubj = currentUser && currentUser.role === "subject_teacher";
      if (isSubj) {
        elStudentLink.classList.add("hidden");
      } else if (student) {
        elStudentLink.classList.remove("hidden");
        elStudentLink.href = hrefFor(`/overview?student=${student.id}`);
      }
    }

    if (elGrade) {
      if (grade) {
        let badgeStyle = "bg-slate-100 text-slate-800 border-slate-200";
        if (grade.value === 5)
          badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-300";
        else if (grade.value === 4)
          badgeStyle = "bg-blue-50 text-blue-800 border-blue-300";
        else if (grade.value === 3)
          badgeStyle = "bg-amber-50 text-amber-800 border-amber-300";
        else if (grade.value === 2)
          badgeStyle = "bg-rose-50 text-rose-800 border-rose-300";

        elGrade.innerHTML = `
          <div class="flex items-center space-x-3">
            <span class="inline-flex items-center justify-center w-10 h-10 text-base font-extrabold rounded-xl border ${badgeStyle} shadow-sm flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
              ${grade.value}
            </span>
            <div>
              <div class="text-xs font-bold text-slate-800">Оценка: ${grade.value}</div>
              <div class="text-[11px] text-slate-500">${grade.teacher || "Учитель"}</div>
            </div>
          </div>
        `;
      } else {
        elGrade.innerHTML = `
          <div class="flex items-center space-x-3 text-slate-400">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">—</span>
            <span class="text-xs">Оценка не выставлялась</span>
          </div>
        `;
      }
    }

    if (elAtt) {
      if (att && att.value === "absent") {
        const isExcused =
          att.status === "excused" || att.code === "УП" || att.code === "Б";
        if (isExcused) {
          elAtt.innerHTML = `
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm" style="width: 40px; height: 40px; min-width: 40px;">
                Б
              </div>
              <div>
                <div class="text-xs font-bold text-indigo-800">Уважительная причина</div>
                <div class="text-[11px] text-slate-500">Пропуск подтверждён</div>
              </div>
            </div>
          `;
          if (elAbsenceDetails) {
            elAbsenceDetails.classList.remove("hidden");
            elAbsenceDetails.className =
              "p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80 text-xs text-indigo-900";
            elAbsenceDetails.innerHTML = `
              <div class="flex items-center space-x-2">
                <span class="font-bold">Основание пропуска:</span>
                <span>${att.document || att.reason || "Медицинская справка"}</span>
              </div>
              ${att.confirmedBy ? `<div class="text-[11px] text-slate-500 mt-1">Подтвердил: <b class="text-slate-700">${att.confirmedBy}</b></div>` : ""}
            `;
          }
          if (elConfirmBlock) elConfirmBlock.classList.add("hidden");
        } else {
          elAtt.innerHTML = `
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 flex items-center justify-center font-bold text-sm flex-shrink-0 animate-pulse shadow-sm" style="width: 40px; height: 40px; min-width: 40px;">
                Н
              </div>
              <div>
                <div class="text-xs font-bold text-rose-800">Не подтверждено</div>
                <div class="text-[11px] text-rose-600 font-medium">Требуется справка</div>
              </div>
            </div>
          `;
          if (elAbsenceDetails) {
            elAbsenceDetails.classList.add("hidden");
            elAbsenceDetails.innerHTML = "";
          }
          if (elConfirmBlock) {
            const isSubjTeacher = currentUser && currentUser.role === "subject_teacher";
            if (isSubjTeacher) {
              elConfirmBlock.classList.add("hidden");
            } else {
              elConfirmBlock.classList.remove("hidden");
            }
          }
        }
      } else {
        elAtt.innerHTML = `
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm" style="width: 40px; height: 40px; min-width: 40px;">
              ✓
            </div>
            <div>
              <div class="text-xs font-bold text-emerald-800">Присутствовал</div>
              <div class="text-[11px] text-slate-500">Отметка на уроке</div>
            </div>
          </div>
        `;
        if (elAbsenceDetails) elAbsenceDetails.classList.add("hidden");
        if (elConfirmBlock) elConfirmBlock.classList.add("hidden");
      }
    }

    renderModalComments(lessonId, studentId);

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100", "pointer-events-auto");
    
    if (modalDialog) {
      modalDialog.classList.remove("scale-95");
      modalDialog.classList.add("scale-100");
    }
  }

  function renderModalComments(lessonId, studentId) {
    const comments = getJournalComments(lessonId, studentId);
    const elList = document.getElementById("entry-modal-comments-list");
    const elCount = document.getElementById("entry-modal-comments-count");

    if (elCount) elCount.textContent = comments.length;
    if (!elList) return;

    if (comments.length === 0) {
      elList.innerHTML = `
        <div class="py-3.5 text-center">
          <p class="text-xs font-medium text-slate-400">В этой записи пока нет комментариев</p>
        </div>
      `;
      return;
    }

    elList.innerHTML = comments
      .map((c) => {
        const isHomeroom = c.role === "teacher";
        const roleLabel = isHomeroom ? "Классрук" : "Предметник";
        const authorInitials = (c.author || "УЧ")
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase();
        return `
        <div class="flex items-start space-x-2">
          <div class="w-6 h-6 rounded-full ${isHomeroom ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-700"} font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            ${authorInitials}
          </div>
          <div class="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-1">
            <div class="flex items-center justify-between text-[10px]">
              <div class="flex items-center space-x-1.5">
                <span class="font-bold text-slate-900">${c.author}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold ${isHomeroom ? "bg-brand-50 text-brand-700 border border-brand-200" : "bg-slate-100 text-slate-600 border border-slate-200"}">${roleLabel}</span>
              </div>
              <span class="text-slate-400">${c.createdAt}</span>
            </div>
            <p class="text-xs text-slate-700 font-normal leading-relaxed">${c.text}</p>
          </div>
        </div>
      `;
      })
      .join("");

    elList.scrollTop = elList.scrollHeight;
  }

  document.querySelectorAll(".cell-journal-entry").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      
      if (
        e.target.closest(".grade-input:not([disabled])") ||
        e.target.closest(".btn-toggle-absence")
      ) {
        return;
      }
      const lessonId = cell.getAttribute("data-lesson-id");
      const studentId = cell.getAttribute("data-student-id");
      if (lessonId && studentId) {
        openJournalEntryModal(lessonId, studentId);
      }
    });
  });

  const btnQuickConfirm = document.getElementById("btn-quick-confirm-absence");
  if (btnQuickConfirm) {
    btnQuickConfirm.addEventListener("click", () => {
      if (!activeAttendanceRecord) return;
      openJournalConfirmModal();
    });
  }

  if (formConfirmAbsence) {
    formConfirmAbsence.addEventListener("submit", (e) => {
      e.preventDefault();
      const attId = inputConfirmAttId ? inputConfirmAttId.value : null;
      if (!attId) return;

      const reasonType = selectConfirmReasonType
        ? selectConfirmReasonType.value
        : "excused";
      const hasDoc = checkConfirmHasDoc ? checkConfirmHasDoc.checked : false;
      const docText = inputConfirmDocText
        ? inputConfirmDocText.value.trim()
        : "";
      const notes = inputConfirmNotes ? inputConfirmNotes.value.trim() : "";

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

      closeJournalConfirmModal();
      closeModal();

      const currentHash = "/journal" + (window.location.search || "");
      if (onNavigate) {
        onNavigate(currentHash);
      } else {
        window.location.reload();
      }
    });
  }

  if (formComment) {
    formComment.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!activeLessonId || !activeStudentId || !inputCommentText) return;
      const text = inputCommentText.value.trim();
      if (!text) return;

      const currentUser = getCurrentUser();
      const authorName =
        currentUser && (currentUser.shortName || currentUser.personName)
          ? currentUser.shortName || currentUser.personName
          : "Смирнова М. В.";
      const authorRole = currentUser ? currentUser.role : "teacher";

      const res = addJournalComment({
        lessonId: activeLessonId,
        studentId: activeStudentId,
        text,
        author: authorName,
        role: authorRole,
      });

      if (res.success) {
        inputCommentText.value = "";
        renderModalComments(activeLessonId, activeStudentId);

        const targetCell = document.querySelector(
          `.cell-journal-entry[data-lesson-id="${activeLessonId}"][data-student-id="${activeStudentId}"]`,
        );
        if (targetCell) {
          let indicator = targetCell.querySelector(".indicator-comment");
          const allCommentsForCell = getJournalComments(
            activeLessonId,
            activeStudentId,
          );
          if (!indicator) {
            indicator = document.createElement("span");
            indicator.className =
              "indicator-comment absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white animate-pulse";
            targetCell.appendChild(indicator);
            setTimeout(
              () => indicator && indicator.classList.remove("animate-pulse"),
              1500,
            );
          }
          indicator.title = `Комментарии: ${allCommentsForCell.length}`;
        }
      }
    });
  }

  const localChanges = new Map();

  function recalculateJournalStats() {
    let totalGradesSum = 0;
    let totalGradesCount = 0;
    let totalAbsencesCount = 0;
    let totalUnconfirmedCount = 0;

    const rows = document.querySelectorAll("tr.student-row");
    rows.forEach((row) => {
      let studentSum = 0;
      let studentGradesCount = 0;
      let studentAbsences = 0;
      let studentUnconfirmed = 0;

      row.querySelectorAll(".grade-input").forEach((input) => {
        const valStr = input.value.trim();
        if (valStr !== "") {
          const val = parseInt(valStr, 10);
          if (Number.isInteger(val) && val >= 2 && val <= 5 && !input.disabled) {
            studentSum += val;
            studentGradesCount++;
          } else if (Number.isInteger(val) && val >= 2 && val <= 5 && input.disabled && !input.classList.contains("cursor-pointer")) {
            studentSum += val;
            studentGradesCount++;
          }
        }
      });

      row.querySelectorAll(".cell-journal-entry > div > span").forEach((span) => {
        const text = span.textContent.trim();
        const num = parseInt(text, 10);
        if (Number.isInteger(num) && num >= 2 && num <= 5 && text.length === 1) {
          studentSum += num;
          studentGradesCount++;
        }
      });

      row.querySelectorAll(".btn-toggle-absence").forEach((btn) => {
        const status = btn.getAttribute("data-status");
        if (status === "unconfirmed") {
          studentAbsences++;
          studentUnconfirmed++;
        } else if (status === "confirmed") {
          studentAbsences++;
        }
      });

      row.querySelectorAll(".cell-journal-entry > div > span").forEach((span) => {
        const text = span.textContent.trim();
        if (text === "Н") {
          studentAbsences++;
          studentUnconfirmed++;
        } else if (text === "Б" || text === "УП") {
          studentAbsences++;
        }
      });

      const avgCell = row.querySelector(".student-avg-cell");
      if (avgCell) {
        if (studentGradesCount > 0) {
          const avg = (studentSum / studentGradesCount).toFixed(1);
          avgCell.textContent = avg;
          if (parseFloat(avg) < 3.5) {
            avgCell.classList.add("text-amber-700", "bg-amber-50/30");
            avgCell.classList.remove("text-slate-800");
          } else {
            avgCell.classList.remove("text-amber-700", "bg-amber-50/30");
            avgCell.classList.add("text-slate-800");
          }
        } else {
          avgCell.textContent = "—";
          avgCell.classList.remove("text-amber-700", "bg-amber-50/30");
          avgCell.classList.add("text-slate-800");
        }
      }

      const absCell = row.querySelector(".student-absences-cell");
      if (absCell) {
        if (studentAbsences > 0) {
          absCell.innerHTML = `
            <span class="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-700">
              <span>${studentAbsences}</span>
              ${studentUnconfirmed > 0 ? `<span class="text-rose-600 font-bold" title="Неподтверждённых: ${studentUnconfirmed}">(${studentUnconfirmed}Н)</span>` : ""}
            </span>
          `;
        } else {
          absCell.innerHTML = '<span class="text-slate-300">0</span>';
        }
      }

      totalGradesSum += studentSum;
      totalGradesCount += studentGradesCount;
      totalAbsencesCount += studentAbsences;
      totalUnconfirmedCount += studentUnconfirmed;
    });

    const elTotalGrades = document.getElementById("stat-total-grades");
    if (elTotalGrades) elTotalGrades.textContent = totalGradesCount;

    const elTotalGradesLabel = document.getElementById("stat-total-grades-label");
    if (elTotalGradesLabel) {
      elTotalGradesLabel.textContent =
        totalGradesCount % 10 === 1 && totalGradesCount % 100 !== 11
          ? "оценка"
          : totalGradesCount % 10 >= 2 && totalGradesCount % 10 <= 4 && (totalGradesCount % 100 < 10 || totalGradesCount % 100 >= 20)
            ? "оценки"
            : "оценок";
    }

    const elAvgGrade = document.getElementById("stat-avg-grade");
    if (elAvgGrade) {
      elAvgGrade.textContent = totalGradesCount > 0 ? (totalGradesSum / totalGradesCount).toFixed(1) : "—";
    }

    const elTotalAbsences = document.getElementById("stat-total-absences");
    if (elTotalAbsences) elTotalAbsences.textContent = totalAbsencesCount;

    const elUnconfirmedAbsences = document.getElementById("stat-unconfirmed-absences");
    if (elUnconfirmedAbsences) {
      if (totalUnconfirmedCount > 0) {
        elUnconfirmedAbsences.textContent = `${totalUnconfirmedCount} не подтверждено`;
        elUnconfirmedAbsences.className = "text-xs font-semibold text-rose-600";
      } else {
        elUnconfirmedAbsences.textContent = "Все подтверждены";
        elUnconfirmedAbsences.className = "text-xs font-semibold text-emerald-600";
      }
    }

    const elHighlightBadge = document.querySelector("#btn-toggle-highlight-unconfirmed .badge-unconfirmed-count");
    if (elHighlightBadge) {
      elHighlightBadge.textContent = totalUnconfirmedCount;
    }
  }

  document.querySelectorAll(".grade-input").forEach((input) => {
    input.addEventListener("click", (e) => {
      if (input.disabled) return;
      e.stopPropagation();
    });
    input.addEventListener("mousedown", (e) => {
      if (input.disabled) return;
      e.stopPropagation();
    });
    input.addEventListener("input", (e) => {
      const lessonId = input.getAttribute("data-lesson-id");
      const studentId = input.getAttribute("data-student-id");
      const rawVal = input.value.trim();

      if (input.disabled) return;

      const key = `${lessonId}_${studentId}`;
      const change = localChanges.get(key) || { lessonId, studentId };

      if (rawVal === "") {
        input.classList.remove("border-rose-400", "bg-rose-50", "text-rose-700");
        input.classList.add("border-amber-300", "bg-amber-50/40");
        change.grade = "";
        localChanges.set(key, change);
      } else {
        const val = parseInt(rawVal, 10);
        if (Number.isInteger(val) && val >= 2 && val <= 5 && rawVal.length === 1) {
          input.classList.remove("border-rose-400", "bg-rose-50", "text-rose-700");
          input.classList.add("border-emerald-400", "bg-emerald-50/40");
          change.grade = val;
          localChanges.set(key, change);
        } else {
          input.classList.remove("border-emerald-400", "bg-emerald-50/40");
          input.classList.add("border-rose-400", "bg-rose-50", "text-rose-700");
          change.grade = "invalid";
          localChanges.set(key, change);
        }
      }
      recalculateJournalStats();
    });

    input.addEventListener("blur", () => {
      const rawVal = input.value.trim();
      if (rawVal !== "") {
        const val = parseInt(rawVal, 10);
        if (!Number.isInteger(val) || val < 2 || val > 5) {
          input.classList.add("ring-2", "ring-rose-500/20");
        } else {
          input.classList.remove("ring-2", "ring-rose-500/20");
        }
      }
    });
  });

  document.querySelectorAll(".btn-toggle-absence").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lessonId = btn.getAttribute("data-lesson-id");
      const studentId = btn.getAttribute("data-student-id");
      const currentStatus = btn.getAttribute("data-status");
      const key = `${lessonId}_${studentId}`;
      const input = document.querySelector(`.grade-input[data-lesson-id="${lessonId}"][data-student-id="${studentId}"]`);

      if (currentStatus === "confirmed") {
        alert("Причина подтверждена классным руководителем. Изменение отметки заблокировано.");
        return;
      }

      const change = localChanges.get(key) || { lessonId, studentId };

      if (currentStatus === "unconfirmed") {
        btn.setAttribute("data-status", "present");
        btn.className = "btn-toggle-absence inline-flex items-center justify-center w-5 h-6 text-[10px] font-bold text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer";
        btn.title = "Отметить отсутствие ('Н')";

        if (input) {
          input.disabled = false;
          input.placeholder = "—";
          input.title = "Оценка (2, 3, 4, 5)";
          input.classList.remove("bg-slate-100", "cursor-not-allowed", "pointer-events-none");
          input.classList.add("bg-white", "text-slate-900");
          input.focus();
        }
        change.isAbsent = false;
        localChanges.set(key, change);
      } else {
        btn.setAttribute("data-status", "unconfirmed");
        btn.className = "btn-toggle-absence inline-flex items-center justify-center min-w-[22px] h-6 px-1 text-xs font-bold rounded-lg border shadow-2xs transition-all bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 cursor-pointer";
        btn.title = "Отсутствовал (нажмите, чтобы снять отметку)";

        if (input) {
          input.value = "";
          input.disabled = true;
          input.placeholder = "—";
          input.title = "Ученик отсутствовал";
          input.classList.remove("bg-white", "text-slate-900", "border-emerald-400", "bg-emerald-50/40");
          input.classList.add("bg-slate-100", "cursor-not-allowed");
        }
        change.isAbsent = true;
        change.grade = "";
        localChanges.set(key, change);
      }
      recalculateJournalStats();
    });
  });

  const btnSaveJournal = document.getElementById("btn-save-journal");
  if (btnSaveJournal) {
    btnSaveJournal.addEventListener("click", () => {
      let hasInvalidValues = false;
      document.querySelectorAll(".grade-input:not([disabled])").forEach((input) => {
        const val = input.value.trim();
        if (val !== "") {
          const num = parseInt(val, 10);
          if (!Number.isInteger(num) || num < 2 || num > 5 || val.length !== 1) {
            hasInvalidValues = true;
            input.classList.add("border-rose-500", "ring-2", "ring-rose-500/30");
          }
        }
      });

      if (hasInvalidValues) {
        alert("Недопустимое значение оценки! Разрешены только оценки от 2 до 5.");
        return;
      }

      const db = getDB();
      const currentUser = getCurrentUser();
      const teacherName =
        currentUser && (currentUser.shortName || currentUser.personName)
          ? currentUser.shortName || currentUser.personName
          : "Козлов А. П.";

      const lessonEntries = new Map();

      document.querySelectorAll(".grade-input").forEach((input) => {
        const lessonId = input.getAttribute("data-lesson-id");
        const studentId = input.getAttribute("data-student-id");
        if (!lessonId || !studentId) return;

        const lesson = (db.lessons || []).find((l) => l.id === lessonId);
        if (lesson && lesson.status === "closed") return; // закрытые не сохраняем

        if (!lessonEntries.has(lessonId)) {
          lessonEntries.set(lessonId, []);
        }

        const btnAbsence = document.querySelector(`.btn-toggle-absence[data-lesson-id="${lessonId}"][data-student-id="${studentId}"]`);
        const isAbsent = btnAbsence && (btnAbsence.getAttribute("data-status") === "unconfirmed" || btnAbsence.getAttribute("data-status") === "confirmed");
        const gradeVal = input.disabled ? "" : input.value.trim();

        lessonEntries.get(lessonId).push({
          studentId,
          grade: gradeVal,
          isAbsent: Boolean(isAbsent),
        });
      });

      lessonEntries.forEach((entries, lessonId) => {
        batchSaveLessonJournal({ lessonId, entries });
      });

      const prevHtml = btnSaveJournal.innerHTML;
      btnSaveJournal.innerHTML = `
        <span class="inline-flex items-center space-x-1.5 text-white font-bold">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>Сохранено!</span>
        </span>
      `;
      btnSaveJournal.classList.remove("bg-brand-500", "hover:bg-brand-600");
      btnSaveJournal.classList.add("bg-emerald-600");

      setTimeout(() => {
        btnSaveJournal.innerHTML = prevHtml;
        btnSaveJournal.classList.remove("bg-emerald-600");
        btnSaveJournal.classList.add("bg-brand-500", "hover:bg-brand-600");
      }, 2000);

      localChanges.clear();
      recalculateJournalStats();
    });
  }

}
