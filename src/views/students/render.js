import {
  PERIODS,
  filterAndSortRows,
  prepareStudentRows,
  renderTableHtml,
} from "./helpers.js";
import { renderIcon } from "../../components/icons.js";
import { getDB, getCurrentUser } from "../../services/storage.js";
import { renderForbiddenView } from "../forbidden.js";

export function renderStudentsView(options = {}) {
  const db = getDB();
  const currentUser = getCurrentUser();
  const searchParams = new URLSearchParams(window.location.search || "");
  const requestedClassId = options.classId || options.class || searchParams.get("classId") || searchParams.get("class");
  if (currentUser && currentUser.role === "teacher") {
    const allowedClassId = currentUser.classId || "class-7b";
    if (
      requestedClassId &&
      requestedClassId !== allowedClassId &&
      requestedClassId !== "class-7b" &&
      requestedClassId !== "7Б" &&
      requestedClassId !== "7б"
    ) {
      return renderForbiddenView();
    }
  }
  const periodId = options.periodId || "q1_2024";
  const searchQuery = (options.searchQuery || "").trim();
  const filterAbsencesOnly =
    options.filterAbsencesOnly === true ||
    options.filterAbsencesOnly === "true";
  const sortBy = options.sortBy || "name";
  const sortOrder = options.sortOrder || "asc";
  const currentPage = parseInt(options.page || "1", 10);
  const pageSize = 10;

  const selectedClassId =
    currentUser?.role === "teacher"
      ? currentUser.classId || "class-7b"
      : requestedClassId || "class-7b";
  const rawStudents = (db.students || []).filter(
    (s) => (!s.classId || s.classId === selectedClassId) && s.status !== "archived",
  );
  const totalInClass = rawStudents.length;

  const studentRows = prepareStudentRows(db, periodId, selectedClassId);
  const filteredRows = filterAndSortRows(studentRows, {
    searchQuery,
    filterAbsencesOnly,
    sortBy,
    sortOrder,
  });

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const startShown = totalFiltered > 0 ? startIndex + 1 : 0;
  const endShown = Math.min(startIndex + pageSize, totalFiltered);

  const tableMarkup = renderTableHtml({
    pageRows,
    totalFiltered,
    totalInClass,
    startShown,
    endShown,
    validPage,
    totalPages,
    sortBy,
    sortOrder,
    searchQuery,
  });

  return `
    <div class="space-y-6">

      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div class="flex flex-wrap items-center gap-3 flex-1">

            <div class="relative min-w-[260px] flex-1 max-w-md">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                ${renderIcon("search", "w-4 h-4")}
              </div>
              <input type="text"
                     id="input-search-student-list"
                     placeholder="Поиск ученика по фамилии..."
                     value="${searchQuery}"
                     autocomplete="off"
                     style="padding-left: 2.75rem; padding-right: 2.25rem;"
                     class="w-full py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs" />
              <button type="button"
                       id="btn-clear-student-search"
                       title="Очистить поиск"
                       class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 ${searchQuery ? "" : "hidden"} cursor-pointer">
                ${renderIcon("x", "w-3.5 h-3.5")}
              </button>
            </div>

            <button type="button"
                    id="btn-filter-absences-toggle"
                    class="px-4 py-2.5 rounded-xl border ${filterAbsencesOnly ? "bg-brand-500 text-white border-brand-500 shadow-xs" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs"} text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer">
              ${renderIcon("filter", "w-4 h-4 " + (filterAbsencesOnly ? "text-white" : "text-slate-500"))}
              <span>Фильтр: С пропусками</span>
            </button>

            <div class="relative">
              <select id="select-students-period"
                      style="padding-left: 0.875rem; padding-right: 2.25rem;"
                      class="appearance-none py-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
                ${PERIODS.map(
                  (p) => `
                  <option value="${p.id}" ${p.id === periodId ? "selected" : ""}>${p.name}</option>
                `,
                ).join("")}
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                ${renderIcon("chevron-down", "w-3.5 h-3.5")}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <button type="button"
                    id="btn-class-archive"
                    class="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5">
              ${renderIcon("archive", "w-3.5 h-3.5 text-slate-500")}
              <span>Архив класса</span>
            </button>

            <button type="button"
                    id="btn-add-student-mock"
                    class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs hover:shadow transition-colors flex items-center space-x-1.5 cursor-pointer">
              <span class="text-base font-bold leading-none">+</span>
              <span>Добавить ученика</span>
            </button>
          </div>
        </div>
      </div>

      <div id="students-table-wrapper" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        ${tableMarkup}
      </div>
    </div>

    <div id="modal-student-summary" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-student-summary-dialog" class="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div id="student-summary-content">
        </div>
      </div>
    </div>

    <div id="modal-add-student" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-add-student-dialog" class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              ${renderIcon("user-plus", "w-5 h-5")}
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Добавить ученика в 7Б класс</h3>
              <p class="text-xs text-slate-500 mt-0.5">Ввод данных личного дела и контактов родителя</p>
            </div>
          </div>
          <button type="button" id="btn-close-add-student-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <form id="form-add-student" class="py-4 space-y-4 text-xs">
          <div id="add-student-error" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="add-student-lastname" class="block text-xs font-semibold text-slate-700 mb-1.5">Фамилия <span class="text-rose-500">*</span></label>
              <input type="text" id="add-student-lastname" required placeholder="Новиков"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
            <div>
              <label for="add-student-firstname" class="block text-xs font-semibold text-slate-700 mb-1.5">Имя <span class="text-rose-500">*</span></label>
              <input type="text" id="add-student-firstname" required placeholder="Арсений"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
            <div>
              <label for="add-student-middlename" class="block text-xs font-semibold text-slate-700 mb-1.5">Отчество</label>
              <input type="text" id="add-student-middlename" placeholder="Игоревич"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="add-student-gender" class="block text-xs font-semibold text-slate-700 mb-1.5">Пол</label>
              <div class="relative">
                <select id="add-student-gender" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div>
              <label for="add-student-birthdate" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата рождения</label>
              <input type="date" id="add-student-birthdate" value="2011-05-15"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer" />
            </div>

            <div>
              <label for="add-student-id" class="block text-xs font-semibold text-slate-700 mb-1.5">Личное дело</label>
              <input type="text" id="add-student-id" readonly title="Номер личного дела присваивается автоматически"
                     class="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-700 cursor-not-allowed select-none focus:outline-none flex items-center" />
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
            <div class="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                ${renderIcon("user", "w-3.5 h-3.5 text-brand-600")}
              </span>
              <span>Основной родитель для связи</span>
            </div>

            <div>
              <label for="add-parent-fullname" class="block text-xs font-semibold text-slate-700 mb-1.5">ФИО родителя / представителя</label>
              <input type="text" id="add-parent-fullname" placeholder="Смирнов Дмитрий Олегович"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="add-parent-relation" class="block text-xs font-semibold text-slate-700 mb-1.5">Степень родства</label>
                <div class="relative">
                  <select id="add-parent-relation" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="Мать">Мать</option>
                    <option value="Отец">Отец</option>
                    <option value="Законный представитель">Законный представитель</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon("chevron-down", "w-4 h-4")}
                  </div>
                </div>
              </div>

              <div>
                <label for="add-parent-phone" class="block text-xs font-semibold text-slate-700 mb-1.5">Телефон для связи</label>
                <div class="relative flex items-center">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    ${renderIcon("phone", "w-4 h-4 text-slate-400")}
                  </div>
                  <input type="tel" id="add-parent-phone" placeholder="+7 999 123-45-67"
                         class="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2.5">
            <button type="button" id="btn-cancel-add-student" class="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="submit" id="btn-submit-add-student" class="py-2.5 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Зачислить в класс</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div id="modal-class-archive" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
      <div id="modal-class-archive-dialog" class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
              ${renderIcon("archive", "w-5 h-5")}
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-bold text-slate-900">Архив 7Б класса</h3>
                <span id="class-archive-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  0 учеников
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Выбывшие, переведённые и архивные дела учеников</p>
            </div>
          </div>
          <button type="button" id="btn-close-class-archive-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
            ${renderIcon("x", "w-4 h-4")}
          </button>
        </div>

        <div class="py-4 space-y-5 text-xs">
          <div>
            <h4 class="text-xs font-bold text-slate-800 mb-2.5 flex items-center space-x-1.5">
              <span>Выбывшие ученики</span>
            </h4>
            <div id="class-archive-list-container" class="space-y-2.5">
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
            <h4 class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span>Оформить выбытие ученика в архив</span>
            </h4>

            <form id="form-archive-student" class="space-y-3.5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="select-archive-student" class="block text-xs font-semibold text-slate-700 mb-1.5">Выберите ученика <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <select id="select-archive-student" required class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevron-down", "w-4 h-4")}
                    </div>
                  </div>
                </div>

                <div>
                  <label for="select-archive-reason" class="block text-xs font-semibold text-slate-700 mb-1.5">Причина выбытия</label>
                  <div class="relative">
                    <select id="select-archive-reason" class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      <option value="Перевод в другую школу">Перевод в другую школу</option>
                      <option value="Переезд в другой регион">Переезд в другой регион / город</option>
                      <option value="По заявлению родителей">По заявлению родителей (семейное обучение)</option>
                      <option value="Перевод в параллельный класс">Перевод в параллельный класс (7А)</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon("chevron-down", "w-4 h-4")}
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="input-archive-date" class="block text-xs font-semibold text-slate-700 mb-1.5">Дата выбытия</label>
                  <input type="date" id="input-archive-date" value="2024-10-25"
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer" />
                </div>
                <div>
                  <label for="input-archive-order" class="block text-xs font-semibold text-slate-700 mb-1.5">Реквизиты приказа (опционально)</label>
                  <input type="text" id="input-archive-order" placeholder="Приказ № 48-у от 25.10.2024"
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button type="submit" class="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs hover:shadow transition-colors cursor-pointer">
                  Перевести в архив
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div id="students-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 transition-all duration-300 opacity-0 translate-y-4 pointer-events-none text-xs font-medium">
      <div id="students-toast-icon"></div>
      <span id="students-toast-message"></span>
    </div>
  `;
}
