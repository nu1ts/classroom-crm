import { getCurrentUser, getDB, saveDB } from "../../services/storage.js";

function formatDateRu(isoDate) {
  if (!isoDate) return "";
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

export function setupAnnouncementsListeners(navigate) {
  const currentUser = getCurrentUser();
  const db = getDB();

  const modal = document.getElementById("modal-announcement-detail");
  const modalTitle = document.getElementById("modal-announcement-title");
  const modalContent = document.getElementById("modal-announcement-content");
  const modalAuthor = document.getElementById("modal-announcement-author");
  const modalDate = document.getElementById("modal-announcement-date");
  const modalReads = document.getElementById("modal-announcement-reads");

  const closeModal = () => {
    if (modal) {
      modal.classList.add("hidden");
    }
  };

  const btnClose = document.getElementById("btn-close-announcement-modal");
  if (btnClose) {
    btnClose.addEventListener("click", closeModal);
  }

  const btnDismiss = document.getElementById("btn-modal-dismiss");
  if (btnDismiss) {
    btnDismiss.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
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
        if (!Array.isArray(announcement.readBy)) {
          announcement.readBy = [];
        }

        const userKey = currentUser.id || currentUser.email;
        if (!announcement.readBy.includes(userKey)) {
          announcement.readBy.push(userKey);
          announcement.readCount = announcement.readBy.length;
          saveDB(currentDB);

          const card = document.querySelector(`.announcement-card[data-id="${id}"]`);
          if (card) {
            const readsEl = card.querySelector(".announcement-reads");
            if (readsEl) {
              readsEl.textContent = `прочитали ${announcement.readCount} из ${announcement.totalCount || 28}`;
            }
          }
        }
      }

      if (modal && modalTitle && modalContent) {
        modalTitle.textContent = announcement.title;
        modalContent.textContent = announcement.content;
        if (modalAuthor) modalAuthor.textContent = `Автор: ${announcement.author || "Смирнова М. В."}`;
        if (modalDate) {
          modalDate.textContent = announcement.date.includes("-")
            ? formatDateRu(announcement.date)
            : announcement.date;
        }
        if (modalReads) {
          modalReads.textContent = `прочитали ${announcement.readCount || 0} из ${announcement.totalCount || 28}`;
        }
        modal.classList.remove("hidden");
      }
    });
  });

  document.querySelectorAll(".btn-delete-announcement").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (window.confirm("Удалить объявление?")) {
        const currentDB = getDB();
        currentDB.announcements = (currentDB.announcements || []).filter((a) => a.id !== id);
        saveDB(currentDB);
        if (navigate) {
          navigate("announcements");
        } else {
          window.location.reload();
        }
      }
    });
  });
}
