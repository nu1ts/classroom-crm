import { login, quickLoginAsRole } from '../services/storage.js';
import { getDefaultRouteForRole } from '../config/navigation.js';
import { renderIcon } from '../components/icons.js';

export function renderLoginView() {
  return `
    <div class="w-full max-w-md mx-auto my-auto animate-fadeIn">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4">
          В
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Кабинет классного руководителя
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Цифровой кабинет классного руководителя
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-9">
        <h2 class="text-lg font-bold text-slate-800 mb-6">
          Вход в систему
        </h2>
        <div id="login-error-box" class="hidden mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
          <span class="flex-shrink-0 mt-0.5">${renderIcon('alert', 'w-4 h-4 text-rose-600')}</span>
          <span id="login-error-text">Неверный логин или пароль</span>
        </div>

        <form id="login-form" class="space-y-4" novalidate>
          <div>
            <label for="login-email" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Логин (электронная почта)
            </label>
            <input type="email" id="login-email" name="username"
                   placeholder="Введите логин"
                   autocomplete="username"
                   class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 text-slate-800" />
          </div>

          <div>
            <label for="login-password" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Пароль
            </label>
            <div class="relative">
              <input type="password" id="login-password" name="password"
                     placeholder="••••••••"
                     autocomplete="current-password"
                     class="w-full pl-3.5 pr-12 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 text-slate-800" />
              <button type="button" id="btn-toggle-password"
                      title="Показать / скрыть пароль"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                <span id="password-toggle-icon">
                  ${renderIcon('eye', 'w-4 h-4')}
                </span>
              </button>
            </div>
          </div>

          <div class="pt-2">
            <button type="submit" id="btn-login-submit"
                    class="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all duration-150">
              Войти
            </button>
          </div>

          <div class="text-center pt-2">
            <button type="button" id="btn-forgot-password"
                    class="text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium">
              Забыли пароль? Обратитесь к администратору школы
            </button>
          </div>
        </form>

        <div class="mt-8 pt-6 border-t border-slate-100">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Быстрый вход для демонстрации ролей
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button type="button" data-demo-role="teacher"
                    class="demo-role-btn px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 font-medium text-left transition-colors">
              👩‍🏫 Классрук (7Б)
            </button>
            <button type="button" data-demo-role="subject_teacher"
                    class="demo-role-btn px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 font-medium text-left transition-colors">
              📐 Предметник
            </button>
            <button type="button" data-demo-role="parent"
                    class="demo-role-btn px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 font-medium text-left transition-colors">
              👨‍👦 Родитель
            </button>
            <button type="button" data-demo-role="student"
                    class="demo-role-btn px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 font-medium text-left transition-colors">
              🎒 Ученик
            </button>
            <button type="button" data-demo-role="admin"
                    class="demo-role-btn col-span-2 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 font-medium text-center transition-colors">
              🛡️ Администратор школы
            </button>
          </div>
        </div>
      </div>

      <div id="modal-forgot-password" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
          <h3 class="text-base font-bold text-slate-900 mb-2">Восстановление пароля</h3>
          <p class="text-xs text-slate-600 leading-relaxed mb-4">
            Самостоятельный сброс пароля недоступен из соображений безопасности.
            Для сброса пароля обратитесь к администратору школы:
          </p>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 mb-5">
            <div><span class="font-semibold">Администратор:</span> Никитин Пётр Алексеевич</div>
            <div><span class="font-semibold">Email:</span> admin@school.ru</div>
            <div><span class="font-semibold">Кабинет:</span> 201 (учительская)</div>
          </div>
          <button type="button" id="btn-close-modal-forgot"
                  class="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors">
            Понятно
          </button>
        </div>
      </div>
    </div>
  `;
}

export function setupLoginListeners(onLoginSuccess) {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error-box');
  const errorText = document.getElementById('login-error-text');
  const toggleBtn = document.getElementById('btn-toggle-password');
  const toggleIcon = document.getElementById('password-toggle-icon');

  if (toggleBtn && passwordInput && toggleIcon) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentType = passwordInput.getAttribute('type');
      if (currentType === 'password') {
        passwordInput.setAttribute('type', 'text');
        toggleIcon.innerHTML = renderIcon('eye-off', 'w-4 h-4 text-brand-600');
      } else {
        passwordInput.setAttribute('type', 'password');
        toggleIcon.innerHTML = renderIcon('eye', 'w-4 h-4');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = emailInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showError('Заполните логин и пароль');
        return;
      }

      const res = login(username, password);
      if (!res.success) {
        showError(res.error || 'Неверный логин или пароль');
        passwordInput.value = '';
        passwordInput.focus();
        return;
      }
      const defRoute = getDefaultRouteForRole(res.user.role);
      window.location.hash = defRoute;
      if (onLoginSuccess) onLoginSuccess(res.user, defRoute);
    });
  }

  const demoButtons = document.querySelectorAll('.demo-role-btn');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const roleKey = btn.getAttribute('data-demo-role');
      const user = quickLoginAsRole(roleKey);
      if (user) {
        const defRoute = getDefaultRouteForRole(user.role);
        window.location.hash = defRoute;
        if (onLoginSuccess) onLoginSuccess(user, defRoute);
      }
    });
  });

  const forgotBtn = document.getElementById('btn-forgot-password');
  const modalForgot = document.getElementById('modal-forgot-password');
  const closeForgotBtn = document.getElementById('btn-close-modal-forgot');

  if (forgotBtn && modalForgot) {
    forgotBtn.addEventListener('click', () => {
      modalForgot.classList.remove('hidden');
    });
  }
  if (closeForgotBtn && modalForgot) {
    closeForgotBtn.addEventListener('click', () => {
      modalForgot.classList.add('hidden');
    });
  }

  function showError(msg) {
    if (errorBox && errorText) {
      errorText.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  }
}
