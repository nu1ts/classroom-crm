import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";
import {
  addWorkloadRow,
  getDB,
  getWorkloadRows,
  removeWorkloadRow,
  updateWorkloadRow,
} from "../../services/storage.js";
import { getActiveAcademicYear } from "../../services/school-year.js";
import { getClassDirectory } from "../../services/directories.js";
import {
  pluralizeClasses,
  pluralizeHours,
  pluralizeRows,
  pluralizeTeachers,
  filterWorkloadRows,
} from "./helpers.js";
import { workloadTableHtml } from "./render.js";

export function setupWorkloadListeners() {
  const tableArea = document.getElementById("workload-table-area");
  const searchInput = document.getElementById("input-workload-search");
  const clearSearchBtn = document.getElementById("btn-clear-workload-search");
  const subjectFilter = document.getElementById("select-workload-subject");
  const classFilter = document.getElementById("select-workload-class");
  const addBtn = document.getElementById("btn-open-add-workload");
  const modal = document.getElementById("modal-workload");
  const modalDialog = document.getElementById("modal-workload-dialog");
  const modalTitle = document.getElementById("workload-modal-title");
  const errorBox = document.getElementById("workload-error");
  const teacherSelect = document.getElementById("select-workload-teacher");
  const subjectSelect = document.getElementById(
    "select-workload-subject-modal",
  );
  const classSelect = document.getElementById("select-workload-class-modal");
  const hoursInput = document.getElementById("input-workload-hours");
  const submitBtn = document.getElementById("btn-submit-workload");
  const toast = document.getElementById("workload-toast");
  const toastMessage = document.getElementById("workload-toast-message");
  const toastIcon = document.getElementById("workload-toast-icon");

  let editingRowId = null;

  function getFilterState() {
    return {
      searchQuery: (searchInput ? searchInput.value : "").trim(),
      filterSubject: subjectFilter ? subjectFilter.value : "all",
      filterClass: classFilter ? classFilter.value : "all",
    };
  }

  function getFilteredRows() {
    return filterWorkloadRows(getWorkloadRows(getDB()), getFilterState());
  }

  function renderStats(rows) {
    const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);
    const teacherCount = new Set(rows.map((r) => r.teacherId)).size;
    const classCount = new Set(rows.map((r) => r.classId)).size;

    const subtitle = document.getElementById("workload-total-subtitle");
    if (subtitle) {
      subtitle.textContent = `${rows.length} ${pluralizeRows(rows.length)} · ${teacherCount} ${pluralizeTeachers(teacherCount)} · в ${classCount} ${pluralizeClasses(classCount)} · ${totalHours} ${pluralizeHours(totalHours)} в неделю`;
    }
    const hoursStat = document.getElementById("workload-stat-hours");
    if (hoursStat) hoursStat.textContent = totalHours;
    const teachersStat = document.getElementById("workload-stat-teachers");
    if (teachersStat) teachersStat.textContent = teacherCount;
    const classesStat = document.getElementById("workload-stat-classes");
    if (classesStat) classesStat.textContent = classCount;
  }

  function renderTable() {
    if (!tableArea) return;
    const rows = getFilteredRows();
    tableArea.innerHTML = workloadTableHtml(rows);
    renderStats(rows);
  }

  function updateUrl(state) {
    const params = new URLSearchParams();
    if (state.searchQuery) params.set("search", state.searchQuery);
    if (state.filterSubject !== "all")
      params.set("subject", state.filterSubject);
    if (state.filterClass !== "all") params.set("class", state.filterClass);
    const queryStr = params.toString();
    const newHash = queryStr ? `/workload?${queryStr}` : "/workload";
    replaceUrl(newHash);
  }

  function showToast(message, isError = false) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    if (toastIcon) {
      toastIcon.innerHTML = isError
        ? renderIcon("alert", "w-4 h-4 text-rose-400")
        : renderIcon("check", "w-4 h-4 text-emerald-400");
    }
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

  function showError(message) {
    if (!errorBox) return;
    if (message) {
      errorBox.textContent = message;
      errorBox.classList.remove("hidden");
    } else {
      errorBox.classList.add("hidden");
    }
  }

  function openModal(rowId) {
    if (!modal) return;
    editingRowId = rowId || null;
    showError("");

    const row = rowId
      ? getWorkloadRows(getDB()).find((r) => r.id === rowId)
      : null;

    if (modalTitle) {
      modalTitle.textContent = row ? "Изменить нагрузку" : "Назначить нагрузку";
    }
    if (teacherSelect) teacherSelect.value = row ? row.teacherId : "";
    if (subjectSelect) subjectSelect.value = row ? row.subjectId : "";
    if (classSelect) classSelect.value = row ? row.classId : "";
    if (hoursInput) hoursInput.value = row ? row.hours : 3;

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100", "pointer-events-auto");
    if (modalDialog) {
      modalDialog.classList.remove("scale-95");
      modalDialog.classList.add("scale-100");
    }
  }

  function closeModal() {
    if (!modal) return;
    editingRowId = null;
    modal.classList.remove("opacity-100", "pointer-events-auto");
    modal.classList.add("opacity-0", "pointer-events-none");
    if (modalDialog) {
      modalDialog.classList.remove("scale-100");
      modalDialog.classList.add("scale-95");
    }
  }

  renderTable();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle("hidden", !searchInput.value.trim());
      }
      renderTable();
      updateUrl(getFilterState());
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      clearSearchBtn.classList.add("hidden");
      renderTable();
      updateUrl(getFilterState());
    });
  }
  if (subjectFilter) {
    subjectFilter.addEventListener("change", () => {
      renderTable();
      updateUrl(getFilterState());
    });
  }
  if (classFilter) {
    classFilter.addEventListener("change", () => {
      renderTable();
      updateUrl(getFilterState());
    });
  }
  if (addBtn) {
    addBtn.addEventListener("click", () => openModal(null));
  }
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const values = {
        teacherId: teacherSelect ? teacherSelect.value : "",
        subjectId: subjectSelect ? subjectSelect.value : "",
        classId: classSelect ? classSelect.value : "",
        hours: hoursInput ? hoursInput.value : "",
      };
      if (!values.teacherId || !values.subjectId || !values.classId) {
        showError("Выберите учителя, предмет и класс");
        return;
      }
      const res = editingRowId
        ? updateWorkloadRow(editingRowId, values)
        : addWorkloadRow(values);
      if (!res.success) {
        showError(res.error);
        return;
      }
      closeModal();
      renderTable();
      showToast(res.message);
    });
  }

  if (tableArea) {
    tableArea.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const rowId = btn.getAttribute("data-row-id");
      if (action === "edit-workload") {
        openModal(rowId);
      }
      if (action === "remove-workload") {
        const res = removeWorkloadRow(rowId);
        if (!res.success) {
          showToast(res.error, true);
          return;
        }
        renderTable();
        showToast(res.message);
      }
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="close-workload-modal"]');
    if (btn) closeModal();
  });

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modal &&
      !modal.classList.contains("pointer-events-none")
    ) {
      closeModal();
    }
  });
}
