import {
  login,
  quickLoginAsRole,
  getCurrentUser,
  logout,
} from "../../services/storage.js";
import { getDefaultRouteForRole } from "../../config/navigation.js";
import { isDevMode } from "../../services/env.js";
import { renderIcon } from "../../components/icons.js";
import { navigate } from "../../services/navigation.js";

export function setupLoginListeners(onLoginSuccess) {
  const currentUser = getCurrentUser();
  if (currentUser) {
    const toCabinetBtn = document.getElementById("btn-login-to-cabinet");
    if (toCabinetBtn) {
      toCabinetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const defRoute = getDefaultRouteForRole(currentUser.role);
        navigate(defRoute);
      });
    }

    const switchBtn = document.getElementById("btn-login-switch-user");
    if (switchBtn) {
      switchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
        navigate("/login");
      });
    }
    return;
  }

  const form = document.getElementById("login-form");
  const card = document.getElementById("login-card");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("login-error-box");
  const errorText = document.getElementById("login-error-text");
  const toggleBtn = document.getElementById("btn-toggle-password");
  const toggleIcon = document.getElementById("password-toggle-icon");

  function clearError() {
    if (errorBox) {
      errorBox.classList.remove(
        "max-h-16",
        "opacity-100",
        "pointer-events-auto",
        "mb-3",
      );
      errorBox.classList.add(
        "max-h-0",
        "opacity-0",
        "pointer-events-none",
        "mb-0",
      );
    }
    if (passwordInput) {
      passwordInput.classList.remove(
        "border-rose-400",
        "ring-2",
        "ring-rose-400/20",
      );
    }
    if (emailInput) {
      emailInput.classList.remove(
        "border-rose-400",
        "ring-2",
        "ring-rose-400/20",
      );
    }
  }

  function showError(msg, field = "password") {
    if (errorBox && errorText) {
      errorText.textContent = msg;
      errorBox.classList.remove(
        "max-h-0",
        "opacity-0",
        "pointer-events-none",
        "mb-0",
      );
      errorBox.classList.add(
        "max-h-16",
        "opacity-100",
        "pointer-events-auto",
        "mb-3",
      );
    }

    if (field === "password" && passwordInput) {
      passwordInput.classList.add(
        "border-rose-400",
        "ring-2",
        "ring-rose-400/20",
      );
    } else if (field === "both") {
      if (emailInput)
        emailInput.classList.add(
          "border-rose-400",
          "ring-2",
          "ring-rose-400/20",
        );
      if (passwordInput)
        passwordInput.classList.add(
          "border-rose-400",
          "ring-2",
          "ring-rose-400/20",
        );
    }

    if (card) {
      card.classList.remove("animate-shake");
      void card.offsetWidth;
      card.classList.add("animate-shake");
    }
  }

  if (emailInput) {
    emailInput.addEventListener("input", clearError);
    emailInput.addEventListener("blur", () => {
      emailInput.value = emailInput.value.trim();
    });
    emailInput.addEventListener("change", () => {
      emailInput.value = emailInput.value.trim();
    });
  }
  if (passwordInput) {
    passwordInput.addEventListener("input", clearError);
    passwordInput.addEventListener("blur", () => {
      passwordInput.value = passwordInput.value.trim();
    });
    passwordInput.addEventListener("change", () => {
      passwordInput.value = passwordInput.value.trim();
    });
  }

  if (toggleBtn && passwordInput && toggleIcon) {
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentType = passwordInput.getAttribute("type");
      if (currentType === "password") {
        passwordInput.setAttribute("type", "text");
        toggleBtn.setAttribute("title", "скрыть");
        toggleBtn.setAttribute("aria-label", "скрыть");
        toggleIcon.innerHTML = renderIcon("eye-off", "w-4 h-4 text-brand-600");
      } else {
        passwordInput.setAttribute("type", "password");
        toggleBtn.setAttribute("title", "показать");
        toggleBtn.setAttribute("aria-label", "показать");
        toggleIcon.innerHTML = renderIcon("eye", "w-4 h-4");
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (getCurrentUser()) {
        showError(
          "Сеанс уже активен. Сначала завершите текущий сеанс для смены пользователя.",
          "both",
        );
        return;
      }

      if (emailInput) emailInput.value = emailInput.value.trim();
      if (passwordInput) passwordInput.value = passwordInput.value.trim();
      const username = emailInput ? emailInput.value : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!username || !password) {
        showError(
          "Заполните логин и пароль",
          !username && !password ? "both" : !username ? "email" : "password",
        );
        return;
      }

      const res = login(username, password);
      if (!res.success) {
        showError(res.error || "Неверный логин или пароль", "password");
        if (passwordInput) {
          passwordInput.value = "";
          passwordInput.focus();
        }
        return;
      }

      if (res.mustChangePassword) {
        navigate("/change-password");
        return;
      }

      const defRoute = getDefaultRouteForRole(res.user.role);
      navigate(defRoute);
    });
  }

  const demoButtons = document.querySelectorAll(".demo-role-btn");
  demoButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const roleKey = btn.getAttribute("data-demo-role");
      const user = quickLoginAsRole(roleKey);
      if (user) {
        const defRoute = getDefaultRouteForRole(user.role);
        navigate(defRoute);
      }
    });
  });

  const forgotBtn = document.getElementById("btn-forgot-password");
  const modalForgot = document.getElementById("modal-forgot-password");
  const modalDialog = document.getElementById("modal-forgot-dialog");
  const closeForgotBtn = document.getElementById("btn-close-modal-forgot");
  const closeForgotX = document.getElementById("btn-close-modal-forgot-x");

  function openModal() {
    if (!modalForgot) return;
    modalForgot.classList.remove("opacity-0", "pointer-events-none");
    modalForgot.classList.add("opacity-100", "pointer-events-auto");
    if (modalDialog) {
      modalDialog.classList.remove("scale-95");
      modalDialog.classList.add("scale-100");
    }
  }

  function closeModal() {
    if (!modalForgot) return;
    modalForgot.classList.remove("opacity-100", "pointer-events-auto");
    modalForgot.classList.add("opacity-0", "pointer-events-none");
    if (modalDialog) {
      modalDialog.classList.remove("scale-100");
      modalDialog.classList.add("scale-95");
    }
  }

  if (forgotBtn) forgotBtn.addEventListener("click", openModal);
  if (closeForgotBtn) closeForgotBtn.addEventListener("click", closeModal);
  if (closeForgotX) closeForgotX.addEventListener("click", closeModal);
  if (modalForgot) {
    modalForgot.addEventListener("click", (e) => {
      if (e.target === modalForgot) closeModal();
    });
  }
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modalForgot &&
      !modalForgot.classList.contains("pointer-events-none")
    ) {
      closeModal();
    }
  });
}
