import { login, quickLoginAsRole, getCurrentUser, logout } from '../../services/storage.js';
import { getDefaultRouteForRole } from '../../config/navigation.js';
import { isDevMode } from '../../services/env.js';
import { renderIcon } from '../../components/icons.js';
import { navigate } from '../../services/navigation.js';

export function renderLoginView() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    const defRoute = getDefaultRouteForRole(currentUser.role);
    return `
      <div class="w-full max-w-md mx-auto my-auto animate-fadeIn">
        <div class="text-center mb-8">
          <div id="login-brand-logo"
               title="Томский государственный университет"
               class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4 select-none cursor-pointer hover:scale-105 transition-transform">
            U
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
            Кабинет классного руководителя
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Цифровой кабинет классного руководителя
          </p>
        </div>

        <div id="login-active-card" class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-9 text-center animate-fadeIn">
          <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-inner">
            ${renderIcon('user', 'w-7 h-7 text-brand-600')}
          </div>
          <h2 class="text-lg font-bold text-slate-800 mb-1.5">
            Сеанс уже активен
          </h2>
          <p class="text-xs text-slate-500 mb-5">
            Вы уже вошли в систему под учётной записью:
          </p>

          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-left mb-6">
            <div class="font-bold text-sm text-slate-900">${currentUser.shortName || currentUser.personName}</div>
            <div class="text-xs text-brand-600 font-semibold mt-0.5">${currentUser.roleLabel}</div>
            <div class="text-[11px] text-slate-400 mt-1">${currentUser.username}</div>
          </div>

          <div class="space-y-2.5">
            <a href="${defRoute}" id="btn-login-to-cabinet"
               class="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all text-center">
              <span>Перейти в кабинет</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <button type="button" id="btn-login-switch-user"
                    class="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors">
              Выйти и сменить пользователя
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const devModeActive = isDevMode();

  let devQuickLoginHtml = '';
  if (devModeActive) {
    devQuickLoginHtml = `
      <div class="mt-7 pt-5 border-t border-slate-100">
        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
          Быстрый вход
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
    `;
  }

  return `
    <div class="w-full max-w-md mx-auto my-auto animate-fadeIn">
      <div class="text-center mb-8">
        <div id="login-brand-logo"
             title="Томский государственный университет"
             class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4 select-none cursor-pointer hover:scale-105 transition-transform">
          U
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Кабинет классного руководителя
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Цифровой кабинет классного руководителя
        </p>
      </div>

      <div id="login-card" class="relative overflow-hidden bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-9 transition-all duration-200">
        <h2 class="text-lg font-bold text-slate-800 mb-6">
          Вход в систему
        </h2>

        <form id="login-form" class="space-y-4" novalidate>
          <div>
            <label for="login-email" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Логин
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
                      title="показать"
                      aria-label="показать"
                      data-action="toggle-password"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-brand-600 transition-colors rounded-lg">
                <span id="password-toggle-icon">
                  ${renderIcon('eye', 'w-4 h-4')}
                </span>
              </button>
            </div>
          </div>

          <div id="login-error-box" class="overflow-hidden transition-all duration-200 max-h-0 opacity-0 pointer-events-none mb-0">
            <div class="py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center space-x-2.5">
              <span class="flex-shrink-0">${renderIcon('alert', 'w-4 h-4 text-rose-600')}</span>
              <span id="login-error-text" class="font-medium leading-tight">Неверный логин или пароль</span>
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
              Забыли пароль?
            </button>
          </div>
        </form>

        ${devQuickLoginHtml}
      </div>
    </div>

    <div id="modal-forgot-password"
         class="fixed inset-0 w-screen h-screen bg-slate-900/50 backdrop-blur-sm !m-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ease-out opacity-0 pointer-events-none">
      <div id="modal-forgot-dialog"
           class="bg-white rounded-2xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all duration-200 ease-out scale-95">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-bold text-slate-900">Восстановление пароля</h3>
          <button type="button" id="btn-close-modal-forgot-x"
                  data-action="close-modal"
                  title="Закрыть"
                  class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed mb-4">
          Самостоятельный сброс пароля недоступен из соображений безопасности.
          Для сброса пароля обратитесь к администратору школы:
        </p>
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 mb-5">
          <div><span class="font-semibold text-slate-900">Администратор:</span> Никитин Пётр Алексеевич</div>
          <div><span class="font-semibold text-slate-900">Email:</span> admin@school.ru</div>
          <div><span class="font-semibold text-slate-900">Кабинет:</span> 201 (учительская)</div>
        </div>
        <button type="button" id="btn-close-modal-forgot"
                data-action="close-modal"
                class="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-sm">
          Понятно
        </button>
      </div>
    </div>
  `;
}
