import { getCurrentUser, getDB } from "../../services/storage.js";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
  formatDateRu,
} from "../../services/announcements-ops.js";

export function setupAnnouncementsListeners(navigate) {
  const currentUser = getCurrentUser();

  const detailModal = document.getElementById("modal-announcement-detail");
  const modalTitle = document.getElementById("modal-announcement-title");
  const modalContent = document.getElementById("modal-announcement-content");
  const modalAuthor = document.getElementById("modal-announcement-author");
  const modalDate = document.getElementById("modal-announcement-date");
  const modalReads = document.getElementById("modal-announcement-reads");

  const closeDetailModal = () => {
    if (detailModal) {
      detailModal.classList.add("hidden");
    }
  };

  const btnCloseDetail = document.getElementById("btn-close-announcement-modal");
  if (btnCloseDetail) {
    btnCloseDetail.addEventListener("click", closeDetailModal);
  }

  const btnDismissDetail = document.getElementById("btn-modal-dismiss");
  if (btnDismissDetail) {
    btnDismissDetail.addEventListener("click", closeDetailModal);
  }

  if (detailModal) {
    detailModal.addEventListener("click", (e) => {
      if (e.target === detailModal) {
        closeDetailModal();
      }
    });
  }

  document.querySelectorAll(".btn-read-full").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const currentDB = getDB();
      const announcement = (currentDB.announcements || []).find((a) => a.id === id);
      if (!announcement) return;

      if (currentUser) {
        const userKey = currentUser.id || currentUser.email;
        markAnnouncementRead(id, userKey);

        const refreshedDB = getDB();
        const refreshedItem = (refreshedDB.announcements || []).find((a) => a.id === id);
        if (refreshedItem) {
          const safeReads = Math.min(refreshedItem.totalCount || 28, refreshedItem.readCount || 0);
          const card = document.querySelector(`.announcement-card[data-id="${id}"]`);
          if (card) {
            const readsEl = card.querySelector(".announcement-reads");
            if (readsEl) {
              readsEl.textContent = `прочитали ${safeReads} из ${refreshedItem.totalCount || 28}`;
            }
          }
          if (modalReads) {
            modalReads.textContent = `прочитали ${safeReads} из ${refreshedItem.totalCount || 28}`;
          }
        }
      }

      if (detailModal && modalTitle && modalContent) {
        modalTitle.textContent = announcement.title;
        modalContent.textContent = announcement.content;
        if (modalAuthor) modalAuthor.textContent = `Автор: ${announcement.author || "Смирнова М. В."}`;
        if (modalDate) {
          modalDate.textContent = announcement.date.includes("-")
            ? formatDateRu(announcement.date)
            : announcement.date;
        }
        if (modalReads && !currentUser) {
          const safeReads = Math.min(announcement.totalCount || 28, announcement.readCount || 0);
          modalReads.textContent = `прочитали ${safeReads} из ${announcement.totalCount || 28}`;
        }
        detailModal.classList.remove("hidden");
      }
    });
  });

  const createModal = document.getElementById("modal-announcement-create");
  const formCreate = document.getElementById("form-create-announcement");
  const titleCreateInput = document.getElementById("announcement-create-title");
  const contentCreateInput = document.getElementById("announcement-create-content");
  const titleCreateError = document.getElementById("announcement-title-error");
  const contentCreateError = document.getElementById("announcement-content-error");
  const btnCreateOpen = document.getElementById("btn-create-announcement");
  const btnCloseCreate = document.getElementById("btn-close-create-modal");
  const btnCancelCreate = document.getElementById("btn-cancel-create-announcement");

  const openCreateModal = (initialTitle = "") => {
    if (!createModal) return;
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
    createModal.classList.remove("hidden");
    if (initialTitle && contentCreateInput) {
      contentCreateInput.focus();
    } else if (titleCreateInput) {
      titleCreateInput.focus();
    }
  };

  const closeCreateModal = () => {
    if (createModal) {
      createModal.classList.add("hidden");
    }
  };

  if (btnCreateOpen) {
    btnCreateOpen.addEventListener("click", () => openCreateModal());
  }
  if (btnCloseCreate) {
    btnCloseCreate.addEventListener("click", closeCreateModal);
  }
  if (btnCancelCreate) {
    btnCancelCreate.addEventListener("click", closeCreateModal);
  }
  if (createModal) {
    createModal.addEventListener("click", (e) => {
      if (e.target === createModal) {
        closeCreateModal();
      }
    });
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
        closeCreateModal();
        if (navigate) {
          navigate("announcements");
        } else {
          window.location.reload();
        }
      }
    });
  }

  const editModal = document.getElementById("modal-announcement-edit");
  const formEdit = document.getElementById("form-edit-announcement");
  const idEditInput = document.getElementById("announcement-edit-id");
  const titleEditInput = document.getElementById("announcement-edit-title");
  const contentEditInput = document.getElementById("announcement-edit-content");
  const titleEditError = document.getElementById("announcement-edit-title-error");
  const contentEditError = document.getElementById("announcement-edit-content-error");
  const btnCloseEdit = document.getElementById("btn-close-edit-modal");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-announcement");

  const closeEditModal = () => {
    if (editModal) {
      editModal.classList.add("hidden");
    }
  };

  if (btnCloseEdit) btnCloseEdit.addEventListener("click", closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeEditModal);
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

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

      if (editModal) {
        editModal.classList.remove("hidden");
      }
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
        closeEditModal();
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
      openCreateModal(presetTitle);
    }
  } catch {
    // игнорируем ошибки sessionStorage при ограничениях среды
  }
}
