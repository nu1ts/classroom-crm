import { getCurrentUser, getDB } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";

function formatDateRu(isoDate) {
  if (!isoDate) return "";
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

export function renderAnnouncementsView() {
  const currentUser = getCurrentUser();
  const db = getDB();

  const isTeacher = currentUser && currentUser.role === "teacher";
  const isParent = currentUser && currentUser.role === "parent";
  const isStudent = currentUser && currentUser.role === "student";

  let targetClassId = "class-7b";
  if (isParent) {
    const child = (db.students || []).find((s) => s.id === currentUser.childStudentId);
    targetClassId = (child && child.classId) || currentUser.classId || "class-7b";
  } else if (currentUser && currentUser.classId) {
    targetClassId = currentUser.classId;
  }

  const className = targetClassId === "class-7b" ? "7Б" : "7Б";

  const announcements = (db.announcements || []).filter(
    (a) => (!a.classId || a.classId === targetClassId || a.target === "all") && a.status !== "deleted"
  );

  return `
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
        <div>
          <div class="flex items-center space-x-3">
            <h1 id="announcements-page-title" class="text-2xl font-black text-slate-900 tracking-tight">
              Объявления ${className}
            </h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              ${announcements.length} ${announcements.length === 1 ? "объявление" : announcements.length > 1 && announcements.length < 5 ? "объявления" : "объявлений"}
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
            : ""
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
              const hasRead =
                currentUser &&
                item.readBy &&
                (item.readBy.includes(currentUser.id) ||
                  (currentUser.childStudentId && item.readBy.includes(currentUser.childStudentId)));

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
                      прочитали ${Math.min(item.totalCount || 28, item.readCount || 0)} из ${item.totalCount || 28}
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

    <div id="modal-announcement-detail" class="hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200/90 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="space-y-1">
            <span id="modal-announcement-target" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              Адресовано классу ${className}
            </span>
            <h3 id="modal-announcement-title" class="text-base font-bold text-slate-900"></h3>
          </div>
          <button id="btn-close-announcement-modal" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="flex items-center justify-between text-2xs text-slate-400 font-semibold">
          <span id="modal-announcement-author" class="text-slate-600"></span>
          <span id="modal-announcement-date"></span>
        </div>

        <div id="modal-announcement-content" class="text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-line py-2">
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <span id="modal-announcement-reads" class="text-xs font-semibold text-slate-500"></span>
          <button id="btn-modal-dismiss" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  `;
}
