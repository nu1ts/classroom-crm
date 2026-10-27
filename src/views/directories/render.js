import { renderIcon } from "../../components/icons.js";
import {
  escapeHtml,
  getDirectoriesData,
  getDirectoryCounts,
  normalizeTab,
} from "./helpers.js";

/**
 * Шапка таблицы справочника (единый стиль колонок).
 * @param {string[]} cols Подписи колонок
 * @returns {string} HTML thead
 */
function tableHead(cols) {
  return `
    <thead>
      <tr class="border-b border-slate-200/80">
        ${cols
          .map(
            (c, i) =>
              `<th class="${i === cols.length - 1 ? "text-right" : "text-left"} text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">${escapeHtml(c)}</th>`,
          )
          .join("")}
      </tr>
    </thead>`;
}

/**
 * Бейдж статуса записи (активна / деактивирована).
 * @param {boolean} isActive Состояние активности
 * @returns {string} HTML бейджа
 */
function statusBadge(isActive) {
  return isActive
    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">Активна</span>`
    : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">Деактивирована</span>`;
}

/**
 * Бейдж использования записи в данных.
 * @param {boolean} inUse Используется ли запись
 * @returns {string} HTML бейджа
 */
function usageBadge(inUse) {
  return inUse
    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700">Есть связанные данные</span>`
    : `<span class="text-[11px] text-slate-400">—</span>`;
}

/**
 * Строка таблицы одного справочника.
 * @param {Object} item Запись { id, name, isActive, inUse, shortName? }
 * @param {string} tab Ключ вкладки
 * @returns {string} HTML строки
 */
function directoryRow(item, tab) {
  const dimmed = item.isActive ? "" : " text-slate-400";
  const shortCell =
    tab === "subjects"
      ? `<td class="px-4 py-3 text-xs text-slate-600${dimmed}">${escapeHtml(item.shortName || "—")}</td>`
      : "";
  const toggleLabel = item.isActive ? "Деактивировать" : "Вернуть";
  const toggleIcon = item.isActive ? "archive" : "rotate-ccw";
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors" data-row-id="${escapeHtml(item.id)}">
      <td class="px-4 py-3 text-xs font-semibold text-slate-800${dimmed}">${escapeHtml(item.name)}</td>
      ${shortCell}
      <td class="px-4 py-3">${usageBadge(item.inUse)}</td>
      <td class="px-4 py-3">${statusBadge(item.isActive)}</td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
          <button type="button" data-action="edit-entry" data-tab="${tab}" data-id="${escapeHtml(item.id)}"
                  class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-brand-400 hover:text-brand-600 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer">
            ${renderIcon("edit", "w-3.5 h-3.5")}
            <span>Изменить</span>
          </button>
          <button type="button" data-action="toggle-entry" data-tab="${tab}" data-id="${escapeHtml(item.id)}" data-active="${item.isActive ? "1" : "0"}"
                  class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer">
            ${renderIcon(toggleIcon, "w-3.5 h-3.5")}
            <span>${toggleLabel}</span>
          </button>
        </div>
      </td>
    </tr>`;
}

/**
 * Карточка-таблица одного справочника.
 * @param {Object} options { tab, title, subtitle, cols, rows }
 * @returns {string} HTML секции
 */
function directoryTable({ tab, title, subtitle, cols, rows }) {
  return `
    <div class="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden" data-tab-panel="${tab}">
      <div class="px-5 pt-4 pb-3 border-b border-slate-100">
        <h3 class="text-sm font-bold text-slate-900">${escapeHtml(title)}</h3>
        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(subtitle)}</p>
      </div>
      ${
        rows.length
          ? `<table class="w-full">${tableHead([...cols, "Статус", "Действия"])}
        <tbody>${rows.join("")}</tbody>
      </table>`
          : `<div class="px-5 py-10 text-center text-xs text-slate-400">Записи не найдены</div>`
      }
    </div>`;
}

/**
 * Вкладки страницы «Справочники».
 * @param {string} activeTab Активная вкладка
 * @param {Object} counts Счётчики записей по вкладкам { subjects, rooms, classes }
 * @returns {string} HTML вкладок
 */
function tabsHtml(activeTab, counts) {
  const tabs = [
    { key: "subjects", label: "Предметы" },
    { key: "rooms", label: "Аудитории" },
    { key: "classes", label: "Классы" },
  ];
  return `
    <div class="flex flex-wrap items-center gap-2" role="tablist">
      ${tabs
        .map(
          (t) => `
        <button type="button" role="tab" data-action="switch-tab" data-tab="${t.key}"
                class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === t.key
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:border-brand-300 hover:text-brand-600"
                }">
          <span>${escapeHtml(t.label)}</span>
          <span class="${activeTab === t.key ? "text-white/80" : "text-slate-400"}">${counts[t.key]}</span>
        </button>`,
        )
        .join("")}
      <a href="/school-year" class="inline-flex items-center space-x-1.5 ml-auto px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200/80 hover:border-brand-300 hover:text-brand-600 transition-colors">
        ${renderIcon("calendar", "w-3.5 h-3.5")}
        <span>Учебные годы и четверти</span>
        ${renderIcon("arrow-right", "w-3.5 h-3.5")}
      </a>
    </div>`;
}

/**
 * Панель таблицы активной вкладки (для точечного обновления без полного рендера).
 * @param {string} tab Ключ вкладки
 * @param {string} searchQuery Поисковый запрос
 * @returns {string} HTML секции таблицы
 */
export function renderDirectoriesPanel(tab, searchQuery = "") {
  const query = (searchQuery || "").trim().toLowerCase();
  const data = getDirectoriesData();
  const visible = {
    subjects: data.subjects.filter(
      (s) =>
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.shortName || "").toLowerCase().includes(query),
    ),
    rooms: data.rooms.filter(
      (r) => !query || r.name.toLowerCase().includes(query),
    ),
    classes: data.classes.filter(
      (c) => !query || c.name.toLowerCase().includes(query),
    ),
  };
  const panel =
    tab === "subjects"
      ? directoryTable({
          tab,
          title: "Школьные предметы",
          subtitle:
            "Предметы используются в нагрузке, журналах и расписании. Деактивация не удаляет связанные данные.",
          cols: ["Название", "Короткое название", "Данные"],
          rows: visible.subjects.map((s) => directoryRow(s, tab)),
        })
      : tab === "rooms"
        ? directoryTable({
            tab,
            title: "Аудитории",
            subtitle:
              "Аудитории указываются в занятиях расписания. Деактивация не изменяет существующие занятия.",
            cols: ["Название", "Данные"],
            rows: visible.rooms.map((r) => directoryRow(r, tab)),
          })
        : directoryTable({
            tab,
            title: "Классы школы",
            subtitle:
              "Классы используются в нагрузке, журналах и списках учеников. Деактивация не удаляет связанные данные.",
            cols: ["Название", "Данные"],
            rows: visible.classes.map((c) => directoryRow(c, tab)),
          });
  return panel;
}

/**
 * Подпись со счётчиками в шапке страницы (для точечного обновления).
 * @returns {string} Текст подписи
 */
export function directoriesSubtitleText() {
  const data = getDirectoriesData();
  const totalAll =
    data.subjects.length + data.rooms.length + data.classes.length;
  const totalActive =
    data.subjects.filter((s) => s.isActive).length +
    data.rooms.filter((r) => r.isActive).length +
    data.classes.filter((c) => c.isActive).length;
  return `${totalAll} ${pluralWord(totalAll)} · ${totalActive} активных`;
}

/**
 * Обновление счётчиков на вкладках (для точечного обновления).
 * @returns {Object} { subjects, rooms, classes }
 */
export function directoriesTabCounts() {
  return getDirectoryCounts();
}

/**
 * Рендер страницы «Справочники».
 * @param {Object} options { tab, search }
 * @returns {string} HTML вьюхи
 */
export function renderDirectoriesView(options = {}) {
  const tab = normalizeTab(options.tab);
  const searchQuery = (options.search || "").trim().toLowerCase();
  const data = getDirectoriesData();

  const counts = {
    subjects: data.subjects.length,
    rooms: data.rooms.length,
    classes: data.classes.length,
  };

  const visible = {
    subjects: data.subjects.filter(
      (s) =>
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery) ||
        (s.shortName || "").toLowerCase().includes(searchQuery),
    ),
    rooms: data.rooms.filter(
      (r) => !searchQuery || r.name.toLowerCase().includes(searchQuery),
    ),
    classes: data.classes.filter(
      (c) => !searchQuery || c.name.toLowerCase().includes(searchQuery),
    ),
  };

  const totalActive =
    data.subjects.filter((s) => s.isActive).length +
    data.rooms.filter((r) => r.isActive).length +
    data.classes.filter((c) => c.isActive).length;
  const totalAll = counts.subjects + counts.rooms + counts.classes;

  const addLabels = {
    subjects: "Добавить предмет",
    rooms: "Добавить аудиторию",
    classes: "Добавить класс",
  };

  const panel =
    tab === "subjects"
      ? directoryTable({
          tab,
          title: "Школьные предметы",
          subtitle:
            "Предметы используются в нагрузке, журналах и расписании. Деактивация не удаляет связанные данные.",
          cols: ["Название", "Короткое название", "Данные"],
          rows: visible.subjects.map((s) => directoryRow(s, tab)),
        })
      : tab === "rooms"
        ? directoryTable({
            tab,
            title: "Аудитории",
            subtitle:
              "Аудитории указываются в занятиях расписания. Деактивация не изменяет существующие занятия.",
            cols: ["Название", "Данные"],
            rows: visible.rooms.map((r) => directoryRow(r, tab)),
          })
        : directoryTable({
            tab,
            title: "Классы школы",
            subtitle:
              "Классы используются в нагрузке, журналах и списках учеников. Деактивация не удаляет связанные данные.",
            cols: ["Название", "Данные"],
            rows: visible.classes.map((c) => directoryRow(c, tab)),
          });

  return `
    <div id="directories-view" class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Справочники</h1>
          <p class="text-sm font-medium text-slate-500 mt-1" id="directories-total-subtitle">
            ${totalAll} ${escapeHtml(pluralWord(totalAll))} · ${totalActive} активных
          </p>
        </div>
        <div>
          <button type="button" id="btn-open-create-entry"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon("plus", "w-4 h-4")}
            <span>${escapeHtml(addLabels[tab])}</span>
          </button>
        </div>
      </div>

      ${tabsHtml(tab, counts)}

      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("search", "w-4 h-4")}
          </div>
          <input type="text" id="input-directories-search" value="${escapeHtml(options.search || "")}"
                 placeholder="Поиск по названию..."
                 autocomplete="off"
                 style="padding-left: 2.75rem; padding-right: 2.25rem;"
                 class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
          <button type="button" id="btn-clear-directories-search" title="Очистить поиск"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${options.search ? "" : "hidden"} cursor-pointer">
            ${renderIcon("x", "w-3.5 h-3.5")}
          </button>
        </div>
      </div>

      <div id="directories-table-area">${panel}</div>

      <div id="modal-directory-entry" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-directory-entry-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-bold text-slate-900" id="directory-modal-title">Добавить запись</h3>
            <button type="button" data-action="close-directory-modal" title="Закрыть"
                    class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="text-xs text-slate-500 mb-4" id="directory-modal-subtitle"></p>

          <div class="space-y-3.5">
            <div>
              <label for="input-directory-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Название</label>
              <input type="text" id="input-directory-name" placeholder=""
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>

            <div id="directory-short-name-field">
              <label for="input-directory-short-name" class="block text-xs font-semibold text-slate-700 mb-1.5">Короткое название</label>
              <input type="text" id="input-directory-short-name" placeholder="Например: Математика"
                     class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400" />
            </div>

            <p class="text-[11px] text-rose-500 hidden" id="directory-modal-error"></p>
          </div>

          <div class="flex items-center justify-end gap-2 mt-5">
            <button type="button" data-action="close-directory-modal"
                    class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-semibold text-slate-600 transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="button" id="btn-save-directory-entry"
                    class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer">
              Сохранить
            </button>
          </div>
        </div>
      </div>

      <div id="directories-toast" class="fixed bottom-6 right-6 z-50 transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <div class="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center space-x-3 max-w-sm">
          <span id="directories-toast-icon"></span>
          <span class="text-xs font-medium" id="directories-toast-message"></span>
        </div>
      </div>
    </div>`;
}

/**
 * Слово «запись» в нужном склонении для счётчика шапки.
 * @param {number} count Количество записей
 * @returns {string} Слово в нужной форме
 */
function pluralWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "записи";
  return "записей";
}
