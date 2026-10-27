import {
  filterAndSortRows,
  prepareStudentRows,
  renderTableHtml,
} from "./helpers.js";
import { renderIcon } from "../../components/icons.js";
import {
  calculateStudentAttendance,
  calculateStudentAverage,
} from "../../mock/calculations.js";
import { replaceUrl } from "../../services/navigation.js";
import { getDB, saveDB } from "../../services/storage.js";

export function setupStudentsListeners(onNavigate) {
  let db = getDB();

  function getUrlParams() {
    const rawHash = "/students" + (window.location.search || "");
    const queryString = rawHash.includes("?") ? rawHash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    return {
      periodId: params.get("period") || "q1_2024",
      searchQuery: (params.get("search") || "").trim(),
      filterAbsencesOnly: params.get("absences") === "true",
      sortBy: params.get("sortBy") || "name",
      sortOrder: params.get("sortOrder") || "asc",
      page: parseInt(params.get("page") || "1", 10),
      studentModalId: params.get("student") || null,
    };
  }

  const state = getUrlParams();
  const pageSize = 10;

  const inputSearch = document.getElementById("input-search-student-list");
  const btnClearSearch = document.getElementById("btn-clear-student-search");
  const btnFilterAbsences = document.getElementById(
    "btn-filter-absences-toggle",
  );
  const selectPeriod = document.getElementById("select-students-period");
  const tableWrapper = document.getElementById("students-table-wrapper");

  const modalSummary = document.getElementById("modal-student-summary");
  const modalSummaryDialog = document.getElementById(
    "modal-student-summary-dialog",
  );
  const summaryContent = document.getElementById("student-summary-content");

  const modalAdd = document.getElementById("modal-add-student");
  const modalAddDialog = document.getElementById("modal-add-student-dialog");
  const formAdd = document.getElementById("form-add-student");
  const btnAddOpen = document.getElementById("btn-add-student-mock");

  const modalArchive = document.getElementById("modal-class-archive");
  const modalArchiveDialog = document.getElementById(
    "modal-class-archive-dialog",
  );
  const btnArchiveOpen = document.getElementById("btn-class-archive");
  const formArchive = document.getElementById("form-archive-student");

  function showToast(message, isSuccess = true) {
    const toast = document.getElementById("students-toast");
    const msgEl = document.getElementById("students-toast-message");
    const iconEl = document.getElementById("students-toast-icon");
    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = message;
    iconEl.innerHTML = isSuccess
      ? renderIcon("check", "w-4 h-4 text-emerald-400")
      : renderIcon("alert", "w-4 h-4 text-amber-400");
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

  function syncRoute() {
    const params = new URLSearchParams();
    if (state.periodId && state.periodId !== "q1_2024")
      params.set("period", state.periodId);
    if (state.searchQuery) params.set("search", state.searchQuery);
    if (state.filterAbsencesOnly) params.set("absences", "true");
    if (state.sortBy && state.sortBy !== "name")
      params.set("sortBy", state.sortBy);
    if (state.sortOrder && state.sortOrder !== "asc")
      params.set("sortOrder", state.sortOrder);
    if (state.page && state.page > 1) params.set("page", String(state.page));

    const queryStr = params.toString();
    const newHash = queryStr ? `/students?${queryStr}` : "/students";
    replaceUrl(newHash);
  }

  function updateFilterAbsencesBtnUI() {
    if (!btnFilterAbsences) return;
    if (state.filterAbsencesOnly) {
      btnFilterAbsences.className =
        "px-4 py-2.5 rounded-xl border bg-brand-500 text-white border-brand-500 shadow-xs text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer";
      btnFilterAbsences.innerHTML = `
        ${renderIcon("filter", "w-4 h-4 text-white")}
        <span>Фильтр: С пропусками</span>
      `;
    } else {
      btnFilterAbsences.className =
        "px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer";
      btnFilterAbsences.innerHTML = `
        ${renderIcon("filter", "w-4 h-4 text-slate-500")}
        <span>Фильтр: С пропусками</span>
      `;
    }
  }

  function renderAndAttachTable() {
    if (!tableWrapper) return;

    db = getDB();
    const rawStudents = (db.students || []).filter(
      (s) =>
        (!s.classId || s.classId === "class-7b") && s.status !== "archived",
    );
    const totalInClass = rawStudents.length;

    const studentRows = prepareStudentRows(db, state.periodId);
    const filteredRows = filterAndSortRows(studentRows, {
      searchQuery: state.searchQuery,
      filterAbsencesOnly: state.filterAbsencesOnly,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    });

    const totalFiltered = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);

    const startIndex = (state.page - 1) * pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const startShown = totalFiltered > 0 ? startIndex + 1 : 0;
    const endShown = Math.min(startIndex + pageSize, totalFiltered);

    tableWrapper.innerHTML = renderTableHtml({
      pageRows,
      totalFiltered,
      totalInClass,
      startShown,
      endShown,
      validPage: state.page,
      totalPages,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      searchQuery: state.searchQuery,
    });

    tableWrapper.querySelectorAll(".col-sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const targetSortBy = th.getAttribute("data-sort-by");
        if (state.sortBy === targetSortBy) {
          state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
        } else {
          state.sortBy = targetSortBy;
          state.sortOrder = "asc";
        }
        state.page = 1;
        syncRoute();
        renderAndAttachTable();
      });
    });

    tableWrapper
      .querySelectorAll(".btn-pagination-nav, .btn-pagination-page")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const p = parseInt(btn.getAttribute("data-page"), 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages && p !== state.page) {
            state.page = p;
            syncRoute();
            renderAndAttachTable();
          }
        });
      });

    const btnReset = tableWrapper.querySelector("#btn-reset-students-filters");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        state.searchQuery = "";
        state.filterAbsencesOnly = false;
        state.page = 1;
        if (inputSearch) inputSearch.value = "";
        if (btnClearSearch) btnClearSearch.classList.add("hidden");
        updateFilterAbsencesBtnUI();
        syncRoute();
        renderAndAttachTable();
        if (inputSearch) inputSearch.focus();
      });
    }

    tableWrapper
      .querySelectorAll(".btn-open-student-summary")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const sId = btn.getAttribute("data-student-id");
          if (sId) openSummary(sId);
        });
      });

    tableWrapper.querySelectorAll(".student-row-item").forEach((row) => {
      row.addEventListener("click", () => {
        const sId = row.getAttribute("data-student-id");
        if (sId) openSummary(sId);
      });
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener("input", () => {
      state.searchQuery = inputSearch.value.trim();
      state.page = 1;
      if (btnClearSearch) {
        btnClearSearch.classList.toggle("hidden", !state.searchQuery);
      }
      syncRoute();
      renderAndAttachTable();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
      if (inputSearch) inputSearch.value = "";
      state.searchQuery = "";
      state.page = 1;
      btnClearSearch.classList.add("hidden");
      syncRoute();
      renderAndAttachTable();
      if (inputSearch) inputSearch.focus();
    });
  }

  if (btnFilterAbsences) {
    btnFilterAbsences.addEventListener("click", () => {
      state.filterAbsencesOnly = !state.filterAbsencesOnly;
      state.page = 1;
      updateFilterAbsencesBtnUI();
      syncRoute();
      renderAndAttachTable();
    });
  }

  if (selectPeriod) {
    selectPeriod.addEventListener("change", () => {
      state.periodId = selectPeriod.value;
      state.page = 1;
      syncRoute();
      renderAndAttachTable();
    });
  }

  function openSummary(studentId) {
    db = getDB();
    const student = (db.students || []).find((s) => s.id === studentId);
    if (!student || !summaryContent || !modalSummary) return;

    const overallAvg = calculateStudentAverage(db.grades, studentId, {
      periodId: state.periodId,
    });
    const att = calculateStudentAttendance(
      db.lessons,
      db.attendance,
      studentId,
      { periodId: state.periodId },
    );

    const subjectStats = (db.subjects || []).map((subj) => {
      const avg = calculateStudentAverage(db.grades, studentId, {
        periodId: state.periodId,
        subjectId: subj.id,
      });
      return { ...subj, average: avg };
    });

    const rels = (db.parentStudentRelations || []).filter(
      (r) => r.studentId === studentId,
    );
    const parentList = rels
      .map((r) => {
        const p = (db.parents || []).find((par) => par.id === r.parentId);
        return {
          ...p,
          relation: r.relationRole || r.relation || "Родитель",
          isPrimary: r.isPrimary || r.isPrimaryContact,
        };
      })
      .filter(Boolean);

    summaryContent.innerHTML = `
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="text-base font-bold text-slate-900">${student.fullName}</h3>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">7Б класс</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Дата рождения: ${student.birthDate || "2011 г."} · Личное дело № ${student.id}</p>
        </div>
        <button type="button" id="btn-close-students-summary-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
          ${renderIcon("x", "w-4 h-4")}
        </button>
      </div>

      <div class="py-3.5 space-y-4">
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Средний балл</span>
            <div class="text-xl font-extrabold ${overallAvg !== null && overallAvg < 3.5 ? "text-rose-600" : "text-slate-900"} mt-0.5">
              ${overallAvg !== null ? overallAvg.toFixed(1).replace(".", ",") : "—"}
            </div>
            <span class="text-[9px] text-slate-400">порог: 3.5</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Посещаемость</span>
            <div class="text-xl font-extrabold text-slate-900 mt-0.5">
              ${att.attendanceRate}%
            </div>
            <span class="text-[9px] text-slate-400">пропуски: ${att.absenceRate}%</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-semibold text-slate-500 uppercase">Пропущено</span>
            <div class="text-xl font-extrabold ${att.absentCount > 0 ? "text-amber-600" : "text-slate-900"} mt-0.5">
              ${att.absentCount} <span class="text-xs font-semibold text-slate-400">из ${att.totalLessons}</span>
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
              <div class="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 flex items-center justify-between">
                <span class="text-xs text-slate-700 font-medium truncate mr-2" title="${s.name}">${s.name}</span>
                <span class="text-xs font-extrabold ${s.average !== null && s.average < 3.5 ? "text-rose-600" : "text-slate-900"}">
                  ${s.average !== null ? s.average.toFixed(1).replace(".", ",") : "—"}
                </span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Контакты родителей</h4>
          <div class="space-y-1.5">
            ${
              parentList.length > 0
                ? parentList
                    .map(
                      (p) => `
              <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-900 text-xs">
                    ${p.fullName}
                    <span class="text-[10px] font-normal text-slate-400 ml-1">(${p.relation})</span>
                    ${p.isPrimary ? '<span class="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-50 text-brand-700 border border-brand-200">Основной</span>' : ""}
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">${p.phone || "Телефон не указан"} · ${p.email || "—"}</div>
                </div>
              </div>
            `,
                    )
                    .join("")
                : `
              <div class="text-xs text-slate-400 italic">Контакты родителей не внесены</div>
            `
            }
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <button type="button" id="btn-archive-from-summary" data-student-id="${student.id}"
                class="py-2 px-3.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5">
          ${renderIcon("archive", "w-3.5 h-3.5 text-rose-500")}
          <span>Перевести в архив</span>
        </button>

        <div class="flex items-center space-x-2">
          <a href="/student?id=${student.id}"
             class="py-2 px-3.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors inline-flex items-center space-x-1.5">
            <span>Полная сводка</span>
            ${renderIcon("chevron-right", "w-3.5 h-3.5 text-brand-600")}
          </a>
          <button type="button" id="btn-close-students-summary-footer"
                  class="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
            Закрыть
          </button>
        </div>
      </div>
    `;

    modalSummary.classList.remove("opacity-0", "pointer-events-none");
    modalSummary.classList.add("opacity-100", "pointer-events-auto");
    if (modalSummaryDialog) {
      modalSummaryDialog.classList.remove("scale-95");
      modalSummaryDialog.classList.add("scale-100");
    }

    const closeBtn = document.getElementById(
      "btn-close-students-summary-footer",
    );
    const closeX = document.getElementById("btn-close-students-summary-x");
    if (closeBtn) closeBtn.onclick = closeSummary;
    if (closeX) closeX.onclick = closeSummary;

    const btnArchiveFromSummary = document.getElementById(
      "btn-archive-from-summary",
    );
    if (btnArchiveFromSummary) {
      btnArchiveFromSummary.onclick = () => {
        closeSummary();
        openArchiveModal(student.id);
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

  function openAddModal() {
    if (!modalAdd) return;
    db = getDB();
    const maxNum = (db.students || []).reduce((max, s) => {
      const match = (s.id || "").match(/st-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        return n > max ? n : max;
      }
      return max;
    }, 0);
    const nextId = `st-${String(maxNum + 1).padStart(2, "0")}`;

    const idInput = document.getElementById("add-student-id");
    if (idInput) idInput.value = nextId;

    const errBox = document.getElementById("add-student-error");
    if (errBox) {
      errBox.classList.add("hidden");
      errBox.textContent = "";
    }

    if (formAdd) formAdd.reset();
    if (idInput) idInput.value = nextId;

    modalAdd.classList.remove("opacity-0", "pointer-events-none");
    modalAdd.classList.add("opacity-100", "pointer-events-auto");
    if (modalAddDialog) {
      modalAddDialog.classList.remove("scale-95");
      modalAddDialog.classList.add("scale-100");
    }

    const firstInput = document.getElementById("add-student-lastname");
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  }

  function closeAddModal() {
    if (!modalAdd) return;
    modalAdd.classList.remove("opacity-100", "pointer-events-auto");
    modalAdd.classList.add("opacity-0", "pointer-events-none");
    if (modalAddDialog) {
      modalAddDialog.classList.remove("scale-100");
      modalAddDialog.classList.add("scale-95");
    }
  }

  if (btnAddOpen) btnAddOpen.addEventListener("click", openAddModal);
  const btnCloseAddX = document.getElementById("btn-close-add-student-x");
  const btnCancelAdd = document.getElementById("btn-cancel-add-student");
  if (btnCloseAddX) btnCloseAddX.addEventListener("click", closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener("click", closeAddModal);
  if (modalAdd) {
    modalAdd.addEventListener("click", (e) => {
      if (e.target === modalAdd) closeAddModal();
    });
  }

  if (formAdd) {
    formAdd.addEventListener("submit", (e) => {
      e.preventDefault();
      const lastName = (
        document.getElementById("add-student-lastname")?.value || ""
      ).trim();
      const firstName = (
        document.getElementById("add-student-firstname")?.value || ""
      ).trim();
      const middleName = (
        document.getElementById("add-student-middlename")?.value || ""
      ).trim();
      const gender =
        document.getElementById("add-student-gender")?.value || "M";
      const birthDate =
        document.getElementById("add-student-birthdate")?.value || "2011-05-15";
      const studentId =
        document.getElementById("add-student-id")?.value || `st-${Date.now()}`;

      const parentName = (
        document.getElementById("add-parent-fullname")?.value || ""
      ).trim();
      const parentRole =
        document.getElementById("add-parent-relation")?.value || "Родитель";
      const parentPhone = (
        document.getElementById("add-parent-phone")?.value || ""
      ).trim();

      const errBox = document.getElementById("add-student-error");
      if (!lastName || !firstName) {
        if (errBox) {
          errBox.textContent = "Пожалуйста, укажите фамилию и имя ученика.";
          errBox.classList.remove("hidden");
        }
        return;
      }

      db = getDB();
      if (!db.students) db.students = [];
      if (!db.parents) db.parents = [];
      if (!db.parentStudentRelations) db.parentStudentRelations = [];

      const fullName = `${lastName} ${firstName} ${middleName}`.trim();
      const shortName = `${lastName} ${firstName[0]}.`;

      const newStudent = {
        id: studentId,
        classId: "class-7b",
        lastName,
        firstName,
        middleName,
        fullName,
        shortName,
        gender,
        birthDate,
        age: 13,
        status: "active",
        avatar: "",
      };

      db.students.push(newStudent);

      if (parentName) {
        const parentId = `parent-${studentId}`;
        db.parents.push({
          id: parentId,
          fullName: parentName,
          shortName: parentName,
          phone: parentPhone || "+7 999 123-45-00",
          email: "",
        });
        db.parentStudentRelations.push({
          parentId,
          studentId,
          relationRole: parentRole,
          isPrimary: true,
        });
      }

      if (db.meta) {
        db.meta.studentsCount = db.students.filter(
          (s) =>
            (!s.classId || s.classId === "class-7b") && s.status !== "archived",
        ).length;
      }

      saveDB(db);
      closeAddModal();
      showToast(`Ученик ${fullName} успешно зачислен в 7Б класс!`);
      renderAndAttachTable();
    });
  }

  function populateArchiveContent(preselectStudentId = null) {
    db = getDB();
    const archivedList = (db.students || []).filter(
      (s) =>
        (!s.classId || s.classId === "class-7b") && s.status === "archived",
    );
    const activeList = (db.students || []).filter(
      (s) =>
        (!s.classId || s.classId === "class-7b") && s.status !== "archived",
    );

    const badge = document.getElementById("class-archive-count-badge");
    if (badge) {
      badge.textContent = `${archivedList.length} ${archivedList.length === 1 ? "ученик" : archivedList.length >= 2 && archivedList.length <= 4 ? "ученика" : "учеников"}`;
    }

    const container = document.getElementById("class-archive-list-container");
    if (container) {
      if (archivedList.length === 0) {
        container.innerHTML = `
          <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
              ${renderIcon("archive", "w-5 h-5")}
            </div>
            <div class="text-xs font-bold text-slate-700">В архиве класса нет выбывших учеников</div>
            <div class="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
              Все 28 учеников числятся в активном составе 7Б. Вы можете перевести ученика в архив в блоке ниже.
            </div>
          </div>
        `;
      } else {
        container.innerHTML = archivedList
          .map(
            (s) => `
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-slate-900 text-xs">${s.fullName}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">В архиве</span>
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Личное дело № ${s.id} · Причина: ${s.archiveReason || "Перевод"} (${s.archiveDate || "2024 г."})
              </div>
            </div>
            <button type="button" data-restore-id="${s.id}"
                    class="btn-restore-student py-1.5 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 transition-colors cursor-pointer flex-shrink-0">
              Восстановить в класс
            </button>
          </div>
        `,
          )
          .join("");

        container.querySelectorAll(".btn-restore-student").forEach((btn) => {
          btn.addEventListener("click", () => {
            const rId = btn.getAttribute("data-restore-id");
            restoreStudentFromArchive(rId);
          });
        });
      }
    }

    const selectStudent = document.getElementById("select-archive-student");
    if (selectStudent) {
      if (activeList.length === 0) {
        selectStudent.innerHTML = `<option value="">Нет активных учеников</option>`;
      } else {
        selectStudent.innerHTML = activeList
          .map(
            (s) => `
          <option value="${s.id}" ${s.id === preselectStudentId ? "selected" : ""}>${s.fullName} (${s.id})</option>
        `,
          )
          .join("");
      }
    }
  }

  function openArchiveModal(preselectStudentId = null) {
    if (!modalArchive) return;
    populateArchiveContent(preselectStudentId);

    modalArchive.classList.remove("opacity-0", "pointer-events-none");
    modalArchive.classList.add("opacity-100", "pointer-events-auto");
    if (modalArchiveDialog) {
      modalArchiveDialog.classList.remove("scale-95");
      modalArchiveDialog.classList.add("scale-100");
    }
  }

  function closeArchiveModal() {
    if (!modalArchive) return;
    modalArchive.classList.remove("opacity-100", "pointer-events-auto");
    modalArchive.classList.add("opacity-0", "pointer-events-none");
    if (modalArchiveDialog) {
      modalArchiveDialog.classList.remove("scale-100");
      modalArchiveDialog.classList.add("scale-95");
    }
  }

  function restoreStudentFromArchive(studentId) {
    db = getDB();
    const st = (db.students || []).find((s) => s.id === studentId);
    if (!st) return;

    st.status = "active";
    delete st.archiveReason;
    delete st.archiveDate;

    if (db.meta) {
      db.meta.studentsCount = db.students.filter(
        (s) =>
          (!s.classId || s.classId === "class-7b") && s.status !== "archived",
      ).length;
    }

    saveDB(db);
    populateArchiveContent();
    renderAndAttachTable();
    showToast(
      `Ученик ${st.fullName} восстановлен в активный состав 7Б класса!`,
    );
  }

  if (btnArchiveOpen)
    btnArchiveOpen.addEventListener("click", () => openArchiveModal());
  const btnCloseArchiveX = document.getElementById("btn-close-class-archive-x");
  if (btnCloseArchiveX)
    btnCloseArchiveX.addEventListener("click", closeArchiveModal);
  if (modalArchive) {
    modalArchive.addEventListener("click", (e) => {
      if (e.target === modalArchive) closeArchiveModal();
    });
  }

  if (formArchive) {
    formArchive.addEventListener("submit", (e) => {
      e.preventDefault();
      const sId = document.getElementById("select-archive-student")?.value;
      const reason =
        document.getElementById("select-archive-reason")?.value ||
        "Перевод в другую школу";
      const date =
        document.getElementById("input-archive-date")?.value || "2024-10-25";
      const order = (
        document.getElementById("input-archive-order")?.value || ""
      ).trim();

      if (!sId) return;

      db = getDB();
      const st = (db.students || []).find((s) => s.id === sId);
      if (!st) return;

      st.status = "archived";
      st.archiveReason = order ? `${reason} (${order})` : reason;
      st.archiveDate = date;

      if (db.meta) {
        db.meta.studentsCount = db.students.filter(
          (s) =>
            (!s.classId || s.classId === "class-7b") && s.status !== "archived",
        ).length;
      }

      saveDB(db);
      populateArchiveContent();
      renderAndAttachTable();
      showToast(`Ученик ${st.fullName} переведён в архив класса`);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (
        modalSummary &&
        !modalSummary.classList.contains("pointer-events-none")
      )
        closeSummary();
      if (modalAdd && !modalAdd.classList.contains("pointer-events-none"))
        closeAddModal();
      if (
        modalArchive &&
        !modalArchive.classList.contains("pointer-events-none")
      )
        closeArchiveModal();
    }
  });

  if (state.studentModalId) {
    openSummary(state.studentModalId);
  }

  renderAndAttachTable();
}
