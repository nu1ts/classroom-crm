import { getCurrentUser } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import {
  getAnnouncements,
  formatDateRu,
  DEMO_ANNOUNCEMENT_DATE,
} from "../../services/announcements-ops.js";

function pluralizeAnnouncements(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} объявлений`;
  if (mod10 === 1) return `${count} объявление`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} объявления`;
  return `${count} объявлений`;
}

export function renderAnnouncementsView() {
  const currentUser = getCurrentUser();

  const isTeacher = currentUser && currentUser.role === "teacher";
  const isParent = currentUser && currentUser.role === "parent";
  const isStudent = currentUser && currentUser.role === "student";

  let targetClassId = "class-7b";
  if (isParent) {
    targetClassId = currentUser.childClassId || currentUser.classId || "class-7b";
  } else if (currentUser && currentUser.classId) {
    targetClassId = currentUser.classId;
  }

  const rawClass = (currentUser && currentUser.className) || "7Б";
  const className = rawClass.replace(/\s*\([^)]*\)/g, "").replace(/\s*класс/i, "").trim() || "7Б";
  const announcements = getAnnouncements(targetClassId);
  const formattedToday = formatDateRu(DEMO_ANNOUNCEMENT_DATE);

  return `
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
        <div>
          <div class="flex items-center space-x-3">
            <h1 id="announcements-page-title" class="text-2xl font-black text-slate-900 tracking-tight">
              Объявления ${className}
            </h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              ${pluralizeAnnouncements(announcements.length)}
            </span>
          </div>
          <p id="announcements-page-subtitle" class="text-xs font-semibold text-slate-500 mt-1">
            Читают родители и ученики класса
          </p>
        </div>

        ${
          isTeacher
            ? `
          <button id="btn-create-announcement"
                  class="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer">
            ${renderIcon("plus", "w-4 h-4")}
            <span>Новое объявление</span>
          </button>
        `
            : `
          <span id="badge-readonly" class="badge-read-only inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            ${renderIcon("eye", "w-3.5 h-3.5 text-slate-500")}
            Только для просмотра
          </span>
        `
        }
      </div>

      ${
        announcements.length === 0
          ? `
        <div id="announcements-empty-state" class="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">
            ${
              isTeacher
                ? "Объявлений пока нет. Опубликуйте первое — его увидят родители и ученики класса"
                : "Объявлений пока нет"
            }
          </h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            ${
              isTeacher
                ? "Здесь будут отображаться важные сообщения и уведомления для родителей и учеников 7Б класса."
                : "Когда классный руководитель опубликует объявление, оно сразу появится в этой ленте."
            }
          </p>
        </div>
      `
          : `
        <div id="announcements-list" class="space-y-4">
          ${announcements
            .map((item) => {
              const dateStr = item.date.includes("-") ? formatDateRu(item.date) : item.date;
              const userIdentifier = (currentUser && (currentUser.id || currentUser.email)) || "";
              const isRecipient = currentUser && (currentUser.role === "parent" || currentUser.role === "student");
              const hasRead =
                isRecipient &&
                item.readBy &&
                (item.readBy.includes(userIdentifier) ||
                  (currentUser.childStudentId && item.readBy.includes(currentUser.childStudentId)));

              const currentReads = Math.min(item.totalCount || 28, item.readCount || 0);

              return `
              <article class="announcement-card bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 transition-all hover:border-slate-300 relative"
                       data-id="${item.id}">
                
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div class="space-y-1.5 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="announcement-target inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                        Адресовано классу ${className}
                      </span>
                      ${
                        hasRead
                          ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">Прочитано вами</span>`
                          : ""
                      }
                    </div>

                    <h2 class="announcement-title text-lg font-bold text-slate-900 tracking-tight leading-snug">
                      ${item.title}
                    </h2>
                  </div>

                  <div class="text-right shrink-0">
                    <span class="announcement-reads text-xs font-semibold text-slate-500 block">
                      прочитали ${currentReads} из ${item.totalCount || 28}
                    </span>
                    <span class="announcement-date text-[11px] text-slate-400 font-medium block mt-0.5">
                      ${dateStr}
                    </span>
                  </div>
                </div>

                <div class="announcement-text text-xs leading-relaxed text-slate-700 font-medium line-clamp-3 mb-4">
                  ${item.content}
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div class="flex items-center space-x-2 text-slate-500 font-medium text-[11px]">
                    <span class="announcement-author font-semibold text-slate-700">Автор: ${item.author || "Смирнова М. В."}</span>
                  </div>

                  <div class="flex items-center space-x-3">
                    <button type="button"
                            class="btn-read-full inline-flex items-center space-x-1 font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                            data-id="${item.id}">
                      <span>Читать полностью</span>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>

                    ${
                      isTeacher
                        ? `
                      <button type="button"
                              class="btn-edit-announcement text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              data-id="${item.id}">
                        Изменить
                      </button>
                      <button type="button"
                              class="btn-delete-announcement text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              data-id="${item.id}">
                        Удалить
                      </button>
                    `
                        : ""
                    }
                  </div>
                </div>
              </article>
            `;
            })
            .join("")}
        </div>
      `
      }
    </div>

    <div id="modal-announcement-detail"
         class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-announcement-detail-dialog"
           class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
          <div class="space-y-1">
            <span id="modal-announcement-target" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              Адресовано классу ${className}
            </span>
            <h3 id="modal-announcement-title" class="text-base font-bold text-slate-900"></h3>
          </div>
          <button id="btn-close-announcement-modal"
                  type="button"
                  class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Закрыть">
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <div class="flex items-center justify-between text-2xs text-slate-400 font-semibold shrink-0">
          <span id="modal-announcement-author" class="text-slate-600"></span>
          <span id="modal-announcement-date"></span>
        </div>

        <div id="modal-announcement-content" class="text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-line py-2 overflow-y-auto flex-1">
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <span id="modal-announcement-reads" class="text-xs font-semibold text-slate-500"></span>
          <button id="btn-modal-dismiss"
                  type="button"
                  class="btn-close-modal px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer">
            Закрыть
          </button>
        </div>
      </div>
    </div>

    <div id="modal-announcement-create"
         class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-announcement-create-dialog"
           class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              ${renderIcon("megaphone", "w-4 h-4")}
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Новое объявление</h3>
              <p class="text-xs text-slate-500 mt-0.5">Публикация для учеников и родителей</p>
            </div>
          </div>
          <button id="btn-close-create-modal"
                  type="button"
                  class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Закрыть">
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <form id="form-create-announcement" class="space-y-4 overflow-y-auto flex-1 pr-0.5" novalidate>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Класс
              </label>
              <input id="announcement-create-class"
                     type="text"
                     value="${className}"
                     disabled
                     class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed" />
            </div>
            <div>
              <label class="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Дата публикации
              </label>
              <input id="announcement-create-date"
                     type="text"
                     value="${formattedToday}"
                     disabled
                     class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label for="announcement-create-title" class="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Заголовок объявления <span class="text-rose-500">*</span>
            </label>
            <input id="announcement-create-title"
                   name="title"
                   type="text"
                   placeholder="Например, Организация дежурства"
                   class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
            <p id="announcement-title-error" class="hidden text-2xs text-rose-600 font-semibold mt-1"></p>
          </div>

          <div>
            <label for="announcement-create-content" class="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Текст объявления <span class="text-rose-500">*</span>
            </label>
            <textarea id="announcement-create-content"
                      name="content"
                      rows="4"
                      placeholder="Введите подробный текст объявления для учеников и родителей..."
                      class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"></textarea>
            <p id="announcement-content-error" class="hidden text-2xs text-rose-600 font-semibold mt-1"></p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 shrink-0">
            <button id="btn-cancel-create-announcement"
                    type="button"
                    class="btn-close-modal px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer">
              Отмена
            </button>
            <button id="btn-submit-create-announcement"
                    type="submit"
                    class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer">
              Опубликовать
            </button>
          </div>
        </form>
      </div>
    </div>

    <div id="modal-announcement-edit"
         class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-announcement-edit-dialog"
           class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              ${renderIcon("edit", "w-4 h-4")}
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Изменить объявление</h3>
              <p class="text-xs text-slate-500 mt-0.5">Редактирование темы и текста публикации</p>
            </div>
          </div>
          <button id="btn-close-edit-modal"
                  type="button"
                  class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Закрыть">
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <form id="form-edit-announcement" class="space-y-4 overflow-y-auto flex-1 pr-0.5" novalidate>
          <input type="hidden" id="announcement-edit-id" />

          <div>
            <label for="announcement-edit-title" class="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Заголовок объявления <span class="text-rose-500">*</span>
            </label>
            <input id="announcement-edit-title"
                   name="title"
                   type="text"
                   class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
            <p id="announcement-edit-title-error" class="hidden text-2xs text-rose-600 font-semibold mt-1"></p>
          </div>

          <div>
            <label for="announcement-edit-content" class="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Текст объявления <span class="text-rose-500">*</span>
            </label>
            <textarea id="announcement-edit-content"
                      name="content"
                      rows="4"
                      class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"></textarea>
            <p id="announcement-edit-content-error" class="hidden text-2xs text-rose-600 font-semibold mt-1"></p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 shrink-0">
            <button id="btn-cancel-edit-announcement"
                    type="button"
                    class="btn-close-modal px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer">
              Отмена
            </button>
            <button id="btn-submit-edit-announcement"
                    type="submit"
                    class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
