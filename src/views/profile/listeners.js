import { getCurrentUser, changePassword, logout, clearSession } from '../../services/storage.js';
import { renderIcon } from '../../components/icons.js';
import { navigate } from '../../services/navigation.js';

export function setupProfileListeners(onNavigate) {
  const user = getCurrentUser();
  if (!user) return;

  const form = document.getElementById('profile-password-form');
  const currentPwdInput = document.getElementById('pwd-current');
  const newPwdInput = document.getElementById('pwd-new');
  const confirmPwdInput = document.getElementById('pwd-confirm');
  const feedback = document.getElementById('password-feedback');

  [currentPwdInput, newPwdInput, confirmPwdInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('blur', () => {
        inp.value = inp.value.trim();
      });
      inp.addEventListener('change', () => {
        inp.value = inp.value.trim();
      });
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (currentPwdInput) currentPwdInput.value = currentPwdInput.value.trim();
      if (newPwdInput) newPwdInput.value = newPwdInput.value.trim();
      if (confirmPwdInput) confirmPwdInput.value = confirmPwdInput.value.trim();

      const res = changePassword(
        user.id,
        currentPwdInput ? currentPwdInput.value : '',
        newPwdInput ? newPwdInput.value : '',
        confirmPwdInput ? confirmPwdInput.value : ''
      );

      feedback.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'border');

      if (res.success) {
        feedback.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
        feedback.textContent = res.message;
        form.reset();
      } else {
        feedback.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
        feedback.textContent = res.error;
      }
    });
  }

  const logoutBtn = document.getElementById('btn-profile-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Вы действительно хотите выйти из системы?')) {
        try {
          if (typeof logout === 'function') logout();
          else if (typeof clearSession === 'function') clearSession();
        } catch (err) {
          console.error('Logout error:', err);
        }
        navigate('/login');
      }
    });
  }
}
