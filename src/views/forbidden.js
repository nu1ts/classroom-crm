import { getCurrentUser } from "../services/storage.js";
import { getDefaultRouteForRole } from "../config/navigation.js";
import { renderIcon } from "../components/icons.js";

export function renderForbiddenView() {
  const user = getCurrentUser();
  const returnRoute = user ? getDefaultRouteForRole(user.role) : "/login";

  return `
    <div class="max-w-md mx-auto my-12 text-center animate-fadeIn p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
        ${renderIcon("alert", "w-7 h-7")}
      </div>
      <h2 class="text-xl font-bold text-slate-900 mb-2">
        Доступ ограничен
      </h2>
      <p class="text-xs text-slate-600 leading-relaxed mb-6">
        У вас нет прав для просмотра данного раздела или объекта системы.
      </p>
      <a href="${returnRoute}"
         class="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-sm">
        Вернуться в свой раздел
      </a>
    </div>
  `;
}
