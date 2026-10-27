import { getCurrentUser, getDB } from "../../services/storage.js";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
  formatDateRu,
} from "../../services/announcements-ops.js";

/**
 * Закрытие модального окна в эталонном стиле CRM
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

/**
 * Открытие модального окна с плавной двухфазной анимацией
 */
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

export function setupAnnouncementsListeners(navigate) {
  const currentUser = getCurrentUser();

  const allModalIds = [
    "modal-announcement-detail",
    "modal-announcement-create",
    "modal-announcement-edit",
  ];

  document.querySelectorAll(".btn-close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".fixed");
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    });
  });

  allModalIds.forEach((id) => {
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
      allModalIds.forEach((id) => closeModal(id));
    }
  });

  const modalTitle = document.getElementById("modal-announcement-title");
  const modalContent = document.getElementById("modal-announcement-content");
  const modalAuthor = document.getElementById("modal-announcement-author");
  const modalDate = document.getElementById("modal-announcement-date");
  const modalReads = document.getElementById("modal-announcement-reads");

  document.querySelectorAll(".btn-read-full").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const currentDB = getDB();
      const announcement = (currentDB.announcements || []).find((a) => a.id === id);
      if (!announcement) return;

      const user = getCurrentUser();
      const isRecipient = user && (user.role === "parent" || user.role === "student");

      if (isRecipient) {
        const userKey = user.id || user.email;
        markAnnouncementRead(id, userKey);
      }

      const refreshedDB = getDB();
      const refreshedItem = (refreshedDB.announcements || []).find((a) => a.id === id) || announcement;
      const safeReads = Math.min(refreshedItem.totalCount || 28, refreshedItem.readCount || 0);

      const card = document.querySelector(`.announcement-card[data-id="${id}"]`);
      if (card) {
        const readsEl = card.querySelector(".announcement-reads");
        if (readsEl) {
          readsEl.textContent = `прочитали ${safeReads} из ${refreshedItem.totalCount || 28}`;
        }
      }

      if (modalTitle && modalContent) {
        modalTitle.textContent = refreshedItem.title;
        modalContent.textContent = refreshedItem.content;
        if (modalAuthor) modalAuthor.textContent = `Автор: ${refreshedItem.author || "Смирнова М. В."}`;
        if (modalDate) {
          modalDate.textContent = refreshedItem.date.includes("-")
            ? formatDateRu(refreshedItem.date)
            : refreshedItem.date;
        }
        if (modalReads) {
          modalReads.textContent = `прочитали ${safeReads} из ${refreshedItem.totalCount || 28}`;
        }
        openModal("modal-announcement-detail");
      }
    });
  });

  const formCreate = document.getElementById("form-create-announcement");
  const titleCreateInput = document.getElementById("announcement-create-title");
  const contentCreateInput = document.getElementById("announcement-create-content");
  const titleCreateError = document.getElementById("announcement-title-error");
  const contentCreateError = document.getElementById("announcement-content-error");
  const btnCreateOpen = document.getElementById("btn-create-announcement");

  const openCreateDialog = (initialTitle = "") => {
    if (titleCreateError) titleCreateError.classList.add("hidden");
    if (contentCreateError) contentCreateError.classList.add("hidden");
    if (titleCreateInput) {
      titleCreateInput.classList.remove("border-rose-400", "bg-rose-50/20");
      titleCreateInput.value = initialTitle;
    }
    if (contentCreateInput) {
      contentCreateInput.classList.remove("border-rose-400", "bg-rose-50/20");
      contentCreateInput.value = "";
    }
    openModal("modal-announcement-create");
    if (initialTitle && contentCreateInput) {
      contentCreateInput.focus();
    } else if (titleCreateInput) {
      titleCreateInput.focus();
    }
  };

  if (btnCreateOpen) {
    btnCreateOpen.addEventListener("click", () => openCreateDialog());
  }

  if (titleCreateInput) {
    titleCreateInput.addEventListener("input", () => {
      titleCreateInput.classList.remove("border-rose-400", "bg-rose-50/20");
      if (titleCreateError) titleCreateError.classList.add("hidden");
    });
  }
  if (contentCreateInput) {
    contentCreateInput.addEventListener("input", () => {
      contentCreateInput.classList.remove("border-rose-400", "bg-rose-50/20");
      if (contentCreateError) contentCreateError.classList.add("hidden");
    });
  }

  if (formCreate) {
    formCreate.addEventListener("submit", (e) => {
      e.preventDefault();
      const titleVal = titleCreateInput ? titleCreateInput.value.trim() : "";
      const contentVal = contentCreateInput ? contentCreateInput.value.trim() : "";

      let hasError = false;
      if (!titleVal) {
        hasError = true;
        if (titleCreateInput) {
          titleCreateInput.classList.add("border-rose-400", "bg-rose-50/20");
        }
        if (titleCreateError) {
          titleCreateError.textContent = "Заголовок объявления обязателен для заполнения";
          titleCreateError.classList.remove("hidden");
        }
      }

      if (!contentVal) {
        hasError = true;
        if (contentCreateInput) {
          contentCreateInput.classList.add("border-rose-400", "bg-rose-50/20");
        }
        if (contentCreateError) {
          contentCreateError.textContent = "Текст объявления обязателен для заполнения";
          contentCreateError.classList.remove("hidden");
        }
      }

      if (hasError) return;

      const result = createAnnouncement({
        title: titleVal,
        content: contentVal,
        classId: "class-7b",
      });

      if (result.success) {
        closeModal("modal-announcement-create");
        if (navigate) {
          navigate("announcements");
        } else {
          window.location.reload();
        }
      }
    });
  }

  const formEdit = document.getElementById("form-edit-announcement");
  const idEditInput = document.getElementById("announcement-edit-id");
  const titleEditInput = document.getElementById("announcement-edit-title");
  const contentEditInput = document.getElementById("announcement-edit-content");
  const titleEditError = document.getElementById("announcement-edit-title-error");
  const contentEditError = document.getElementById("announcement-edit-content-error");

  if (titleEditInput) {
    titleEditInput.addEventListener("input", () => {
      titleEditInput.classList.remove("border-rose-400", "bg-rose-50/20");
      if (titleEditError) titleEditError.classList.add("hidden");
    });
  }
  if (contentEditInput) {
    contentEditInput.addEventListener("input", () => {
      contentEditInput.classList.remove("border-rose-400", "bg-rose-50/20");
      if (contentEditError) contentEditError.classList.add("hidden");
    });
  }

  document.querySelectorAll(".btn-edit-announcement").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const db = getDB();
      const item = (db.announcements || []).find((a) => a.id === id);
      if (!item) return;

      if (idEditInput) idEditInput.value = item.id;
      if (titleEditInput) {
        titleEditInput.value = item.title;
        titleEditInput.classList.remove("border-rose-400", "bg-rose-50/20");
      }
      if (contentEditInput) {
        contentEditInput.value = item.content;
        contentEditInput.classList.remove("border-rose-400", "bg-rose-50/20");
      }
      if (titleEditError) titleEditError.classList.add("hidden");
      if (contentEditError) contentEditError.classList.add("hidden");

      openModal("modal-announcement-edit");
    });
  });

  if (formEdit) {
    formEdit.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = idEditInput ? idEditInput.value : "";
      const titleVal = titleEditInput ? titleEditInput.value.trim() : "";
      const contentVal = contentEditInput ? contentEditInput.value.trim() : "";

      let hasError = false;
      if (!titleVal) {
        hasError = true;
        if (titleEditInput) titleEditInput.classList.add("border-rose-400", "bg-rose-50/20");
        if (titleEditError) {
          titleEditError.textContent = "Заголовок объявления обязателен для заполнения";
          titleEditError.classList.remove("hidden");
        }
      }

      if (!contentVal) {
        hasError = true;
        if (contentEditInput) contentEditInput.classList.add("border-rose-400", "bg-rose-50/20");
        if (contentEditError) {
          contentEditError.textContent = "Текст объявления обязателен для заполнения";
          contentEditError.classList.remove("hidden");
        }
      }

      if (hasError) return;

      const result = updateAnnouncement(id, {
        title: titleVal,
        content: contentVal,
      });

      if (result.success) {
        closeModal("modal-announcement-edit");
        if (navigate) {
          navigate("announcements");
        } else {
          window.location.reload();
        }
      }
    });
  }

  document.querySelectorAll(".btn-delete-announcement").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (window.confirm("Удалить объявление?")) {
        deleteAnnouncement(id);
        if (navigate) {
          navigate("announcements");
        } else {
          window.location.reload();
        }
      }
    });
  });

  try {
    const presetTitle = sessionStorage.getItem("announcement_preset_title");
    if (presetTitle) {
      sessionStorage.removeItem("announcement_preset_title");
      openCreateDialog(presetTitle);
    }
  } catch {
    // ignore
  }
}
