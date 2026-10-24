import { getCurrentUser, getDB } from "../../services/storage.js";
import { getMeetingSummary } from "../../services/meetings-ops.js";
import { renderIcon } from "../../components/icons.js";
import {
  getMeetings,
  canMarkAttendance,
  ATTENDANCE_STATUSES,
  ATTENDANCE_LABELS,
} from "../../services/meetings-ops.js";

/**
 * Форматирование даты в русскую локаль (DD.MM.YYYY)
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatDateRu(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

/**
 * Рендер основной разметки раздела «Собрания»
 * @param {object} [options]
 * @returns {string}
 */
export function renderMeetingsView(options = {}) {
  const currentUser = getCurrentUser();
  const classId = (currentUser && currentUser.classId) || "class-7b";
  const rawClassName = (currentUser && currentUser.className) || (classId.includes("8a") ? "8А" : "7Б");
  const className = rawClassName.replace(/\s*\([^)]*\)/g, "").replace(/\s*класс/i, "").trim() || "7Б";
  const db = getDB();
  const classStudents = (db.students || []).filter(
    (s) => (!s.classId || s.classId === classId) && !s.archived
  );
  const totalStudents = classStudents.length || 28;

  const { nextMeeting, otherUpcoming, pastMeetings } = getMeetings(classId);

  return `
    <div id="meetings-view" class="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90">
        <div>
          <div class="flex items-center space-x-3">
            <h1 id="meetings-page-title" class="text-2xl font-black text-slate-900 tracking-tight">
              Родительские собрания ${className}
            </h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/70">
              ${(nextMeeting ? 1 : 0) + otherUpcoming.length + pastMeetings.length} в учебном году
            </span>
          </div>
          <p id="meetings-page-subtitle" class="text-xs font-semibold text-slate-500 mt-1">
            Планирование встреч, повестка, протоколы и фиксация явки родителей
          </p>
        </div>

        <div>
          <button
            id="btn-create-meeting"
            class="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            ${renderIcon("plus", "w-4 h-4 text-white")}
            <span>Создать собрание</span>
          </button>
        </div>
      </div>

      ${renderNextMeetingSection(nextMeeting)}

      ${otherUpcoming.length > 0 ? renderOtherUpcomingSection(otherUpcoming) : ""}

      ${renderPastMeetingsSection(pastMeetings)}

      ${renderMeetingFormModal()}
      ${renderCancelMeetingModal()}
      ${renderAttendanceModal()}
      ${renderSummaryModal()}
    </div>
  `;
}

/**
 * Карточка ближайшего собрания
 * @param {object|null} meeting
 * @returns {string}
 */
function renderNextMeetingSection(meeting) {
  if (!meeting) {
    return `
      <div id="section-next-meeting" class="bg-white rounded-3xl p-10 border border-slate-200/90 shadow-xs text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          ${renderIcon("calendar", "w-7 h-7")}
        </div>
        <h3 class="text-base font-bold text-slate-900">Нет запланированных собраний</h3>
        <p class="text-xs font-medium text-slate-500 max-w-sm mx-auto">
          Нажмите кнопку «Создать собрание», чтобы назначить дату, время и сформировать повестку встречи.
        </p>
      </div>
    `;
  }

  const agendaList = Array.isArray(meeting.agendaItems) && meeting.agendaItems.length > 0
    ? meeting.agendaItems
    : (meeting.agenda ? [meeting.agenda] : []);

  const dateRu = formatDateRu(meeting.date);

  return `
    <div id="section-next-meeting" class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-300"></div>

      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
        <div class="space-y-3 flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/70">
              Ближайшее собрание
            </span>
            <span class="text-xs text-slate-400 font-semibold">Класс ${meeting.className ? meeting.className.replace(/\s*\([^)]*\)/g, "").replace(/\s*класс/i, "").trim() : "7Б"}</span>
          </div>

          <div>
            <h2 id="next-meeting-title" class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ${meeting.title}
            </h2>
            <div class="flex flex-wrap items-center gap-3.5 mt-2.5 text-xs text-slate-600 font-medium">
              <span class="flex items-center gap-1.5 font-bold text-slate-900">
                ${renderIcon("calendar", "w-4 h-4 text-brand-600")}
                <span id="next-meeting-datetime">${dateRu}, ${meeting.time}</span>
              </span>
              <span class="text-slate-300">&bull;</span>
              <span class="flex items-center gap-1.5 font-semibold text-slate-700">
                ${renderIcon("mapPin", "w-4 h-4 text-brand-600")}
                <span id="next-meeting-room">${meeting.room || "Каб. 302"}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 pt-0.5">
          <button
            class="btn-edit-meeting inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            data-meeting-id="${meeting.id}"
            title="Редактировать параметры и повестку"
          >
            ${renderIcon("edit", "w-3.5 h-3.5 text-slate-600")}
            <span>Изменить</span>
          </button>

          <a
            href="announcements"
            data-meeting-title="${meeting.title}"
            class="btn-publish-announcement inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            ${renderIcon("megaphone", "w-3.5 h-3.5 text-brand-600")}
            <span>Опубликовать объявление</span>
          </a>

          <div class="relative inline-block text-left meeting-menu-container">
            <button
              class="btn-meeting-menu p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Дополнительные действия"
              data-meeting-id="${meeting.id}"
            >
              ${renderIcon("more-vertical", "w-4 h-4")}
            </button>
            <div
              class="meeting-menu-dropdown hidden absolute right-0 mt-1 w-48 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-20"
            >
              <button
                class="btn-cancel-meeting w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                data-meeting-id="${meeting.id}"
              >
                ${renderIcon("trash", "w-3.5 h-3.5 text-rose-500")}
                <span>Отменить собрание</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 pt-4 border-t border-slate-100 space-y-2.5 w-full">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Повестка собрания
          </h4>
          <span class="text-2xs font-semibold text-slate-400">
            ${agendaList.length} ${agendaList.length === 1 ? "пункт" : agendaList.length > 1 && agendaList.length < 5 ? "пункта" : "пунктов"}
          </span>
        </div>
        <ol id="next-meeting-agenda-list" class="space-y-2 text-xs text-slate-700 list-decimal list-inside pl-1 font-medium w-full">
          ${agendaList.map((item) => `
            <li class="agenda-item leading-relaxed p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 w-full block">
              <span class="font-semibold text-slate-800">${item}</span>
            </li>
          `).join("")}
        </ol>
      </div>
    </div>
  `;
}

/**
 * Блок прочих будущих собраний
 * @param {object[]} meetings
 * @returns {string}
 */
function renderOtherUpcomingSection(meetings) {
  return `
    <div id="section-other-upcoming" class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
        Запланированные собрания (${meetings.length})
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${meetings.map((m) => `
          <div class="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-start justify-between gap-4">
            <div class="space-y-1.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold text-brand-700 bg-brand-50/80 border border-brand-200/60">
                ${formatDateRu(m.date)} · ${m.time}
              </span>
              <h4 class="text-sm font-bold text-slate-900">${m.title}</h4>
              <p class="text-xs font-medium text-slate-500">${m.room || "Каб. 302"}</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                class="btn-edit-meeting p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                data-meeting-id="${m.id}"
                title="Редактировать"
              >
                ${renderIcon("edit", "w-4 h-4")}
              </button>
              <button
                class="btn-cancel-meeting p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                data-meeting-id="${m.id}"
                title="Отменить"
              >
                ${renderIcon("trash", "w-4 h-4")}
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Блок прошедших собраний
 * @param {object[]} meetings
 * @returns {string}
 */
function renderPastMeetingsSection(meetings) {
  return `
    <div id="section-past-meetings" class="space-y-3 pt-2">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
          Прошедшие собрания
        </h3>
        <span class="text-xs text-slate-400 font-semibold">История протоколов и явки</span>
      </div>

      ${meetings.length === 0 ? `
        <div class="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs text-center text-xs text-slate-400 font-medium">
          Прошедших собраний пока нет
        </div>
      ` : `
        <div class="space-y-3">
          ${meetings.map((m) => {
    const dateRu = formatDateRu(m.date);
    return `
              <div
                class="past-meeting-row bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs transition-all hover:border-slate-300"
                data-meeting-id="${m.id}"
              >
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    ${renderIcon("check", "w-5 h-5")}
                  </div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-bold text-slate-900">${dateRu}</span>
                      <span class="text-slate-300">&bull;</span>
                      <span class="font-bold text-slate-800">${m.title}</span>
                      <span class="text-slate-300">&bull;</span>
                      <span class="meeting-attendance-badge font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2.5 py-0.5 rounded-full text-xs">
                        ${(() => { const s = getMeetingSummary(m.id); return s ? s.ratioText : "—"; })()}
                      </span>
                    </div>
                    <p class="text-2xs font-semibold text-slate-400 mt-1">${m.room || "Каб. 302"} · Завершено</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    class="btn-meeting-summary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                    data-meeting-id="${m.id}"
                  >
                    ${renderIcon("chart-bar", "w-3.5 h-3.5 text-slate-600")}
                    <span>Итоги</span>
                  </button>

                  <button
                    class="btn-mark-attendance inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                    data-meeting-id="${m.id}"
                  >
                    ${renderIcon("users", "w-3.5 h-3.5 text-brand-600")}
                    <span>Отметить явку</span>
                  </button>
                </div>
              </div>
            `;
  }).join("")}
        </div>
      `}
    </div>
  `;
}

/**
 * Модальное окно создания / редактирования собрания в стиле проекта
 * @returns {string}
 */
function renderMeetingFormModal() {
  return `
    <div
      id="modal-meeting-form"
      class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none"
    >
      <div
        id="modal-meeting-form-dialog"
        class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 id="modal-meeting-form-title" class="text-base font-bold text-slate-900">
              Создать собрание
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Планирование встречи и формирование повестки</p>
          </div>
          <button
            type="button"
            class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Закрыть"
          >
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <div class="space-y-4 overflow-y-auto flex-1 pr-1 text-xs py-3">
          <input type="hidden" id="meeting-id-input" value="" />

          <div>
            <label for="meeting-title-input" class="block font-semibold text-slate-700 mb-1.5">
              Тема собрания <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="meeting-title-input"
              class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs outline-none focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
              placeholder="Например, Подготовка к новогодним мероприятиям"
            />
            <p id="error-meeting-title" class="hidden text-[11px] font-semibold text-rose-600 mt-1"></p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="meeting-date-input" class="block font-semibold text-slate-700 mb-1.5">
                Дата проведения <span class="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="meeting-date-input"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer"
              />
              <p id="error-meeting-date" class="hidden text-[11px] font-semibold text-rose-600 mt-1"></p>
            </div>
            <div>
              <label for="meeting-time-input" class="block font-semibold text-slate-700 mb-1.5">
                Время проведения <span class="text-rose-500">*</span>
              </label>
              <input
                type="time"
                id="meeting-time-input"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer"
              />
              <p id="error-meeting-time" class="hidden text-[11px] font-semibold text-rose-600 mt-1"></p>
            </div>
          </div>

          <div>
            <label for="meeting-room-input" class="block font-semibold text-slate-700 mb-1.5">
              Место проведения (кабинет)
            </label>
            <input
              type="text"
              id="meeting-room-input"
              class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
              placeholder="Каб. 302"
              value="Каб. 302"
            />
          </div>

          <div class="pt-3 border-t border-slate-100 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="block font-semibold text-slate-700 text-xs">
                Повестка собрания (пункты)
              </label>
              <span class="text-2xs font-medium text-slate-400">Необязательно</span>
            </div>

            <div id="modal-agenda-items-container" class="space-y-2"></div>

            <div class="flex items-center gap-2 pt-1">
              <input
                type="text"
                id="input-new-agenda-item"
                class="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                placeholder="Новый пункт повестки..."
              />
              <button
                type="button"
                id="btn-add-agenda-item"
                class="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Добавить пункт
              </button>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center space-x-3 shrink-0">
          <button
            type="button"
            class="btn-close-modal flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            id="btn-save-meeting"
            class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Модальное окно подтверждения отмены собрания (TC-MG-06)
 * @returns {string}
 */
function renderCancelMeetingModal() {
  return `
    <div
      id="modal-cancel-meeting"
      class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none"
    >
      <div
        id="modal-cancel-meeting-dialog"
        class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 class="text-base font-bold text-slate-900">Отмена собрания</h3>
            <p class="text-xs text-slate-500 mt-0.5">Снятие встречи с плана класса 7Б</p>
          </div>
          <button
            type="button"
            class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Закрыть"
          >
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <div class="my-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-medium leading-relaxed">
          <p>
            Собрание будет снято из плана и уйдёт из ближайших. Опубликованное ранее объявление останется в списке объявлений без изменений.
          </p>
        </div>

        <input type="hidden" id="cancel-meeting-id" value="" />

        <div class="pt-2 flex items-center space-x-2.5">
          <button
            type="button"
            class="btn-close-modal flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Не отменять
          </button>
          <button
            type="button"
            id="btn-confirm-cancel-meeting"
            class="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Отменить собрание
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Модальное окно отметки явки (TC-MG-07, TC-MG-08, TC-MG-09)
 * @returns {string}
 */
function renderAttendanceModal() {
  return `
    <div
      id="modal-meeting-attendance"
      class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none"
    >
      <div
        id="modal-meeting-attendance-dialog"
        class="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 id="modal-attendance-title" class="text-base font-bold text-slate-900">
              Отметка явки на собрание
            </h3>
            <p id="modal-attendance-subtitle" class="text-xs text-slate-500 mt-0.5">
              05.09.2024 · Организация учебного года
            </p>
          </div>

          <div class="flex items-center gap-3">
            <span
              id="attendance-counter-badge"
              class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/70"
            >
              Всего пришли: <span id="attendance-present-count">0</span> из <span id="attendance-total-count">28</span>
            </span>
            <button
              type="button"
              class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Закрыть"
            >
              ${renderIcon("x", "w-5 h-5")}
            </button>
          </div>
        </div>

        <div class="overflow-y-auto flex-1 my-3 border border-slate-200/80 rounded-2xl">
          <input type="hidden" id="attendance-meeting-id" value="" />
          <p id="attendance-general-error" class="hidden m-3 text-xs text-rose-500 font-bold p-3 bg-rose-50 rounded-xl"></p>

          <table id="meeting-attendance-table" class="w-full text-left text-xs">
            <thead class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs sticky top-0 z-20 shadow-xs">
              <tr class="bg-slate-100">
                <th scope="col" class="py-2.5 px-3.5 bg-slate-100">Родитель</th>
                <th scope="col" class="py-2.5 px-3.5 bg-slate-100">Ученик (7Б)</th>
                <th scope="col" class="py-2.5 px-3.5 bg-slate-100 w-48">Явка</th>
                <th scope="col" class="py-2.5 px-3.5 bg-slate-100">Причина неявки</th>
              </tr>
            </thead>
            <tbody id="attendance-table-body" class="divide-y divide-slate-100 font-medium text-slate-700 bg-white"></tbody>
          </table>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            class="btn-close-modal h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
          <button
            type="button"
            id="btn-save-attendance"
            class="h-10 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Сохранить явку
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Модальное окно итогов собрания (TC-MG-10)
 * @returns {string}
 */
function renderSummaryModal() {
  return `
    <div
      id="modal-meeting-summary"
      class="hidden fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none"
    >
      <div
        id="modal-meeting-summary-dialog"
        class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 space-y-4"
      >
        <!-- Шапка -->
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 id="modal-summary-title" class="text-base font-bold text-slate-900">
              Итоги собрания
            </h3>
            <p id="modal-summary-subtitle" class="text-xs text-slate-500 mt-0.5">
              05.09.2024 · Организация учебного года
            </p>
          </div>
          <button
            type="button"
            class="btn-close-modal p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Закрыть"
          >
            ${renderIcon("x", "w-5 h-5")}
          </button>
        </div>

        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-brand-50/70 via-white to-brand-50/30 border border-brand-100 shadow-2xs space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Общая явка</span>
            <span id="summary-percentage-text" class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">86%</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span id="summary-ratio-text" class="text-2xl font-bold text-slate-900">24 из 28</span>
            <span class="text-xs font-medium text-slate-500">родителей присутствовали</span>
          </div>
          <p class="text-[10px] text-slate-400 pt-1 border-t border-brand-100/50">Счётчик рассчитывается по фактическим отметкам родителей класса 7Б</p>
        </div>

        <div class="space-y-1.5">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Отсутствовали на собрании
          </h4>
          <div id="summary-absent-list" class="space-y-1.5 max-h-52 overflow-y-auto pr-1"></div>
        </div>

        <!-- Футер с кнопками: Закрыть (второстепенная), Перейти к явке (основная) -->
        <div class="pt-3.5 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            class="btn-close-modal h-9 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
          <button
            type="button"
            id="btn-summary-open-attendance"
            class="h-9 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Перейти к явке</span>
          </button>
        </div>
      </div>
    </div>
  `;
}
