import { getCurrentUser, changePassword, logout } from '../services/storage.js';
import { getDefaultRouteForRole } from '../config/navigation.js';
import { renderIcon } from '../components/icons.js';
import { navigate } from '../services/navigation.js';

export function renderChangePasswordView() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return '';
  }

  return `
    <div class="w-full max-w-md mx-auto my-auto animate-fadeIn">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4 select-none">
          U
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Кабинет классного руководителя
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Смена временного пароля
        </p>
      </div>

      <div id="change-password-card" class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-9">
        <div class="flex items-start space-x-3 py-3 px-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs mb-6">
          <span class="flex-shrink-0 mt-0.5">${renderIcon('alert', 'w-4 h-4 text-amber-600')}</span>
          <span class="leading-tight">
            Вы вошли с временным паролем, выданным администратором.
            Установите постоянный пароль, чтобы продолжить работу.
          </span>
        </div>

        <form id="change-password-form" class="space-y-4" novalidate>
          <div>
            <label for="cp-current" class="block text-xs font-semibold text-slate-700 mb-1.5">Текущий (временный) пароль</label>
            <input type="password" id="cp-current" autocomplete="current-password"
                   class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
          </div>
          <div>
            <label for="cp-new" class="block text-xs font-semibold text-slate-700 mb-1.5">Новый пароль</label>
            <input type="password" id="cp-new" autocomplete="new-password" placeholder="Не менее 8 символов"
                   class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            <p class="text-[11px] text-slate-400 mt-1">Не короче 8 символов, буквы в обоих регистрах и хотя бы одна цифра.</p>
          </div>
          <div>
            <label for="cp-confirm" class="block text-xs font-semibold text-slate-700 mb-1.5">Повтор нового пароля</label>
            <input type="password" id="cp-confirm" autocomplete="new-password"
                   class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
          </div>

          <div id="cp-error-box" class="hidden py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <button type="submit" id="btn-cp-submit"
                  class="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all">
            Сохранить пароль
          </button>

          <div class="text-center pt-1">
            <button type="button" id="btn-cp-logout"
                    class="text-xs text-slate-500 hover:text-slate-700 hover:underline font-medium">
              Выйти из системы
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

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
