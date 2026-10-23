import { ACCOUNT_ROLE_LABELS, ROLE_OPTIONS, escapeHtml } from "./helpers.js";
import { renderIcon } from "../../components/icons.js";
import { getDB } from "../../services/storage.js";

export function renderAccountsView(options = {}) {
  const db = getDB();
  const currentUser = db.users.find(
    (u) => u.id === (options.currentUserId || ""),
  );

  const searchQuery = (options.searchQuery || "").trim();
  const filterRole = options.filterRole || "all";

  const rows = (db.users || []).map((user) => ({
    user,
    isSelf: Boolean(currentUser && currentUser.id === user.id),
  }));

  const activeCount = rows.filter((r) => r.user.status === "active").length;
  const blockedCount = rows.length - activeCount;

  const roleFilterOptions = ROLE_OPTIONS.map(
    (role) => `
    <option value="${role}" ${filterRole === role ? "selected" : ""}>${ACCOUNT_ROLE_LABELS[role]}</option>
  `,
  ).join("");

  const roleSelectOptions = ROLE_OPTIONS.map(
    (role) => `
    <option value="${role}">${ACCOUNT_ROLE_LABELS[role]}</option>
  `,
  ).join("");

  return `
    <div id="accounts-view" class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Учётные записи</h1>
          <p class="text-sm font-medium text-slate-500 mt-1" id="accounts-total-subtitle">
            ${rows.length} учётных записей · ${activeCount} активных · ${blockedCount} заблокированных
          </p>
        </div>

        <div>
          <button type="button" id="btn-open-create-account"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon("user-plus", "w-4 h-4")}
            <span>Создать учётную запись</span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("search", "w-4 h-4")}
          </div>
          <input type="text" id="input-accounts-search" value="${escapeHtml(searchQuery)}"
                 placeholder="Поиск по ФИО или логину..."
                 autocomplete="off"
                 style="padding-left: 2.75rem; padding-right: 2.25rem;"
                 class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
          <button type="button" id="btn-clear-accounts-search" title="Очистить поиск"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? "" : "hidden"} cursor-pointer">
            ${renderIcon("x", "w-3.5 h-3.5")}
          </button>
        </div>

        <div class="relative md:ml-auto">
          <select id="select-accounts-role"
                  style="padding-left: 0.875rem; padding-right: 2.25rem;"
                  class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer md:w-48">
            <option value="all" ${filterRole === "all" ? "selected" : ""}>Все роли</option>
            ${roleFilterOptions}
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("chevron-down", "w-4 h-4")}
          </div>
        </div>
      </div>

      <div id="accounts-table-wrapper"></div>

      <div id="modal-create-account" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-create-account-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Создать учётную запись</h3>
            <button type="button" data-action="close-create-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Пользователь обязан сменить временный пароль при первом входе.</p>

          <div class="space-y-3.5">
            <div>
              <label for="input-create-name" class="block text-xs font-semibold text-slate-700 mb-1.5">ФИО пользователя</label>
              <input type="text" id="input-create-name" placeholder="Например: Иванова Елена Сергеевна"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>
            <div>
              <label for="input-create-login" class="block text-xs font-semibold text-slate-700 mb-1.5">Логин (электронная почта)</label>
              <input type="email" id="input-create-login" placeholder="ivanova.e@school.ru"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>
            <div>
              <label for="select-create-role" class="block text-xs font-semibold text-slate-700 mb-1.5">Роль</label>
              <div class="relative">
                <select id="select-create-role"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                  ${roleSelectOptions}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>
            <div>
              <label for="input-create-password" class="block text-xs font-semibold text-slate-700 mb-1.5">Временный пароль</label>
              <input type="text" id="input-create-password" placeholder="Не менее 8 символов, буквы обоих регистров и цифра"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400 font-mono" />
              <p class="text-[11px] text-slate-400 mt-1">Требования: не короче 8 символов, буквы в обоих регистрах и хотя бы одна цифра.</p>
            </div>
          </div>

          <div id="create-account-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-create-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-create-account"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Создать</button>
          </div>
        </div>
      </div>

      <div id="modal-edit-account" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-account-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900">Изменить учётную запись</h3>
            <button type="button" data-action="close-edit-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4">Смена роли применяется при следующем входе пользователя в систему.</p>

          <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-700 space-y-1 mb-4">
            <div><span class="font-semibold text-slate-900">ФИО:</span> <span id="edit-account-name">—</span></div>
            <div><span class="font-semibold text-slate-900">Логин:</span> <span id="edit-account-login" class="font-mono">—</span></div>
            <div><span class="font-semibold text-slate-900">Привязка:</span> <span id="edit-account-binding">—</span></div>
          </div>

          <div>
            <label for="select-edit-role" class="block text-xs font-semibold text-slate-700 mb-1.5">Роль</label>
            <div class="relative">
              <select id="select-edit-role"
                      class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                ${roleSelectOptions}
              </select>
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-4 h-4")}
              </div>
            </div>
          </div>

          <div id="edit-binding-block" class="mt-3.5">
            <label for="select-edit-binding" class="block text-xs font-semibold text-slate-700 mb-1.5">Учётная карточка</label>
            <div class="flex items-stretch space-x-2">
              <div class="relative flex-1">
                <select id="select-edit-binding"
                        class="appearance-none w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer">
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
              <button type="button" id="btn-unlink-account" title="Отвязать учётную карточку"
                      class="px-3.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap">Отвязать</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Каждая учётная карточка может быть связана только с одной учётной записью.</p>
          </div>

          <div id="edit-account-error" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium"></div>

          <div class="flex items-center justify-end space-x-2.5 mt-5">
            <button type="button" data-action="close-edit-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer">Отмена</button>
            <button type="button" id="btn-submit-edit-account"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">Сохранить</button>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold text-slate-700">Сброс пароля</div>
                <div class="text-[11px] text-slate-400 mt-0.5">Будет выдан временный пароль, обязательный к смене при первом входе.</div>
              </div>
              <button type="button" id="btn-reset-account-password"
                      class="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap">Сбросить пароль</button>
            </div>
            <div id="reset-password-result" class="hidden mt-3 py-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium"></div>
          </div>
        </div>
      </div>

      <div id="accounts-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="accounts-toast-icon">${renderIcon("check", "w-4 h-4 text-emerald-400")}</span>
        <span id="accounts-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}
