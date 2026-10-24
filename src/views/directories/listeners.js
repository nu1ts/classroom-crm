import {
  addSubject,
  updateSubject,
  setSubjectActive,
  addRoom,
  updateRoom,
  setRoomActive,
  addSchoolClass,
  updateSchoolClass,
  setClassActive,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { replaceUrl } from "../../services/navigation.js";
import { normalizeTab } from "./helpers.js";
import {
  renderDirectoriesPanel,
  directoriesSubtitleText,
  directoriesTabCounts,
} from "./render.js";

const TAB_LABELS = {
  subjects: "предмет",
  rooms: "аудиторию",
  classes: "класс",
};

const TAB_TITLES = {
  subjects: "предмет",
  rooms: "аудиторию",
  classes: "класс",
};

const ADD_LABELS = {
  subjects: "Добавить предмет",
  rooms: "Добавить аудиторию",
  classes: "Добавить класс",
};

/**
 * Применение операции добавления/изменения к выбранной вкладке.
 * @param {string} tab Ключ вкладки
 * @param {string} id ID записи (пусто для создания)
 * @param {Object} data { name, shortName }
 * @returns {Object} Результат операции сервиса { success, error? }
 */
function saveEntry(tab, id, data) {
  if (tab === "subjects") {
    return id ? updateSubject(id, data) : addSubject(data);
  }
  if (tab === "rooms") {
    return id ? updateRoom(id, data) : addRoom(data);
  }
  return id ? updateSchoolClass(id, data) : addSchoolClass(data);
}

/**
 * Деактивация или возврат записи выбранной вкладки.
 * @param {string} tab Ключ вкладки
 * @param {string} id ID записи
 * @param {boolean} isActive Новое состояние активности
 * @returns {Object} Результат операции сервиса { success, error? }
 */
function toggleEntry(tab, id, isActive) {
  if (tab === "subjects") return setSubjectActive(id, isActive);
  if (tab === "rooms") return setRoomActive(id, isActive);
  return setClassActive(id, isActive);
}

/**
 * Установка слушателей страницы «Справочники».
 */
export function setupDirectoriesListeners() {
  const view = document.getElementById("directories-view");
  if (!view) return;

  const params = new URLSearchParams(window.location.search || "");
  const state = {
    tab: normalizeTab(params.get("tab")),
    searchQuery: params.get("search") || "",
  };

  const tableArea = document.getElementById("directories-table-area");
  const subtitle = document.getElementById("directories-total-subtitle");
  const searchInput = document.getElementById("input-directories-search");
  const clearSearch = document.getElementById("btn-clear-directories-search");
  const addButton = document.getElementById("btn-open-create-entry");
  const modal = document.getElementById("modal-directory-entry");
  const modalDialog = document.getElementById("modal-directory-entry-dialog");
  const modalTitle = document.getElementById("directory-modal-title");
  const modalSubtitle = document.getElementById("directory-modal-subtitle");
  const nameInput = document.getElementById("input-directory-name");
  const shortNameField = document.getElementById("directory-short-name-field");
  const shortNameInput = document.getElementById("input-directory-short-name");
  const errorLine = document.getElementById("directory-modal-error");
  const toast = document.getElementById("directories-toast");
  const toastMessage = document.getElementById("directories-toast-message");
  const toastIcon = document.getElementById("directories-toast-icon");

  let modalMode = "add";
  let modalId = "";

  function syncRoute() {
    const urlParams = new URLSearchParams();
    if (state.tab !== "subjects") urlParams.set("tab", state.tab);
    if (state.searchQuery) urlParams.set("search", state.searchQuery);
    const queryStr = urlParams.toString();
    replaceUrl(queryStr ? `/directories?${queryStr}` : "/directories");
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

  function refreshTable() {
    if (tableArea) {
      tableArea.innerHTML = renderDirectoriesPanel(
        state.tab,
        state.searchQuery,
      );
    }
    if (subtitle) subtitle.textContent = directoriesSubtitleText();
    const counts = directoriesTabCounts();
    view.querySelectorAll("[data-action='switch-tab']").forEach((btn) => {
      const badge = btn.querySelector("span:last-child");
      if (badge) badge.textContent = counts[btn.dataset.tab];
    });
  }

  function updateTabsActive() {
    view.querySelectorAll("[data-action='switch-tab']").forEach((btn) => {
      const isActive = btn.dataset.tab === state.tab;
      btn.className = `inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
        isActive
          ? "bg-brand-500 text-white shadow-2xs"
          : "bg-white text-slate-600 border border-slate-200/80 hover:border-brand-300 hover:text-brand-600"
      }`;
      const badge = btn.querySelector("span:last-child");
      if (badge) {
        badge.className = isActive ? "text-white/80" : "text-slate-400";
      }
    });
    if (addButton) {
      addButton.querySelector("span").textContent = ADD_LABELS[state.tab];
    }
  }

  function showModal(mode, entry = null) {
    if (!modal || !modalDialog) return;
    modalMode = mode;
    modalId = entry ? entry.id : "";
    const verb = mode === "add" ? "Добавить" : "Изменить";
    modalTitle.textContent = `${verb} ${TAB_TITLES[state.tab]}`;
    modalSubtitle.textContent =
      mode === "add"
        ? `Новая запись появится в справочнике и станет доступна для выбора в формах.`
        : `Изменения названия применяются во всех разделах, где используется запись.`;
    nameInput.value = entry ? entry.name : "";
    nameInput.placeholder = `Например: ${
      state.tab === "subjects"
        ? "Информатика"
        : state.tab === "rooms"
          ? "Каб. 105"
          : "5А"
    }`;
    shortNameField.style.display = state.tab === "subjects" ? "" : "none";
    shortNameInput.value = entry ? entry.shortName || "" : "";
    errorLine.classList.add("hidden");
    modal.classList.remove("opacity-0", "pointer-events-none");
    modalDialog.classList.remove("scale-95");
    setTimeout(() => nameInput.focus(), 50);
  }

  function hideModal() {
    if (!modal || !modalDialog) return;
    modal.classList.add("opacity-0", "pointer-events-none");
    modalDialog.classList.add("scale-95");
    modalMode = "add";
    modalId = "";
  }

  function showError(message) {
    errorLine.textContent = message;
    errorLine.classList.remove("hidden");
  }

  function saveFromModal() {
    const name = (nameInput.value || "").trim();
    const shortName = (shortNameInput.value || "").trim();
    const result = saveEntry(state.tab, modalId, { name, shortName });
    if (!result.success) {
      showError(result.error || "Не удалось сохранить запись");
      return;
    }
    const wasAdding = modalMode === "add";
    hideModal();
    refreshTable();
    showToast(
      wasAdding
        ? `Запись «${name}» добавлена в справочник`
        : `Запись «${name}» обновлена`,
    );
  }

  view.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === "switch-tab") {
      state.tab = normalizeTab(actionEl.dataset.tab);
      syncRoute();
      updateTabsActive();
      refreshTable();
      return;
    }

    if (
      action === "open-entry-modal" ||
      actionEl.id === "btn-open-create-entry"
    ) {
      showModal("add");
      return;
    }

    if (action === "edit-entry") {
      const row = actionEl.closest("tr[data-row-id]");
      if (!row) return;
      const cells = row.querySelectorAll("td");
      const entry = {
        id: actionEl.dataset.id,
        name: cells[0].textContent.trim(),
        shortName:
          state.tab === "subjects"
            ? cells[1].textContent.trim() === "—"
              ? ""
              : cells[1].textContent.trim()
            : "",
      };
      showModal("edit", entry);
      return;
    }

    if (action === "toggle-entry") {
      const result = toggleEntry(
        actionEl.dataset.tab,
        actionEl.dataset.id,
        actionEl.dataset.active !== "1",
      );
      if (!result.success) {
        showToast(result.error || "Не удалось изменить запись", true);
        return;
      }
      refreshTable();
      showToast(
        result.subject || result.room || result.schoolClass
          ? actionEl.dataset.active === "1"
            ? `Запись «${(result.subject || result.room || result.schoolClass).name}» деактивирована`
            : `Запись «${(result.subject || result.room || result.schoolClass).name}» снова активна`
          : "Состояние записи изменено",
      );
      return;
    }

    if (action === "close-directory-modal") {
      hideModal();
      return;
    }
  });

  if (addButton) {
    addButton.addEventListener("click", () => showModal("add"));
  }

  const saveButton = document.getElementById("btn-save-directory-entry");
  if (saveButton) {
    saveButton.addEventListener("click", saveFromModal);
  }

  [nameInput, shortNameInput].forEach((input) => {
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveFromModal();
        }
      });
    }
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) hideModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.searchQuery = searchInput.value.trim();
      if (clearSearch) {
        clearSearch.classList.toggle("hidden", !state.searchQuery);
      }
      syncRoute();
      refreshTable();
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      state.searchQuery = "";
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      clearSearch.classList.add("hidden");
      syncRoute();
      refreshTable();
    });
  }

  view.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("opacity-0")) {
      hideModal();
    }
  });
}
