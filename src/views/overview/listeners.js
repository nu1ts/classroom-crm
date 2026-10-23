import { getDB, saveDB } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import {
  calculateStudentAttendance,
  calculateStudentAverage,
} from "../../mock/calculations.js";

export function setupOverviewListeners(onNavigate) {
  const db = getDB();

  const modalSummary = document.getElementById("modal-student-summary");
  const modalSummaryDialog = document.getElementById(
    "modal-student-summary-dialog",
  );
  const summaryContent = document.getElementById("student-summary-content");

  function openSummary(studentId) {
    const student = db.students?.find((s) => s.id === studentId);
    if (!student || !summaryContent) return;

    const periodId = "q1_2024";
    const overallAvg = calculateStudentAverage(db.grades, studentId, {
      periodId,
    });
    const att = calculateStudentAttendance(
      db.lessons,
      db.attendance,
      studentId,
      { periodId },
    );

    const subjectStats = (db.subjects || []).map((subj) => {
      const avg = calculateStudentAverage(db.grades, studentId, {
        periodId,
        subjectId: subj.id,
      });
      return { ...subj, average: avg };
    });

    const rels = (db.parentStudentRelations || []).filter(
      (r) => r.studentId === studentId,
    );
    const parentList = rels
      .map((r) => {
        const p = db.parents?.find((par) => par.id === r.parentId);
        return {
          ...p,
          relation: r.relationRole || r.relation,
          isPrimary: r.isPrimary ?? r.isPrimaryContact,
        };
      })
      .filter(Boolean);

    const notes = (db.notes || []).filter((n) => n.studentId === studentId);
    const contacts = (db.parentContacts || []).filter(
      (c) => c.studentId === studentId,
    );

    summaryContent.innerHTML = `
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="text-base font-bold text-slate-900">${student.fullName}</h3>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">7Б класс</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Дата рождения: ${student.birthDate || "2011 г."} · Личное дело № ${student.id}</p>
        </div>
        <button type="button" id="btn-close-summary-x" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          ${renderIcon("x", "w-4 h-4")}
        </button>
      </div>

      <div class="py-3.5 space-y-4">
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Средний балл</span>
            <div class="text-xl font-extrabold ${overallAvg !== null && overallAvg < 3.5 ? "text-rose-600" : "text-slate-900"} mt-0.5">
              ${overallAvg !== null ? overallAvg : "—"}
            </div>
            <span class="text-[9px] text-slate-400">порог: 3.5</span>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Посещаемость</span>
            <div class="text-xl font-extrabold ${att.absenceRate !== null && att.absenceRate > 20 ? "text-rose-600" : "text-slate-900"} mt-0.5">
              ${att.attendanceRate !== null ? att.attendanceRate + "%" : "—"}
            </div>
            <span class="text-[9px] text-slate-400">пропуски: ${att.absenceRate}%</span>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Пропущено</span>
            <div class="text-xl font-extrabold text-slate-900 mt-0.5">
              ${att.absentCount} <span class="text-xs font-normal text-slate-500">из ${att.totalLessons}</span>
            </div>
            <span class="text-[9px] text-slate-400">уроков</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Баллы по предметам</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${subjectStats
              .map(
                (s) => `
              <div class="p-2 rounded-lg border ${s.average !== null && s.average < 3.5 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-white border-slate-200 text-slate-800"} flex items-center justify-between text-xs">
                <span class="font-medium truncate mr-2">${s.name}</span>
                <span class="font-bold ${s.average !== null && s.average < 3.5 ? "text-rose-600" : "text-slate-900"}">${s.average !== null ? s.average : "—"}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Контакты родителей</h4>
          <div class="space-y-2">
            ${parentList
              .map(
                (p) => `
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div class="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>${p.fullName}</span>
                    <span class="text-[10px] text-slate-500">(${p.relation || "Родитель"})</span>
                    ${p.isPrimary ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand-100 text-brand-700">★ Основной контакт</span>' : ""}
                  </div>
                  <div class="text-slate-600 mt-0.5 text-[11px]">${p.phone || "+7 999 000-00-00"} · ${p.email || "—"}</div>
                </div>
                <button type="button" data-call-parent="${p.phone}" class="px-2 py-1 rounded bg-white border border-slate-200 hover:border-brand-300 text-brand-700 font-semibold text-[11px] transition-colors flex items-center space-x-1">
                  ${renderIcon("phone", "w-3 h-3")}
                  <span>Связаться</span>
                </button>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        ${
          notes.length > 0
            ? `
          <div>
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Заметки классного руководителя</h4>
            <div class="space-y-1.5">
              ${notes
                .map(
                  (n) => `
                <div class="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-xs">
                  <div class="text-slate-800 leading-relaxed">${n.text}</div>
                  <div class="text-[10px] text-slate-400 mt-1">${n.date} · ${n.author}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
        <button type="button" id="btn-close-summary" class="py-1.5 px-3.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors">
          Закрыть
        </button>
        <button type="button" id="btn-summary-to-contact" data-student-id="${student.id}" data-student-name="${student.fullName}"
                class="py-1.5 px-3.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors flex items-center space-x-1 shadow-xs">
          ${renderIcon("phone", "w-3 h-3")}
          <span>Зафиксировать контакт</span>
        </button>
      </div>
    `;

    modalSummary.classList.remove("opacity-0", "pointer-events-none");
    modalSummary.classList.add("opacity-100", "pointer-events-auto");
    modalSummaryDialog.classList.remove("scale-95");
    modalSummaryDialog.classList.add("scale-100");

    const closeBtn = document.getElementById("btn-close-summary");
    const closeX = document.getElementById("btn-close-summary-x");
    const toContactBtn = document.getElementById("btn-summary-to-contact");

    if (closeBtn) closeBtn.onclick = closeSummary;
    if (closeX) closeX.onclick = closeSummary;
    if (toContactBtn) {
      toContactBtn.onclick = () => {
        closeSummary();
        openContactModal(student.id, student.fullName);
      };
    }
  }

  function closeSummary() {
    if (!modalSummary) return;
    modalSummary.classList.remove("opacity-100", "pointer-events-auto");
    modalSummary.classList.add("opacity-0", "pointer-events-none");
    if (modalSummaryDialog) {
      modalSummaryDialog.classList.remove("scale-100");
      modalSummaryDialog.classList.add("scale-95");
    }
  }

  if (modalSummary) {
    modalSummary.addEventListener("click", (e) => {
      if (e.target === modalSummary) closeSummary();
    });
  }

  document.querySelectorAll(".btn-open-summary").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const sId = btn.getAttribute("data-student-id");
      if (sId) openSummary(sId);
    });
  });

  const modalContact = document.getElementById("modal-contact-parent");
  const modalContactDialog = document.getElementById("modal-contact-dialog");
  const formContact = document.getElementById("form-contact-parent");
  const contactStudentId = document.getElementById("contact-student-id");
  const contactStudentName = document.getElementById("contact-student-name");
  const contactParentSelect = document.getElementById("contact-parent-select");
  const closeContactX = document.getElementById("btn-close-contact-x");
  const cancelContactBtn = document.getElementById("btn-cancel-contact");

  function openContactModal(studentId, studentName) {
    if (!modalContact) return;
    if (contactStudentId) contactStudentId.value = studentId;
    if (contactStudentName) contactStudentName.value = studentName;

    if (contactParentSelect) {
      contactParentSelect.innerHTML = "";
      const rels = (db.parentStudentRelations || []).filter(
        (r) => r.studentId === studentId,
      );
      const parents = rels
        .map((r) => {
          const p = db.parents?.find((par) => par.id === r.parentId);
          return { ...p, relation: r.relation, isPrimary: r.isPrimaryContact };
        })
        .filter(Boolean);

      if (parents.length === 0) {
        contactParentSelect.innerHTML =
          '<option value="">Родитель не найден в базе</option>';
      } else {
        parents.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = `${p.fullName} (${p.relation || "Родитель"}) — ${p.phone || ""} ${p.isPrimary ? "★ Основной контакт" : ""}`;
          contactParentSelect.appendChild(opt);
        });
      }
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
  }

  if (closeContactX) closeContactX.onclick = closeContactModal;
  if (cancelContactBtn) cancelContactBtn.onclick = closeContactModal;
  if (modalContact) {
    modalContact.addEventListener("click", (e) => {
      if (e.target === modalContact) closeContactModal();
    });
  }

  document.querySelectorAll(".btn-contact-parent").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const sId = btn.getAttribute("data-student-id");
      const sName = btn.getAttribute("data-student-name");
      openContactModal(sId, sName);
    });
  });

  if (formContact) {
    formContact.addEventListener("submit", (e) => {
      e.preventDefault();
      const sId = contactStudentId.value;
      const pId = contactParentSelect.value;
      const channel = document.getElementById("contact-channel").value;
      const topic = document.getElementById("contact-topic").value;
      const summary = document.getElementById("contact-summary").value.trim();
      const agreement = document.getElementById("contact-agreement").checked;

      const channelLabels = {
        phone: "Телефонный звонок",
        chat: "Мессенджер (Сферум)",
        meeting: "Личная встреча",
      };

      const newContact = {
        id: `pc-${Date.now()}`,
        studentId: sId,
        parentId: pId || "pr-unknown",
        author: "Смирнова М. В.",
        date: "2024-10-28",
        time: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        channel,
        channelLabel: channelLabels[channel] || "Звонок",
        summary,
        agreementReached: agreement,
        nextContactDate: null,
      };

      if (!db.parentContacts) db.parentContacts = [];
      db.parentContacts.unshift(newContact);
      saveDB(db);

      closeContactModal();

      if (onNavigate) {
        onNavigate("/overview");
      }
    });
  }

  const modalNote = document.getElementById("modal-add-note");
  const modalNoteDialog = document.getElementById("modal-note-dialog");
  const formNote = document.getElementById("form-add-note");
  const noteStudentId = document.getElementById("note-student-id");
  const noteStudentName = document.getElementById("note-student-name");
  const closeNoteX = document.getElementById("btn-close-note-x");
  const cancelNoteBtn = document.getElementById("btn-cancel-note");

  function openNoteModal(studentId, studentName) {
    if (!modalNote) return;
    if (noteStudentId) noteStudentId.value = studentId;
    if (noteStudentName) noteStudentName.value = studentName;

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

  if (closeNoteX) closeNoteX.onclick = closeNoteModal;
  if (cancelNoteBtn) cancelNoteBtn.onclick = closeNoteModal;
  if (modalNote) {
    modalNote.addEventListener("click", (e) => {
      if (e.target === modalNote) closeNoteModal();
    });
  }

  document.querySelectorAll(".btn-add-note").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const sId = btn.getAttribute("data-student-id");
      const sName = btn.getAttribute("data-student-name");
      openNoteModal(sId, sName);
    });
  });

  if (formNote) {
    formNote.addEventListener("submit", (e) => {
      e.preventDefault();
      const sId = noteStudentId.value;
      const text = document.getElementById("note-text").value.trim();
      const isPrivate = document.getElementById("note-private").checked;

      const newNote = {
        id: `note-${Date.now()}`,
        studentId: sId,
        author: "Смирнова М. В.",
        date: "2024-10-28 10:15",
        text,
        isPrivate,
      };

      if (!db.notes) db.notes = [];
      db.notes.unshift(newNote);
      saveDB(db);

      closeNoteModal();

      if (onNavigate) {
        onNavigate("/overview");
      }
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSummary();
      closeContactModal();
      closeNoteModal();
    }
  });
}
