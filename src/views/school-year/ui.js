import { renderIcon } from "../../components/icons.js";
let toastTimer = null;

export function showToast(message, isError = false) {
  const toast = document.getElementById("school-year-toast");
  const msgEl = document.getElementById("school-year-toast-message");
  const iconEl = document.getElementById("school-year-toast-icon");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) {
    iconEl.innerHTML = isError
      ? renderIcon("alert", "w-4 h-4 text-rose-400")
      : renderIcon("check", "w-4 h-4 text-emerald-400");
  }

  toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
  toast.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove(
      "opacity-100",
      "translate-y-0",
      "pointer-events-auto",
    );
    toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
  }, 3200);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  const dialog = document.getElementById(`${modalId}-dialog`);
  if (!modal) return;
  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100", "pointer-events-auto");
  if (dialog) {
    dialog.classList.remove("scale-95");
    dialog.classList.add("scale-100");
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const dialog = document.getElementById(`${modalId}-dialog`);
  if (!modal) return;
  modal.classList.remove("opacity-100", "pointer-events-auto");
  modal.classList.add("opacity-0", "pointer-events-none");
  if (dialog) {
    dialog.classList.remove("scale-100");
    dialog.classList.add("scale-95");
  }
}

export function closeAllModals() {
  [
    "modal-add-year",
    "modal-edit-year",
    "modal-edit-quarter",
    "modal-edit-vacation",
  ].forEach((id) => closeModal(id));
}
