import { getCurrentUser, changePassword, logout } from '../../services/storage.js';
import { getDefaultRouteForRole } from '../../config/navigation.js';
import { renderIcon } from '../../components/icons.js';
import { navigate } from '../../services/navigation.js';

export function setupChangePasswordListeners(onNavigate) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const form = document.getElementById('change-password-form');
  const errorBox = document.getElementById('cp-error-box');

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const current = (document.getElementById('cp-current') || {}).value || '';
      const next = (document.getElementById('cp-new') || {}).value || '';
      const confirm = (document.getElementById('cp-confirm') || {}).value || '';

      const res = changePassword(currentUser.id, current, next, confirm, true);
      if (!res.success) {
        showError(res.error);
        return;
      }

      const defRoute = getDefaultRouteForRole(currentUser.role);
      navigate(defRoute);
    });
  }

  const logoutBtn = document.getElementById('btn-cp-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      navigate('/login');
    });
  }
}
