import {
  escapeHtml,
  findUpcomingVacation,
  formatDateRu,
  getDurationText,
  renderQuartersTableHtml,
  renderVacationsGridHtml,
  renderYearTabsHtml,
} from "./helpers.js";
import { closeAllModals, closeModal, openModal, showToast } from "./ui.js";
import { renderIcon } from "../../components/icons.js";
import {
  addAcademicYear,
  addVacation,
  deleteAcademicYear,
  deleteVacation,
  getAcademicYears,
  getActiveAcademicYear,
  getDB,
  setActiveAcademicYear,
  setActiveQuarter,
  updateAcademicYear,
  updateQuarter,
  updateVacation,
} from "../../services/storage.js";

export function setupSchoolYearListeners(navigate) {
  const view = document.getElementById("school-year-view");
  if (!view) return;

  function getCurrentSelectedYearId() {
    return view.getAttribute("data-selected-year-id") || null;
  }

  function setCurrentSelectedYearId(id) {
    view.setAttribute("data-selected-year-id", id || "");
  }

  function updateViewData(selectedYearId = null) {
    const db = getDB();
    const years = getAcademicYears(db);
    const activeYear = getActiveAcademicYear(db);
    const effSelectedId =
      selectedYearId ||
      getCurrentSelectedYearId() ||
      (activeYear ? activeYear.id : years[0] ? years[0].id : null);
    const currentYear =
      years.find((y) => y.id === effSelectedId) ||
      activeYear ||
      years[0] ||
      null;

    if (currentYear) {
      setCurrentSelectedYearId(currentYear.id);
    }

    const meta = db.meta || {};
    const activePeriod = meta.period || {};
    const quarters = (currentYear && currentYear.quarters) || [];
    const vacations = (currentYear && currentYear.vacations) || [];
    const upcomingVacation = findUpcomingVacation(
      vacations,
      meta.demoToday || "2024-10-28",
    );

    const kpiActiveYear = document.getElementById("kpi-active-year-name");
    if (kpiActiveYear)
      kpiActiveYear.textContent = activeYear ? activeYear.name : "Не выбран";
    const kpiActiveYearDates = document.getElementById("kpi-active-year-dates");
    if (kpiActiveYearDates)
      kpiActiveYearDates.textContent = activeYear
        ? `${formatDateRu(activeYear.startDate)} – ${formatDateRu(activeYear.endDate)}`
        : "—";

    const kpiQuarterName = document.getElementById("kpi-active-quarter-name");
    if (kpiQuarterName)
      kpiQuarterName.textContent = activePeriod.name || "I четверть";
    const kpiQuarterDates = document.getElementById("kpi-active-quarter-dates");
    if (kpiQuarterDates)
      kpiQuarterDates.textContent = `${formatDateRu(activePeriod.startDate)} – ${formatDateRu(activePeriod.endDate)}`;

    const kpiVacName = document.getElementById("kpi-upcoming-vacation-name");
    if (kpiVacName)
      kpiVacName.textContent = upcomingVacation
        ? upcomingVacation.name
        : "Каникулы не запланированы";
    const kpiVacDates = document.getElementById("kpi-upcoming-vacation-dates");
    if (kpiVacDates)
      kpiVacDates.textContent = upcomingVacation
        ? `${formatDateRu(upcomingVacation.startDate)} – ${formatDateRu(upcomingVacation.endDate)} (${getDurationText(upcomingVacation.startDate, upcomingVacation.endDate)})`
        : "—";

    const tabsContainer = document.getElementById("academic-years-tabs");
    if (tabsContainer)
      tabsContainer.innerHTML = renderYearTabsHtml(
        years,
        currentYear ? currentYear.id : "",
      );

    const actionsContainer = document.getElementById("year-actions-container");
    if (actionsContainer && currentYear) {
      const editBtnHtml = `
        <button type="button" id="btn-open-edit-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}" data-year-start="${escapeHtml(currentYear.startDate)}" data-year-end="${escapeHtml(currentYear.endDate)}"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                title="Редактировать параметры года">
          ${renderIcon("edit", "w-3.5 h-3.5")}
          <span>Редактировать год</span>
        </button>
      `;
      if (!currentYear.isActive) {
        actionsContainer.innerHTML = `
          ${editBtnHtml}
          <button type="button" id="btn-set-active-year" data-year-id="${escapeHtml(currentYear.id)}"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center space-x-1">
            ${renderIcon("check", "w-3.5 h-3.5")}
            <span>Сделать текущим годом</span>
          </button>
          <button type="button" id="btn-delete-year" data-year-id="${escapeHtml(currentYear.id)}" data-year-name="${escapeHtml(currentYear.name)}"
                  class="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1"
                  title="Удалить учебный год">
            ${renderIcon("trash", "w-3.5 h-3.5")}
            <span>Удалить год</span>
          </button>
        `;
      } else {
        actionsContainer.innerHTML = `
          ${editBtnHtml}
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" id="badge-current-year-active">
            ${renderIcon("check", "w-3.5 h-3.5 mr-1 text-emerald-600")}
            Текущий учебный год
          </span>
        `;
      }
    }

    const quartersTbody = document.getElementById("quarters-table-body");
    if (quartersTbody)
      quartersTbody.innerHTML = renderQuartersTableHtml(quarters);

    const vacationsGrid = document.getElementById("vacations-grid");
    if (vacationsGrid)
      vacationsGrid.innerHTML = renderVacationsGridHtml(vacations);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeAllModals();
    }
  }
  document.removeEventListener("keydown", handleKeyDown);
  document.addEventListener("keydown", handleKeyDown);

  ["modal-add-year", "modal-edit-quarter", "modal-edit-vacation"].forEach(
    (modalId) => {
      const modalEl = document.getElementById(modalId);
      if (modalEl) {
        modalEl.addEventListener("click", (e) => {
          if (e.target === modalEl) {
            closeModal(modalId);
          }
        });
      }
    },
  );

  view.addEventListener("click", (e) => {
    const closeBtn = e.target.closest('[data-action="close-modal"]');
    if (closeBtn) {
      const parentModal = closeBtn.closest(".fixed.inset-0");
      if (parentModal) closeModal(parentModal.id);
      return;
    }

    const tabBtn = e.target.closest("[data-year-tab]");
    if (tabBtn) {
      e.preventDefault();
      const targetYearId = tabBtn.getAttribute("data-year-tab");
      setCurrentSelectedYearId(targetYearId);
      updateViewData(targetYearId);
      return;
    }

    const setActiveYearBtn = e.target.closest("#btn-set-active-year");
    if (setActiveYearBtn) {
      const yearId = setActiveYearBtn.getAttribute("data-year-id");
      const res = setActiveAcademicYear(yearId);
      if (res.success) {
        updateViewData(yearId);
        showToast(`Учебный год «${res.year.name}» назначен текущим`);
      } else {
        showToast(res.error || "Ошибка смены года", true);
      }
      return;
    }

    const deleteYearBtn = e.target.closest("#btn-delete-year");
    if (deleteYearBtn) {
      const yearId = deleteYearBtn.getAttribute("data-year-id");
      const yearName = deleteYearBtn.getAttribute("data-year-name");
      if (
        !confirm(`Вы действительно хотите удалить учебный год «${yearName}»?`)
      )
        return;

      const res = deleteAcademicYear(yearId);
      if (res.success) {
        updateViewData();
        showToast(`Учебный год «${yearName}» удалён`);
      } else {
        showToast(res.error || "Ошибка удаления года", true);
      }
      return;
    }

    const openAddYearBtn = e.target.closest("#btn-open-add-year");
    if (openAddYearBtn) {
      const errEl = document.getElementById("add-year-error");
      if (errEl) errEl.classList.add("hidden");
      const form = document.getElementById("form-add-year");
      if (form) form.reset();
      openModal("modal-add-year");
      return;
    }

    const openEditYearBtn = e.target.closest("#btn-open-edit-year");
    if (openEditYearBtn) {
      const yearId = openEditYearBtn.getAttribute("data-year-id");
      const yearName = openEditYearBtn.getAttribute("data-year-name");
      const yearStart = openEditYearBtn.getAttribute("data-year-start");
      const yearEnd = openEditYearBtn.getAttribute("data-year-end");

      const idEl = document.getElementById("edit-year-id");
      const nameEl = document.getElementById("input-edit-year-name");
      const startEl = document.getElementById("input-edit-year-start");
      const endEl = document.getElementById("input-edit-year-end");
      const errEl = document.getElementById("edit-year-error");

      if (idEl) idEl.value = yearId;
      if (nameEl) nameEl.value = yearName;
      if (startEl) startEl.value = yearStart;
      if (endEl) endEl.value = yearEnd;
      if (errEl) errEl.classList.add("hidden");

      openModal("modal-edit-year");
      return;
    }

    const setQuarterBtn = e.target.closest(
      '[data-action="set-active-quarter"]',
    );
    if (setQuarterBtn) {
      const quarterId = setQuarterBtn.getAttribute("data-quarter-id");
      const curYearId = getCurrentSelectedYearId();
      const res = setActiveQuarter(curYearId, quarterId);
      if (res.success) {
        updateViewData(curYearId);
        showToast(`Текущей четвертью назначена «${res.quarter.name}»`);
      } else {
        showToast(res.error || "Ошибка смены четверти", true);
      }
      return;
    }

    const editQuarterBtn = e.target.closest('[data-action="edit-quarter"]');
    if (editQuarterBtn) {
      const quarterId = editQuarterBtn.getAttribute("data-quarter-id");
      const quarterName = editQuarterBtn.getAttribute("data-quarter-name");
      const startDate = editQuarterBtn.getAttribute("data-start-date");
      const endDate = editQuarterBtn.getAttribute("data-end-date");

      const idEl = document.getElementById("edit-quarter-id");
      const nameEl = document.getElementById("input-edit-quarter-name");
      const startEl = document.getElementById("input-edit-quarter-start");
      const endEl = document.getElementById("input-edit-quarter-end");
      const errEl = document.getElementById("edit-quarter-error");

      if (idEl) idEl.value = quarterId;
      if (nameEl) nameEl.value = quarterName;
      if (startEl) startEl.value = startDate;
      if (endEl) endEl.value = endDate;
      if (errEl) errEl.classList.add("hidden");

      openModal("modal-edit-quarter");
      return;
    }

    const addVacBtn = e.target.closest("#btn-add-vacation");
    if (addVacBtn) {
      const idEl = document.getElementById("edit-vacation-id");
      const titleEl = document.getElementById("modal-edit-vacation-title");
      const form = document.getElementById("form-edit-vacation");
      const errEl = document.getElementById("edit-vacation-error");

      if (idEl) idEl.value = "";
      if (titleEl) titleEl.textContent = "Добавление каникул";
      if (form) form.reset();
      if (errEl) errEl.classList.add("hidden");

      openModal("modal-edit-vacation");
      return;
    }

    const editVacBtn = e.target.closest('[data-action="edit-vacation"]');
    if (editVacBtn) {
      const id = editVacBtn.getAttribute("data-vacation-id");
      const name = editVacBtn.getAttribute("data-vacation-name");
      const start = editVacBtn.getAttribute("data-start-date");
      const end = editVacBtn.getAttribute("data-end-date");

      const idEl = document.getElementById("edit-vacation-id");
      const titleEl = document.getElementById("modal-edit-vacation-title");
      const nameEl = document.getElementById("input-edit-vacation-name");
      const startEl = document.getElementById("input-edit-vacation-start");
      const endEl = document.getElementById("input-edit-vacation-end");
      const errEl = document.getElementById("edit-vacation-error");

      if (idEl) idEl.value = id;
      if (titleEl) titleEl.textContent = "Редактирование каникул";
      if (nameEl) nameEl.value = name;
      if (startEl) startEl.value = start;
      if (endEl) endEl.value = end;
      if (errEl) errEl.classList.add("hidden");

      openModal("modal-edit-vacation");
      return;
    }

    const delVacBtn = e.target.closest('[data-action="delete-vacation"]');
    if (delVacBtn) {
      const id = delVacBtn.getAttribute("data-vacation-id");
      const name = delVacBtn.getAttribute("data-vacation-name");
      if (!confirm(`Удалить каникулы «${name}»?`)) return;

      const curYearId = getCurrentSelectedYearId();
      const res = deleteVacation(curYearId, id);
      if (res.success) {
        updateViewData(curYearId);
        showToast(`Каникулы «${name}» удалены`);
      }
      return;
    }
  });

  const formAddYear = document.getElementById("form-add-year");
  if (formAddYear) {
    formAddYear.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (
        document.getElementById("input-add-year-name")?.value || ""
      ).trim();
      const startDate =
        document.getElementById("input-add-year-start")?.value || "";
      const endDate =
        document.getElementById("input-add-year-end")?.value || "";
      const errEl = document.getElementById("add-year-error");

      const res = addAcademicYear({ name, startDate, endDate });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove("hidden");
        }
        return;
      }

      closeModal("modal-add-year");
      updateViewData(res.year.id);
      showToast(`Учебный год «${res.year.name}» успешно создан`);
    });
  }

  const formEditYear = document.getElementById("form-edit-year");
  if (formEditYear) {
    formEditYear.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = (document.getElementById("edit-year-id")?.value || "").trim();
      const name = (
        document.getElementById("input-edit-year-name")?.value || ""
      ).trim();
      const startDate =
        document.getElementById("input-edit-year-start")?.value || "";
      const endDate =
        document.getElementById("input-edit-year-end")?.value || "";
      const errEl = document.getElementById("edit-year-error");

      const res = updateAcademicYear(id, { name, startDate, endDate });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error || "Ошибка обновления";
          errEl.classList.remove("hidden");
        }
        return;
      }

      closeModal("modal-edit-year");
      updateViewData(res.year.id);
      showToast(`Учебный год «${res.year.name}» успешно обновлен`);
    });
  }

  const formEditQuarter = document.getElementById("form-edit-quarter");
  if (formEditQuarter) {
    formEditQuarter.addEventListener("submit", (e) => {
      e.preventDefault();
      const quarterId = document.getElementById("edit-quarter-id")?.value;
      const name =
        document.getElementById("input-edit-quarter-name")?.value || "";
      const startDate =
        document.getElementById("input-edit-quarter-start")?.value || "";
      const endDate =
        document.getElementById("input-edit-quarter-end")?.value || "";
      const errEl = document.getElementById("edit-quarter-error");

      const curYearId = getCurrentSelectedYearId();
      const res = updateQuarter(curYearId, quarterId, {
        name,
        startDate,
        endDate,
      });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove("hidden");
        }
        return;
      }

      closeModal("modal-edit-quarter");
      updateViewData(curYearId);
      showToast(`Даты четверти «${res.quarter.name}» обновлены`);
    });
  }

  const formVac = document.getElementById("form-edit-vacation");
  if (formVac) {
    formVac.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-vacation-id")?.value;
      const name =
        document.getElementById("input-edit-vacation-name")?.value || "";
      const startDate =
        document.getElementById("input-edit-vacation-start")?.value || "";
      const endDate =
        document.getElementById("input-edit-vacation-end")?.value || "";
      const errEl = document.getElementById("edit-vacation-error");

      const curYearId = getCurrentSelectedYearId();
      let res;
      if (id) {
        res = updateVacation(curYearId, id, { name, startDate, endDate });
      } else {
        res = addVacation(curYearId, { name, startDate, endDate });
      }

      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.remove("hidden");
        }
        return;
      }

      closeModal("modal-edit-vacation");
      updateViewData(curYearId);
      showToast(`Каникулы «${name}» сохранены`);
    });
  }
}
