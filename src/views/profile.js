import { getCurrentUser, changePassword, logout, clearSession } from '../services/storage.js';
import { renderIcon } from '../components/icons.js';
import { navigate } from '../services/navigation.js';

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
      <div class="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-7 sm:p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-slate-900">
            Мой профиль
          </h2>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Активен
          </span>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">ФИО</label>
            <input type="text" value="${user.personName || user.shortName}" readonly
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 cursor-not-allowed select-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">
                Роль в системе
              </label>
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
              <div class="relative">
                <select id="profile-lang-select" class="appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer transition-all">
                  <option value="ru" selected>Русский</option>
                  <option value="en">English (US)</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon('chevron-down', 'w-4 h-4')}
                </div>
              </div>
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
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            </div>

            <div>
              <label for="pwd-new" class="block text-xs font-semibold text-slate-700 mb-1">Новый пароль</label>
              <input type="password" id="pwd-new" required
                     placeholder="Введите новый пароль (не менее 8 символов)"
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            </div>

            <div>
              <label for="pwd-confirm" class="block text-xs font-semibold text-slate-700 mb-1">Подтверждение пароля</label>
              <input type="password" id="pwd-confirm" required
                     placeholder="Подтвердите новый пароль"
                     class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            </div>

            <div class="flex justify-end pt-1">
              <button type="submit" id="btn-save-password"
                      class="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>

        <div class="my-8 border-t border-slate-100"></div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <div class="text-xs font-semibold text-slate-700">Сеанс пользователя</div>
            <p class="text-[11px] text-slate-400 mt-0.5">Завершить сеанс на этом устройстве</p>
          </div>
          <button type="button" id="btn-profile-logout"
                  class="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs">
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
