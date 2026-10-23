import {
  getDB,
  saveDB,
  addParent,
  updateParent,
  deleteParent,
  linkParentToStudent,
  unlinkParentFromStudent,
} from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import {
  calculateStudentAttendance,
  calculateStudentAverage,
  getRiskZoneStudents,
} from "../../mock/calculations.js";
import { navigate, currentPath } from "../../services/navigation.js";

export function renderParentsView(options = {}) {
  const db = getDB();
  const rawParents = db.parents || [];
  const rawStudents = db.students || [];
  const relations = db.parentStudentRelations || [];

  const searchQuery = (options.searchQuery || "").trim().toLowerCase();
  const filterLink = options.filterLink || "all";
  const currentPage = parseInt(options.page || "1", 10) || 1;
  const pageSize = 10;

  const parentRows = rawParents.map((parent) => {
    const parentRels = relations.filter((r) => r.parentId === parent.id);
    const children = parentRels.map((rel) => {
      const student = rawStudents.find((s) => s.id === rel.studentId);
      return {
        student,
        relationRole: rel.relationRole || "Родитель",
        isPrimary: Boolean(rel.isPrimary),
      };
    });

    const parts = (parent.fullName || "").trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`
        : parent.fullName
          ? parent.fullName.slice(0, 2)
          : "РД";

    const parentContacts = (db.parentContacts || []).filter(
      (c) => c.parentId === parent.id,
    );
    parentContacts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const lastContact = parentContacts[0]
      ? {
          ...parentContacts[0],
          displayDate:
            parentContacts[0].date && parentContacts[0].date.includes("-")
              ? parentContacts[0].date.split("-").reverse().join(".")
              : parentContacts[0].date || "",
        }
      : null;

    return {
      parent,
      initials: initials.toUpperCase(),
      relations: parentRels,
      children,
      hasLink: children.length > 0,
      lastContact,
    };
  });

  const totalParentsCount = rawParents.length;
  const uniqueParentsCount = totalParentsCount;
  const studentsWithParents = new Set(relations.map((r) => r.studentId));
  const studentsWithParentsCount = studentsWithParents.size;

  const filteredRows = parentRows.filter((row) => {
    if (filterLink === "no_link" && row.hasLink) {
      return false;
    }
    if (filterLink === "primary" && !row.children.some((c) => c.isPrimary)) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery;
      const fn = (row.parent.fullName || "").toLowerCase();
      const ln = (row.parent.lastName || "").toLowerCase();
      const ph = (row.parent.phone || "").toLowerCase();
      const phDigits = ph.replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");

      const matchName = fn.includes(q) || ln.includes(q);
      const matchPhone =
        ph.includes(q) || (qDigits.length >= 3 && phDigits.includes(qDigits));

      if (!matchName && !matchPhone) {
        return false;
      }
    }

    return true;
  });

  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const students7B = rawStudents.filter(
    (s) => (!s.classId || s.classId === "class-7b") && s.status !== "archived",
  );

  return `
    <div class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Родители 7Б</h1>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              База родителей
            </span>
          </div>
          <p class="text-sm font-medium text-slate-500 mt-1" id="parents-total-subtitle">
            ${uniqueParentsCount} родителя · у ${studentsWithParentsCount} учеников
          </p>
        </div>

        <div>
          <button type="button" id="btn-open-add-parent"
                  class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
            ${renderIcon("plus", "w-4 h-4")}
            <span>+ Добавить родителя</span>
          </button>
        </div>
      </div>
      
      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row items-center gap-3">
        <div class="relative flex-1 w-full">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            ${renderIcon("search", "w-4 h-4")}
          </div>
          <input type="text" id="input-parents-search" value="${options.searchQuery || ""}"
                 placeholder="Поиск по фамилии или телефону..."
                 class="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
          ${
            options.searchQuery
              ? `
            <button type="button" id="btn-clear-parents-search" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
              ${renderIcon("x", "w-4 h-4")}
            </button>
          `
              : ""
          }
        </div>

        <div class="w-full md:w-64">
          <div class="relative">
            <select id="select-parents-filter"
                    class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
              <option value="all" ${filterLink === "all" ? "selected" : ""}>Все родители</option>
              <option value="no_link" ${filterLink === "no_link" ? "selected" : ""}>Связь: Без связи</option>
              <option value="primary" ${filterLink === "primary" ? "selected" : ""}>Только основные контакты</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              ${renderIcon("chevron-down", "w-4 h-4")}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        ${
          paginatedRows.length > 0
            ? `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" class="py-3.5 px-4 sm:px-6">Родитель</th>
                  <th scope="col" class="py-3.5 px-4">Дети</th>
                  <th scope="col" class="py-3.5 px-4">Роль связи</th>
                  <th scope="col" class="py-3.5 px-4">Основной контакт</th>
                  <th scope="col" class="py-3.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                ${paginatedRows
                  .map((row) => {
                    const p = row.parent;
                    const firstChild = row.children[0];
                    const hasMoreChildren = row.children.length > 1;

                    let childrenHtml = "—";
                    if (row.children.length > 0) {
                      childrenHtml = row.children
                        .map(
                          (c) => `
                      <a href="/student?id=${c.student ? c.student.id : ""}"
                         class="text-brand-600 hover:text-brand-700 font-semibold hover:underline block truncate max-w-xs">
                        ${c.student ? c.student.fullName : "Ученик"} (7Б)
                      </a>
                    `,
                        )
                        .join("");
                    } else if (p.otherChildren && p.otherChildren.length > 0) {
                      childrenHtml = p.otherChildren
                        .map(
                          (oc) => `
                      <span class="text-slate-600 font-medium block truncate max-w-xs">${oc.name} (${oc.class})</span>
                    `,
                        )
                        .join("");
                    }

                    let roleHtml = "—";
                    if (row.children.length > 0) {
                      roleHtml = row.children
                        .map(
                          (c) => `<span class="block">${c.relationRole}</span>`,
                        )
                        .join("");
                    }

                    let primaryBadgeHtml = "—";
                    if (row.children.length > 0) {
                      const isAnyPrimary = row.children.some(
                        (c) => c.isPrimary,
                      );
                      if (isAnyPrimary) {
                        primaryBadgeHtml = `
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
                          Основной контакт
                        </span>
                      `;
                      } else {
                        primaryBadgeHtml = `
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500 text-white shadow-2xs">
                          Дополнительный
                        </span>
                      `;
                      }
                    }

                    return `
                    <tr class="hover:bg-slate-50/80 transition-colors group" data-parent-id="${p.id}">
                      <td class="py-4 px-4 sm:px-6">
                        <div class="flex items-center space-x-3.5">
                          <div class="w-9 h-9 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                            ${row.initials}
                          </div>
                          <div>
                            <div class="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                              ${p.fullName}
                            </div>
                            <div class="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                              ${renderIcon("phone", "w-3 h-3 text-slate-400")}
                              <span>${p.phone || "Нет телефона"}</span>
                            </div>
                            ${
                              row.lastContact
                                ? `
                              <div class="text-[11px] text-brand-600 font-semibold flex items-center space-x-1 mt-0.5" title="${row.lastContact.summary || ""}">
                                <span>Контакт: ${row.lastContact.displayDate} (${row.lastContact.channelLabel || "Звонок"})</span>
                              </div>
                            `
                                : ""
                            }
                          </div>
                        </div>
                      </td>

                      <td class="py-4 px-4">
                        ${childrenHtml}
                      </td>
                      <td class="py-4 px-4 text-slate-800">
                        ${roleHtml}
                      </td>

                      <td class="py-4 px-4">
                        ${primaryBadgeHtml}
                      </td>
                      <td class="py-4 px-4 text-right">
                        <div class="flex items-center justify-end space-x-2">
                          <button type="button" class="btn-open-parent-summary px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors cursor-pointer"
                                  data-parent-id="${p.id}">
                            Сводка
                          </button>

                          <div class="relative inline-block text-left">
                            <button type="button" class="btn-parent-actions p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    data-parent-id="${p.id}">
                              ${renderIcon("more-vertical", "w-4 h-4")}
                            </button>
                            <div id="menu-parent-${p.id}" class="hidden absolute right-0 mt-1 w-48 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-30 text-left">
                              <button type="button" class="btn-action-edit-parent w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                                      data-parent-id="${p.id}">
                                <span>Изменить данные</span>
                              </button>
                              <button type="button" class="btn-action-link-parent w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                                      data-parent-id="${p.id}">
                                <span>Связать с учеником</span>
                              </button>
                              <div class="my-1 border-t border-slate-100"></div>
                              <button type="button" class="btn-action-delete-parent w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                                      data-parent-id="${p.id}">
                                <span>Удалить</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="p-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <div id="parents-count-summary">
              Показано ${totalFiltered} из ${totalParentsCount} родителей
            </div>

            ${
              totalPages > 1
                ? `
              <div class="flex items-center space-x-1">
                <button type="button" id="btn-parents-prev-page" ${validPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed p-2 rounded-xl border border-slate-200"' : 'class="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"'}>
                  ${renderIcon("chevron-down", "w-4 h-4 rotate-90")}
                </button>
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                  .map(
                    (pNum) => `
                  <button type="button" class="btn-parents-page-num w-8 h-8 rounded-xl font-bold transition-colors cursor-pointer ${pNum === validPage ? "bg-brand-500 text-white" : "hover:bg-slate-50 text-slate-700"}"
                          data-page="${pNum}">
                    ${pNum}
                  </button>
                `,
                  )
                  .join("")}
                <button type="button" id="btn-parents-next-page" ${validPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed p-2 rounded-xl border border-slate-200"' : 'class="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"'}>
                  ${renderIcon("chevron-down", "w-4 h-4 -rotate-90")}
                </button>
              </div>
            `
                : ""
            }
          </div>
        `
            : `
          <div class="py-16 px-4 text-center">
            <div class="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
              ${renderIcon("users", "w-8 h-8")}
            </div>
            <h3 class="text-base font-bold text-slate-900">Ничего не найдено</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              По вашему запросу родители не найдены. Попробуйте изменить параметры поиска или сбросить фильтры.
            </p>
            <div class="mt-4 text-xs text-slate-400 font-medium">
              0 из ${totalParentsCount}
            </div>
            <div class="mt-6">
              <button type="button" id="btn-reset-parents-filters"
                      class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                Сбросить фильтры
              </button>
            </div>
          </div>
        `
        }
      </div>

      <div id="modal-add-parent" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-add-parent-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Добавить родителя</h3>
              <p class="text-xs text-slate-500 mt-0.5">Внесение контактных данных в базу класса 7Б</p>
            </div>
            <button type="button" id="btn-close-add-parent-x" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
              ${renderIcon("x", "w-5 h-5")}
            </button>
          </div>

          <form id="form-add-parent" class="mt-5 space-y-4 text-xs" novalidate>
            <div>
              <label for="add-parent-fullname" class="block font-semibold text-slate-700 mb-1.5">ФИО родителя *</label>
              <input type="text" id="add-parent-fullname" placeholder="Например: Котов Дмитрий Сергеевич"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>

            <div>
              <label for="add-parent-phone" class="block font-semibold text-slate-700 mb-1.5">Мобильный телефон *</label>
              <input type="tel" id="add-parent-phone" placeholder="+7 999 123-45-66"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
              <p id="add-parent-phone-error" class="hidden text-[11px] font-semibold text-rose-600 mt-1">Укажите телефон</p>
            </div>

            <div>
              <label for="add-parent-student-select" class="block font-semibold text-slate-700 mb-1.5">Связать с учеником</label>
              <div class="relative">
                <select id="add-parent-student-select"
                        class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="">Без связи (не привязывать к ученику)</option>
                  ${students7B.map((s) => `<option value="${s.id}">${s.fullName} (7Б)</option>`).join("")}
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="add-parent-role-select" class="block font-semibold text-slate-700 mb-1.5">Роль связи</label>
                <div class="relative">
                  <select id="add-parent-role-select"
                          class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="Отец">Отец</option>
                    <option value="Мать">Мать</option>
                    <option value="Опекун">Опекун</option>
                    <option value="Законный представитель">Законный представитель</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon("chevron-down", "w-4 h-4")}
                  </div>
                </div>
              </div>

              <div class="flex items-end pb-2">
                <label class="flex items-center space-x-2 cursor-pointer select-none">
                  <input type="checkbox" id="add-parent-is-primary" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                  <span class="text-xs font-semibold text-slate-800">Основной контакт</span>
                </label>
              </div>
            </div>

            <div class="pt-3 flex items-center space-x-3">
              <button type="button" id="btn-cancel-add-parent" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                Добавить
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-edit-parent" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-edit-parent-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Изменить данные</h3>
              <p class="text-xs text-slate-500 mt-0.5">Карточка родителя</p>
            </div>
            <button type="button" id="btn-close-edit-parent-x" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
              ${renderIcon("x", "w-5 h-5")}
            </button>
          </div>

          <form id="form-edit-parent" class="mt-5 space-y-4 text-xs">
            <input type="hidden" id="edit-parent-id" />

            <div>
              <label for="edit-parent-fullname" class="block font-semibold text-slate-700 mb-1.5">ФИО</label>
              <input type="text" id="edit-parent-fullname"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>

            <div>
              <label for="edit-parent-phone" class="block font-semibold text-slate-700 mb-1.5">Телефон</label>
              <input type="tel" id="edit-parent-phone"
                     class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
            </div>

            <div>
              <label for="edit-parent-role-select" class="block font-semibold text-slate-700 mb-1.5">Роль связи</label>
              <div class="relative">
                <select id="edit-parent-role-select"
                        class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="Отец">Отец</option>
                  <option value="Мать">Мать</option>
                  <option value="Опекун">Опекун</option>
                  <option value="Законный представитель">Законный представитель</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div class="pt-1">
              <label class="flex items-center space-x-2 cursor-pointer select-none">
                <input type="checkbox" id="edit-parent-is-primary" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                <span class="text-xs font-semibold text-slate-800">Основной контакт</span>
              </label>
            </div>

            <div class="pt-3 flex items-center space-x-3">
              <button type="button" id="btn-cancel-edit-parent" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-link-parent" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
        <div id="modal-link-parent-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Связать с учеником</h3>
              <p class="text-xs text-slate-500 mt-0.5" id="link-parent-title-desc">Настройка связи родителя</p>
            </div>
            <button type="button" id="btn-close-link-parent-x" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
              ${renderIcon("x", "w-5 h-5")}
            </button>
          </div>

          <div class="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
            <span class="font-semibold">Обратите внимание:</span> На одного ученика может быть несколько родителей. Основным считается один.
          </div>

          <form id="form-link-parent" class="mt-4 space-y-4 text-xs">
            <input type="hidden" id="link-parent-id" />

            <div>
              <label for="link-parent-student-select" class="block font-semibold text-slate-700 mb-1.5">Ученик 7Б класса</label>
              <div class="relative">
                <select id="link-parent-student-select" required
                        class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  ${students7B.map((s) => `<option value="${s.id}">${s.fullName} (7Б)</option>`).join("")}
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div>
              <label for="link-parent-role-select" class="block font-semibold text-slate-700 mb-1.5">Роль связи</label>
              <div class="relative">
                <select id="link-parent-role-select"
                        class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                  <option value="Опекун">Опекун</option>
                  <option value="Отец">Отец</option>
                  <option value="Мать">Мать</option>
                  <option value="Законный представитель">Законный представитель</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  ${renderIcon("chevron-down", "w-4 h-4")}
                </div>
              </div>
            </div>

            <div class="pt-1">
              <label class="flex items-center space-x-2 cursor-pointer select-none">
                <input type="checkbox" id="link-parent-is-primary" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                <span class="text-xs font-semibold text-slate-800">Сделать основным контактом</span>
              </label>
            </div>

            <div class="pt-3 flex items-center space-x-3">
              <button type="button" id="btn-cancel-link-parent" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                Связать
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="parents-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="parents-toast-icon">${renderIcon("check", "w-4 h-4 text-emerald-400")}</span>
        <span id="parents-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}

export function setupParentsListeners(onNavigate) {
  const inputSearch = document.getElementById("input-parents-search");
  const btnClearSearch = document.getElementById("btn-clear-parents-search");
  const selectFilter = document.getElementById("select-parents-filter");
  const btnReset = document.getElementById("btn-reset-parents-filters");

  const btnOpenAdd = document.getElementById("btn-open-add-parent");
  const modalAdd = document.getElementById("modal-add-parent");
  const modalAddDialog = document.getElementById("modal-add-parent-dialog");
  const btnCloseAddX = document.getElementById("btn-close-add-parent-x");
  const btnCancelAdd = document.getElementById("btn-cancel-add-parent");
  const formAdd = document.getElementById("form-add-parent");
  const inputAddFullname = document.getElementById("add-parent-fullname");
  const inputAddPhone = document.getElementById("add-parent-phone");
  const pPhoneError = document.getElementById("add-parent-phone-error");
  const selectAddStudent = document.getElementById("add-parent-student-select");
  const selectAddRole = document.getElementById("add-parent-role-select");
  const checkAddPrimary = document.getElementById("add-parent-is-primary");

  const modalEdit = document.getElementById("modal-edit-parent");
  const modalEditDialog = document.getElementById("modal-edit-parent-dialog");
  const btnCloseEditX = document.getElementById("btn-close-edit-parent-x");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-parent");
  const formEdit = document.getElementById("form-edit-parent");
  const inputEditId = document.getElementById("edit-parent-id");
  const inputEditFullname = document.getElementById("edit-parent-fullname");
  const inputEditPhone = document.getElementById("edit-parent-phone");
  const selectEditRole = document.getElementById("edit-parent-role-select");
  const checkEditPrimary = document.getElementById("edit-parent-is-primary");

  const modalLink = document.getElementById("modal-link-parent");
  const modalLinkDialog = document.getElementById("modal-link-parent-dialog");
  const btnCloseLinkX = document.getElementById("btn-close-link-parent-x");
  const btnCancelLink = document.getElementById("btn-cancel-link-parent");
  const formLink = document.getElementById("form-link-parent");
  const inputLinkId = document.getElementById("link-parent-id");
  const selectLinkStudent = document.getElementById(
    "link-parent-student-select",
  );
  const selectLinkRole = document.getElementById("link-parent-role-select");
  const checkLinkPrimary = document.getElementById("link-parent-is-primary");
  const linkDesc = document.getElementById("link-parent-title-desc");

  const toast = document.getElementById("parents-toast");
  const toastMessage = document.getElementById("parents-toast-message");

  function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, 2500);
  }

  function updateQueryUrl(newParams = {}) {
    const hash = "/parents" + (window.location.search || "");
    const [path, qs] = hash.split("?");
    const params = new URLSearchParams(qs || "");

    Object.entries(newParams).forEach(([k, v]) => {
      if (
        v === null ||
        v === "" ||
        (k === "filter" && v === "all") ||
        (k === "page" && v === "1")
      ) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });

    const newQuery = params.toString();
    const newHash = newQuery ? `${path}?${newQuery}` : path;
    if (onNavigate) {
      onNavigate(newHash);
    } else {
      navigate(newHash);
    }
  }

  if (inputSearch) {
    let debounceTimer;
    inputSearch.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateQueryUrl({ search: inputSearch.value.trim(), page: 1 });
      }, 250);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
      if (inputSearch) inputSearch.value = "";
      updateQueryUrl({ search: "", page: 1 });
    });
  }

  if (selectFilter) {
    selectFilter.addEventListener("change", () => {
      updateQueryUrl({ filter: selectFilter.value, page: 1 });
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (inputSearch) inputSearch.value = "";
      if (selectFilter) selectFilter.value = "all";
      updateQueryUrl({ search: "", filter: "all", page: 1 });
    });
  }

  document.querySelectorAll(".btn-parents-page-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-page");
      if (p) updateQueryUrl({ page: p });
    });
  });

  const btnPrev = document.getElementById("btn-parents-prev-page");
  const btnNext = document.getElementById("btn-parents-next-page");
  if (btnPrev && !btnPrev.disabled) {
    btnPrev.addEventListener("click", () => {
      const hash = "/parents" + (window.location.search || "");
      const params = new URLSearchParams(
        hash.includes("?") ? hash.split("?")[1] : "",
      );
      const curPage = parseInt(params.get("page") || "1", 10);
      if (curPage > 1) updateQueryUrl({ page: curPage - 1 });
    });
  }
  if (btnNext && !btnNext.disabled) {
    btnNext.addEventListener("click", () => {
      const hash = "/parents" + (window.location.search || "");
      const params = new URLSearchParams(
        hash.includes("?") ? hash.split("?")[1] : "",
      );
      const curPage = parseInt(params.get("page") || "1", 10);
      updateQueryUrl({ page: curPage + 1 });
    });
  }

  document.querySelectorAll(".btn-parent-actions").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const parentId = btn.getAttribute("data-parent-id");
      const menu = document.getElementById(`menu-parent-${parentId}`);
      document.querySelectorAll('[id^="menu-parent-"]').forEach((m) => {
        if (m !== menu) m.classList.add("hidden");
      });
      if (menu) menu.classList.toggle("hidden");
    });
  });

  document.addEventListener("click", () => {
    document
      .querySelectorAll('[id^="menu-parent-"]')
      .forEach((m) => m.classList.add("hidden"));
  });

  document.querySelectorAll(".btn-open-parent-summary").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.getAttribute("data-parent-id");
      if (parentId) {
        const targetHash = `/parent?id=${parentId}`;
        if (onNavigate) onNavigate(targetHash);
        else navigate(targetHash);
      }
    });
  });

  function openAddModal() {
    if (!modalAdd) return;
    if (formAdd) formAdd.reset();
    if (pPhoneError) pPhoneError.classList.add("hidden");
    if (inputAddPhone)
      inputAddPhone.classList.remove(
        "border-rose-500",
        "focus:ring-rose-500/20",
      );
    modalAdd.classList.remove("opacity-0", "pointer-events-none");
    modalAdd.classList.add("opacity-100", "pointer-events-auto");
    if (modalAddDialog) {
      modalAddDialog.classList.remove("scale-95");
      modalAddDialog.classList.add("scale-100");
    }
    setTimeout(() => inputAddFullname?.focus(), 50);
  }

  function closeAddModal() {
    if (!modalAdd) return;
    modalAdd.classList.remove("opacity-100", "pointer-events-auto");
    modalAdd.classList.add("opacity-0", "pointer-events-none");
    if (modalAddDialog) {
      modalAddDialog.classList.remove("scale-100");
      modalAddDialog.classList.add("scale-95");
    }
  }

  if (btnOpenAdd) btnOpenAdd.addEventListener("click", openAddModal);
  if (btnCloseAddX) btnCloseAddX.addEventListener("click", closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener("click", closeAddModal);
  if (modalAdd) {
    modalAdd.addEventListener("click", (e) => {
      if (e.target === modalAdd) closeAddModal();
    });
  }

  if (formAdd) {
    formAdd.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = (inputAddFullname?.value || "").trim();
      const phone = (inputAddPhone?.value || "").trim();
      const studentId = selectAddStudent?.value || null;
      const relationRole = selectAddRole?.value || "Родитель";
      const isPrimary = checkAddPrimary?.checked || false;

      if (!phone) {
        if (pPhoneError) pPhoneError.classList.remove("hidden");
        if (inputAddPhone) {
          inputAddPhone.classList.add(
            "border-rose-500",
            "focus:ring-rose-500/20",
          );
          inputAddPhone.focus();
        }
        return;
      }

      const res = addParent({
        fullName: fullName || "Новый родитель",
        phone,
        studentId,
        relationRole,
        isPrimary,
      });
      if (res.success) {
        closeAddModal();
        showToast("Родитель успешно добавлен");
        setTimeout(() => {
          updateQueryUrl({ page: 1 });
        }, 150);
      }
    });
  }

  function openEditModal(parentId) {
    if (!modalEdit) return;
    const db = getDB();
    const parent = (db.parents || []).find((p) => p.id === parentId);
    if (!parent) return;

    const rel = (db.parentStudentRelations || []).find(
      (r) => r.parentId === parentId,
    );

    if (inputEditId) inputEditId.value = parent.id;
    if (inputEditFullname) inputEditFullname.value = parent.fullName || "";
    if (inputEditPhone) inputEditPhone.value = parent.phone || "";
    if (selectEditRole) selectEditRole.value = rel?.relationRole || "Родитель";
    if (checkEditPrimary) checkEditPrimary.checked = Boolean(rel?.isPrimary);

    modalEdit.classList.remove("opacity-0", "pointer-events-none");
    modalEdit.classList.add("opacity-100", "pointer-events-auto");
    if (modalEditDialog) {
      modalEditDialog.classList.remove("scale-95");
      modalEditDialog.classList.add("scale-100");
    }
  }

  function closeEditModal() {
    if (!modalEdit) return;
    modalEdit.classList.remove("opacity-100", "pointer-events-auto");
    modalEdit.classList.add("opacity-0", "pointer-events-none");
    if (modalEditDialog) {
      modalEditDialog.classList.remove("scale-100");
      modalEditDialog.classList.add("scale-95");
    }
  }

  if (btnCloseEditX) btnCloseEditX.addEventListener("click", closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeEditModal);
  if (modalEdit) {
    modalEdit.addEventListener("click", (e) => {
      if (e.target === modalEdit) closeEditModal();
    });
  }

  document.querySelectorAll(".btn-action-edit-parent").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pId = btn.getAttribute("data-parent-id");
      if (pId) openEditModal(pId);
    });
  });

  if (formEdit) {
    formEdit.addEventListener("submit", (e) => {
      e.preventDefault();
      const parentId = inputEditId?.value;
      const fullName = (inputEditFullname?.value || "").trim();
      const phone = (inputEditPhone?.value || "").trim();
      const relationRole = selectEditRole?.value;
      const isPrimary = checkEditPrimary?.checked;

      const res = updateParent(parentId, {
        fullName,
        phone,
        relationRole,
        isPrimary,
      });
      if (res.success) {
        closeEditModal();
        showToast("Данные родителя обновлены");
        setTimeout(() => {
          updateQueryUrl({});
        }, 150);
      }
    });
  }

  function openLinkModal(parentId) {
    if (!modalLink) return;
    const db = getDB();
    const parent = (db.parents || []).find((p) => p.id === parentId);
    if (!parent) return;

    if (inputLinkId) inputLinkId.value = parent.id;
    if (linkDesc) linkDesc.textContent = `Родитель: ${parent.fullName}`;
    if (checkLinkPrimary) checkLinkPrimary.checked = false;

    modalLink.classList.remove("opacity-0", "pointer-events-none");
    modalLink.classList.add("opacity-100", "pointer-events-auto");
    if (modalLinkDialog) {
      modalLinkDialog.classList.remove("scale-95");
      modalLinkDialog.classList.add("scale-100");
    }
  }

  function closeLinkModal() {
    if (!modalLink) return;
    modalLink.classList.remove("opacity-100", "pointer-events-auto");
    modalLink.classList.add("opacity-0", "pointer-events-none");
    if (modalLinkDialog) {
      modalLinkDialog.classList.remove("scale-100");
      modalLinkDialog.classList.add("scale-95");
    }
  }

  if (btnCloseLinkX) btnCloseLinkX.addEventListener("click", closeLinkModal);
  if (btnCancelLink) btnCancelLink.addEventListener("click", closeLinkModal);
  if (modalLink) {
    modalLink.addEventListener("click", (e) => {
      if (e.target === modalLink) closeLinkModal();
    });
  }

  document.querySelectorAll(".btn-action-link-parent").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pId = btn.getAttribute("data-parent-id");
      if (pId) openLinkModal(pId);
    });
  });

  if (formLink) {
    formLink.addEventListener("submit", (e) => {
      e.preventDefault();
      const parentId = inputLinkId?.value;
      const studentId = selectLinkStudent?.value;
      const relationRole = selectLinkRole?.value || "Опекун";
      const isPrimary = checkLinkPrimary?.checked || false;

      const res = linkParentToStudent(parentId, studentId, {
        relationRole,
        isPrimary,
      });
      if (res.success) {
        closeLinkModal();
        showToast("Связь с учеником успешно создана");
        setTimeout(() => {
          updateQueryUrl({});
        }, 150);
      }
    });
  }

  document.querySelectorAll(".btn-action-delete-parent").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.getAttribute("data-parent-id");
      if (!parentId) return;
      const res = deleteParent(parentId);
      if (!res.success) {
        showToast(
          res.error || "Сначала снимите связь с учеником в карточке или сводке",
        );
        return;
      }
      showToast("Родитель удалён из базы");
      setTimeout(() => {
        updateQueryUrl({});
      }, 150);
    });
  });
}
