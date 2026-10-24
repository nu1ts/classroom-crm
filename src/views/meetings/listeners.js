/**
 * Обработчики событий страницы «Собрания» в дизайн-системе Classroom CRM
 */

import {
  getMeetingById,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  canMarkAttendance,
  getMeetingAttendance,
  saveMeetingAttendance,
  getMeetingSummary,
  ATTENDANCE_STATUSES,
} from "../../services/meetings-ops.js";
import { formatDateRu } from "./render.js";
import { renderIcon } from "../../components/icons.js";


function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let currentAgendaItems = [];

/**
 * Получение инициалов из ФИО
 * @param {string} fullName
 * @returns {string}
 */
function getInitials(fullName) {
  if (!fullName) return "РД";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

/**
 * Инициализация всех обработчиков страницы «Собрания»
 * @param {Function} navigate Функция роутера
 */
export function setupMeetingsListeners(navigate) {
  const container = document.getElementById("meetings-view");
  if (!container) return;

  setupModalCloseHandlers();
  setupCreateMeetingHandler();
  setupEditMeetingHandlers();
  setupMeetingMenuHandlers();
  setupCancelMeetingHandlers();
  setupAgendaItemHandlers();
  setupSaveMeetingHandler(navigate);
  setupAttendanceHandlers();
  setupSummaryHandlers();
}

/**
 * Закрытие модального окна в стиле проекта
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("opacity-100", "pointer-events-auto");
  modal.classList.add("opacity-0", "pointer-events-none");

  const dialog = document.getElementById(`${modalId}-dialog`);
  if (dialog) {
    dialog.classList.remove("scale-100");
    dialog.classList.add("scale-95");
  }
  modal.classList.add("hidden");
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");

  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100", "pointer-events-auto");

    const dialog = document.getElementById(`${modalId}-dialog`);
    if (dialog) {
      dialog.classList.remove("scale-95");
      dialog.classList.add("scale-100");
    }
  });
}

/**
 * Универсальные обработчики закрытия модалок
 */
function setupModalCloseHandlers() {
  document.querySelectorAll(".btn-close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".fixed");
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    });
  });

  [
    "modal-meeting-form",
    "modal-cancel-meeting",
    "modal-meeting-attendance",
    "modal-meeting-summary",
  ].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(id);
        }
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [
        "modal-meeting-form",
        "modal-cancel-meeting",
        "modal-meeting-attendance",
        "modal-meeting-summary",
      ].forEach((id) => closeModal(id));
      closeAllDropdowns();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".meeting-menu-container")) {
      closeAllDropdowns();
    }
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".meeting-menu-dropdown").forEach((el) => {
    el.classList.add("hidden");
  });
}

/**
 * Открытие модалки создания собрания
 */
function setupCreateMeetingHandler() {
  const btn = document.getElementById("btn-create-meeting");
  if (!btn) return;

  btn.addEventListener("click", () => {
    document.getElementById("modal-meeting-form-title").textContent = "Создать собрание";
    document.getElementById("meeting-id-input").value = "";
    document.getElementById("meeting-title-input").value = "";
    document.getElementById("meeting-date-input").value = "";
    document.getElementById("meeting-time-input").value = "";
    document.getElementById("meeting-room-input").value = "Каб. 302";

    currentAgendaItems = [];
    renderModalAgendaList();
    clearMeetingFormErrors();

    openModal("modal-meeting-form");
  });
}

/**
 * Открытие модалки редактирования собрания
 */
function setupEditMeetingHandlers() {
  document.querySelectorAll(".btn-edit-meeting").forEach((btn) => {
    btn.addEventListener("click", () => {
      const meetingId = btn.getAttribute("data-meeting-id");
      const meeting = getMeetingById(meetingId);
      if (!meeting) return;

      document.getElementById("modal-meeting-form-title").textContent = "Редактировать собрание";
      document.getElementById("meeting-id-input").value = meeting.id;
      document.getElementById("meeting-title-input").value = meeting.title || "";
      document.getElementById("meeting-date-input").value = meeting.date || "";
      document.getElementById("meeting-time-input").value = meeting.time || "";
      document.getElementById("meeting-room-input").value = meeting.room || "Каб. 302";

      currentAgendaItems = Array.isArray(meeting.agendaItems)
        ? [...meeting.agendaItems]
        : (meeting.agenda ? [meeting.agenda] : []);

      renderModalAgendaList();
      clearMeetingFormErrors();

      openModal("modal-meeting-form");
    });
  });
}

/**
 * Меню действий «…»
 */
function setupMeetingMenuHandlers() {
  document.querySelectorAll(".btn-meeting-menu").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const container = btn.closest(".meeting-menu-container");
      const dropdown = container ? container.querySelector(".meeting-menu-dropdown") : null;
      if (dropdown) {
        const isHidden = dropdown.classList.contains("hidden");
        closeAllDropdowns();
        if (isHidden) {
          dropdown.classList.remove("hidden");
        }
      }
    });
  });
}

/**
 * Модалка подтверждения отмены собрания (TC-MG-06)
 */
function setupCancelMeetingHandlers() {
  document.querySelectorAll(".btn-cancel-meeting").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const meetingId = btn.getAttribute("data-meeting-id");
      document.getElementById("cancel-meeting-id").value = meetingId;
      openModal("modal-cancel-meeting");
    });
  });

  const confirmBtn = document.getElementById("btn-confirm-cancel-meeting");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const meetingId = document.getElementById("cancel-meeting-id").value;
      if (meetingId) {
        cancelMeeting(meetingId);
        closeModal("modal-cancel-meeting");
        window.location.reload();
      }
    });
  }
}

/**
 * Управление пунктами повестки (TC-MG-04)
 */
function setupAgendaItemHandlers() {
  const addBtn = document.getElementById("btn-add-agenda-item");
  const input = document.getElementById("input-new-agenda-item");

  const addItem = () => {
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    currentAgendaItems.push(val);
    input.value = "";
    renderModalAgendaList();
  };

  if (addBtn) {
    addBtn.addEventListener("click", addItem);
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem();
      }
    });
  }

  const listContainer = document.getElementById("modal-agenda-items-container");
  if (listContainer) {
    listContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const index = parseInt(btn.getAttribute("data-index"), 10);
      if (isNaN(index)) return;

      if (action === "up" && index > 0) {
        const temp = currentAgendaItems[index - 1];
        currentAgendaItems[index - 1] = currentAgendaItems[index];
        currentAgendaItems[index] = temp;
        renderModalAgendaList();
      } else if (action === "down" && index < currentAgendaItems.length - 1) {
        const temp = currentAgendaItems[index + 1];
        currentAgendaItems[index + 1] = currentAgendaItems[index];
        currentAgendaItems[index] = temp;
        renderModalAgendaList();
      } else if (action === "remove") {
        currentAgendaItems.splice(index, 1);
        renderModalAgendaList();
      }
    });
  }
}

function renderModalAgendaList() {
  const container = document.getElementById("modal-agenda-items-container");
  if (!container) return;

  if (currentAgendaItems.length === 0) {
    container.innerHTML = `
      <p class="text-xs text-slate-400 italic py-2 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
        Повестка пока пуста. Добавьте первый пункт ниже.
      </p>
    `;
    return;
  }

  container.innerHTML = currentAgendaItems
    .map((item, idx) => `
      <div class="agenda-item-row flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="font-bold text-slate-400 w-5 shrink-0 text-right">${idx + 1}.</span>
          <span class="text-slate-800 truncate font-semibold">${item}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="btn-agenda-up p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors ${idx === 0 ? "opacity-30 pointer-events-none" : "cursor-pointer"}"
            data-action="up"
            data-index="${idx}"
            title="Переместить выше"
          >
            ${renderIcon("chevron-up", "w-4 h-4")}
          </button>
          <button
            type="button"
            class="btn-agenda-down p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors ${idx === currentAgendaItems.length - 1 ? "opacity-30 pointer-events-none" : "cursor-pointer"}"
            data-action="down"
            data-index="${idx}"
            title="Переместить ниже"
          >
            ${renderIcon("chevron-down", "w-4 h-4")}
          </button>
          <button
            type="button"
            class="btn-agenda-remove p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            data-action="remove"
            data-index="${idx}"
            title="Удалить"
          >
            ${renderIcon("trash", "w-4 h-4")}
          </button>
        </div>
      </div>
    `)
    .join("");
}

function clearMeetingFormErrors() {
  ["error-meeting-title", "error-meeting-date", "error-meeting-time"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.classList.add("hidden");
    }
  });
  ["meeting-title-input", "meeting-date-input", "meeting-time-input"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.classList.remove("border-rose-400", "focus:ring-rose-500/20", "focus:border-rose-500");
    }
  });
}

function showMeetingFormError(field, message) {
  const errEl = document.getElementById(`error-meeting-${field}`);
  const inputEl = document.getElementById(`meeting-${field}-input`);
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove("hidden");
  }
  if (inputEl) {
    inputEl.classList.add("border-rose-400", "focus:ring-rose-500/20", "focus:border-rose-500");
  }
}

/**
 * Сохранение собрания (TC-MG-02, TC-MG-03, TC-MG-04, TC-MG-05)
 */
function setupSaveMeetingHandler(navigate) {
  const saveBtn = document.getElementById("btn-save-meeting");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    clearMeetingFormErrors();

    const meetingId = document.getElementById("meeting-id-input").value;
    const title = document.getElementById("meeting-title-input").value;
    const date = document.getElementById("meeting-date-input").value;
    const time = document.getElementById("meeting-time-input").value;
    const room = document.getElementById("meeting-room-input").value;

    const payload = {
      title,
      date,
      time,
      room,
      agendaItems: currentAgendaItems,
    };

    let result;
    if (meetingId) {
      result = updateMeeting(meetingId, payload);
    } else {
      result = createMeeting(payload);
    }

    if (!result.success) {
      if (result.errors) {
        if (result.errors.title) showMeetingFormError("title", result.errors.title);
        if (result.errors.date) showMeetingFormError("date", result.errors.date);
        if (result.errors.time) showMeetingFormError("time", result.errors.time);
      }
      return;
    }

    closeModal("modal-meeting-form");
    window.location.reload();
  });
}

/**
 * Отметка явки (TC-MG-07, TC-MG-08, TC-MG-09)
 */
function setupAttendanceHandlers() {
  document.querySelectorAll(".btn-mark-attendance").forEach((btn) => {
    btn.addEventListener("click", () => {
      const meetingId = btn.getAttribute("data-meeting-id");
      openAttendanceModal(meetingId);
    });
  });

  const saveBtn = document.getElementById("btn-save-attendance");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const meetingId = document.getElementById("attendance-meeting-id").value;
      if (!meetingId) return;

      const rows = document.querySelectorAll("#attendance-table-body tr");
      const items = [];
      let hasClientErrors = false;

      rows.forEach((row) => {
        const studentId = row.getAttribute("data-student-id");
        const select = row.querySelector(".attendance-status-select");
        const noteInput = row.querySelector(".attendance-note-input");
        const noteErr = row.querySelector(".attendance-note-error");

        const status = select ? select.value : ATTENDANCE_STATUSES.PRESENT;
        const note = noteInput ? noteInput.value.trim() : "";

        if (noteInput) noteInput.classList.remove("border-rose-400");
        if (noteErr) noteErr.classList.add("hidden");

        if (
          (status === ATTENDANCE_STATUSES.ABSENT || status === ATTENDANCE_STATUSES.EXCUSED) &&
          !note
        ) {
          hasClientErrors = true;
          if (noteInput) noteInput.classList.add("border-rose-400");
          if (noteErr) {
            noteErr.textContent = "Причина неявки обязательна";
            noteErr.classList.remove("hidden");
          }
        }

        items.push({
          studentId,
          status,
          note,
        });
      });

      if (hasClientErrors) return;

      const res = saveMeetingAttendance(meetingId, items);
      if (!res.success) {
        const errEl = document.getElementById("attendance-general-error");
        if (errEl) {
          errEl.textContent = res.message || "Ошибка сохранения явки";
          errEl.classList.remove("hidden");
        }
        return;
      }

      closeModal("modal-meeting-attendance");
      window.location.reload();
    });
  }
}

function openAttendanceModal(meetingId) {
  const meeting = getMeetingById(meetingId);
  if (!meeting) return;

  if (!canMarkAttendance(meeting)) {
    alert("Отметить явку до собрания нельзя: собрание ещё не состоялось.");
    return;
  }

  document.getElementById("attendance-meeting-id").value = meeting.id;
  document.getElementById("modal-attendance-title").textContent = "Отметка явки на собрание";
  document.getElementById("modal-attendance-subtitle").textContent = `${formatDateRu(meeting.date)} · ${meeting.title}`;

  const errEl = document.getElementById("attendance-general-error");
  if (errEl) errEl.classList.add("hidden");

  const attendance = getMeetingAttendance(meeting.id);
  const tbody = document.getElementById("attendance-table-body");
  if (!tbody) return;

  tbody.innerHTML = attendance
    .map((item) => {
      const isPresent = item.status === ATTENDANCE_STATUSES.PRESENT;
      const isAbsent = item.status === ATTENDANCE_STATUSES.ABSENT;
      const isExcused = item.status === ATTENDANCE_STATUSES.EXCUSED;
      const initials = getInitials(item.parentName);

      return `
        <tr class="hover:bg-slate-50/80 transition-colors" data-student-id="${item.studentId}">
          <td class="py-3 px-4">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-2xs shrink-0 select-none">
                ${initials}
              </div>
              <div>
                <span class="font-bold text-slate-900 block">${item.parentName}</span>
                <span class="text-2xs text-slate-400 font-medium">${item.parentRole || "Родитель"} · ${item.phone || ""}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 font-semibold text-slate-800">
            ${item.studentName}
          </td>
          <td class="py-3 px-4">
            <div class="relative">
              <select
                class="attendance-status-select w-full h-9 pl-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-white shadow-2xs cursor-pointer appearance-none"
              >
                <option value="${ATTENDANCE_STATUSES.PRESENT}" ${isPresent ? "selected" : ""}>Пришёл</option>
                <option value="${ATTENDANCE_STATUSES.ABSENT}" ${isAbsent ? "selected" : ""}>Не пришёл</option>
                <option value="${ATTENDANCE_STATUSES.EXCUSED}" ${isExcused ? "selected" : ""}>Уважительная причина</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-3.5 h-3.5")}
              </div>
            </div>
          </td>
          <td class="py-3 px-4">
            <input
              type="text"
              placeholder="Укажите причину неявки..."
              class="attendance-note-input w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs ${
                isPresent ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
              }"
              value="${escapeHtml(item.note || "")}"
              ${isPresent ? "disabled" : ""}
            />
            <p class="attendance-note-error hidden text-[11px] font-semibold text-rose-600 mt-1"></p>
          </td>
        </tr>
      `;
    })
    .join("");

  const updateCounter = () => {
    let presentCount = 0;
    const selects = tbody.querySelectorAll(".attendance-status-select");
    selects.forEach((sel) => {
      if (sel.value === ATTENDANCE_STATUSES.PRESENT) {
        presentCount++;
      }
    });
    const counterEl = document.getElementById("attendance-present-count");
    if (counterEl) {
      counterEl.textContent = String(presentCount);
    }
  };

  tbody.querySelectorAll(".attendance-status-select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const row = e.target.closest("tr");
      const noteInput = row ? row.querySelector(".attendance-note-input") : null;
      if (noteInput) {
        if (e.target.value === ATTENDANCE_STATUSES.PRESENT) {
          noteInput.placeholder = "Не требуется";
          noteInput.disabled = true;
          noteInput.classList.add("bg-slate-50", "text-slate-400", "cursor-not-allowed");
          noteInput.classList.remove("bg-white");
        } else {
          noteInput.placeholder = "Укажите причину (обязательно)";
          noteInput.disabled = false;
          noteInput.classList.remove("bg-slate-50", "text-slate-400", "cursor-not-allowed");
          noteInput.classList.add("bg-white");
        }
      }
      updateCounter();
    });
  });

  updateCounter();
  openModal("modal-meeting-attendance");
}

/**
 * Итоги собрания (TC-MG-10)
 */
function setupSummaryHandlers() {
  document.querySelectorAll(".btn-meeting-summary").forEach((btn) => {
    btn.addEventListener("click", () => {
      const meetingId = btn.getAttribute("data-meeting-id");
      openSummaryModal(meetingId);
    });
  });

  const btnOpenAttendance = document.getElementById("btn-summary-open-attendance");
  if (btnOpenAttendance) {
    btnOpenAttendance.addEventListener("click", () => {
      const meetingId = btnOpenAttendance.getAttribute("data-meeting-id");
      closeModal("modal-meeting-summary");
      if (meetingId) {
        openAttendanceModal(meetingId);
      }
    });
  }
}

function openSummaryModal(meetingId) {
  const meeting = getMeetingById(meetingId);
  if (!meeting) return;

  const summary = getMeetingSummary(meeting.id);

  document.getElementById("modal-summary-subtitle").textContent = `${formatDateRu(meeting.date)} · ${meeting.title}`;
  document.getElementById("summary-ratio-text").textContent = summary.ratioText;

  const percent = summary.total > 0 ? Math.round((summary.presentCount / summary.total) * 100) : 0;
  document.getElementById("summary-percentage-text").textContent = `${percent}%`;

  const btnOpenAttendance = document.getElementById("btn-summary-open-attendance");
  if (btnOpenAttendance) {
    btnOpenAttendance.setAttribute("data-meeting-id", meeting.id);
  }

  const listContainer = document.getElementById("summary-absent-list");
  if (listContainer) {
    if (summary.absentList.length === 0) {
      const allText = summary.total === 1
        ? "Родитель присутствовал на собрании"
        : `Все ${summary.total || 28} родителей присутствовали на собрании`;
      listContainer.innerHTML = `
        <div class="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-800 font-medium text-center">
          ${allText}
        </div>
      `;
    } else {
      listContainer.innerHTML = summary.absentList
        .map((a) => {
          const initials = getInitials(a.parentName);
          const isExcused = a.status === ATTENDANCE_STATUSES.EXCUSED;
          return `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs hover:bg-slate-100/70 transition-colors">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-7 h-7 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center font-bold text-3xs shrink-0 select-none border border-slate-300/60">
                  ${initials}
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-slate-900 block truncate text-xs">${a.parentName}</span>
                  <span class="text-2xs text-slate-400 font-medium block truncate">${a.studentName} (7Б)</span>
                </div>
              </div>
              <div class="text-right shrink-0 pl-2">
                <span class="inline-block px-2 py-0.5 rounded-full text-2xs font-bold ${
                  isExcused
                    ? "bg-amber-50 text-amber-800 border border-amber-200/70"
                    : "bg-rose-50 text-rose-800 border border-rose-200/70"
                }">
                  ${a.statusLabel || "Не пришёл"}
                </span>
                <span class="text-[10px] text-slate-500 block mt-0.5 font-medium italic max-w-[150px] truncate" title="${a.note || ""}">
                  ${a.note ? `«${a.note}»` : "Причина не указана"}
                </span>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  openModal("modal-meeting-summary");
}
