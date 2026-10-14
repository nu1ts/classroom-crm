import { getCurrentUser, changePassword, logout } from '../services/storage.js';
import { renderIcon } from '../components/icons.js';

export function renderProfileView() {
  const user = getCurrentUser();
  if (!user) return '';

  let bindingText = user.className || user.classId || 'Школа';
  if (user.role === 'teacher') {
    bindingText = '7Б';
  } else if (user.role === 'subject_teacher') {
    bindingText = `Учитель: ${user.shortName} (${user.subject})`;
  } else if (user.role === 'parent') {
    bindingText = user.childName || 'Петрова Анна (7Б)';
  } else if (user.role === 'student') {
    bindingText = 'Ученик 7Б класса';
  } else if (user.role === 'admin') {
    bindingText = 'Администрация школы';
  }

  return `
    <div class="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-7 sm:p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-6">
          Мой профиль
        </h2>

        <div class="space-y-4">
          <!-- ФИО -->
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">ФИО</label>
            <input type="text" value="${user.personName || user.shortName}" readonly
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 cursor-not-allowed select-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Роль в системе</label>
              <input type="text" value="${user.roleLabel}" readonly
                     class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 cursor-not-allowed select-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">
                ${user.role === 'teacher' ? 'Курируемый класс' : 'Привязка'}
              </label>
              <input type="text" value="${bindingText}" readonly
                     class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 cursor-not-allowed select-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Логин</label>
              <input type="text" value="${user.username}" readonly
                     class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 cursor-not-allowed select-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Язык интерфейса</label>
              <select id="profile-lang-select" class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="ru" selected>Русский</option>
                <option value="en">English (US)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="my-8 border-t border-slate-100"></div>

        <div>
          <h3 class="text-base font-bold text-slate-900 mb-4">
            Смена пароля
          </h3>

          <div id="password-feedback" class="hidden mb-4 p-3 rounded-xl text-xs flex items-center space-x-2"></div>

          <form id="profile-password-form" class="space-y-4">
            <div>
              <label for="pwd-current" class="block text-xs font-semibold text-slate-700 mb-1">Текущий пароль</label>
              <input type="password" id="pwd-current" required
                     placeholder="Введите текущий пароль"
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>

            <div>
              <label for="pwd-new" class="block text-xs font-semibold text-slate-700 mb-1">Новый пароль</label>
              <input type="password" id="pwd-new" required
                     placeholder="Введите новый пароль (не менее 8 символов)"
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>

            <div>
              <label for="pwd-confirm" class="block text-xs font-semibold text-slate-700 mb-1">Подтверждение пароля</label>
              <input type="password" id="pwd-confirm" required
                     placeholder="Подтвердите новый пароль"
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>

            <div>
              <button type="submit" id="btn-save-password"
                      class="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-sm transition-colors">
                Сохранить
              </button>
            </div>
          </form>
        </div>

        <div class="my-8 border-t border-slate-100"></div>

        <div>
          <button type="button" id="btn-profile-logout"
                  class="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-sm transition-colors flex items-center justify-center space-x-2">
            ${renderIcon('logout', 'w-4 h-4')}
            <span>Выйти из системы</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function setupProfileListeners(onNavigate) {
  const user = getCurrentUser();
  if (!user) return;

  const form = document.getElementById('profile-password-form');
  const currentPwdInput = document.getElementById('pwd-current');
  const newPwdInput = document.getElementById('pwd-new');
  const confirmPwdInput = document.getElementById('pwd-confirm');
  const feedback = document.getElementById('password-feedback');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = changePassword(
        user.id,
        currentPwdInput.value,
        newPwdInput.value,
        confirmPwdInput.value
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
        logout();
        window.location.replace('#/login');
        if (onNavigate) onNavigate('#/login');
      }
    });
  }
}
