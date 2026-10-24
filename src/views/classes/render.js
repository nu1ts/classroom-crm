import { getDB, getCurrentUser } from "../../services/storage.js";
import { renderIcon } from "../../components/icons.js";
import { hrefFor } from "../../services/navigation.js";

export function renderClassesView() {
  const db = getDB();
  const currentUser = getCurrentUser();

  const teacher = (db.teachers || []).find(
    (t) =>
      (currentUser && t.accountUserId === currentUser.id) ||
      (currentUser && currentUser.personName && t.fullName === currentUser.personName) ||
      (currentUser && currentUser.shortName && t.shortName === currentUser.shortName),
  );

  const workload = teacher && Array.isArray(teacher.workload) ? teacher.workload : [];
  const totalHours = workload.reduce((sum, w) => sum + (Number(w.hours) || 0), 0);
  const uniqueClassesCount = new Set(workload.map((w) => w.className || w.classId)).size;

  const cardsHtml =
    workload.length > 0
      ? workload
          .map((w) => {
            const classObj = (db.classes || []).find(
              (c) => c.id === w.classId || c.name === w.className,
            );
            const classDisplayName = classObj ? classObj.name : w.className || "—";
            const subjectObj = (db.subjects || []).find((s) => s.id === w.subjectId);
            const subjectDisplayName =
              w.subjectLabel ||
              (subjectObj ? subjectObj.name || subjectObj.shortName : "Предмет");

            const studentCount = (db.students || []).filter(
              (s) => s.classId === w.classId || s.className === classDisplayName,
            ).length;

            const journalUrl = `/journal?class=${encodeURIComponent(w.classId)}&subject=${encodeURIComponent(w.subjectId)}`;
            const scheduleUrl = `/schedule?class=${encodeURIComponent(w.classId)}`;

            return `
              <div class="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
                   data-class-card="${classDisplayName}"
                   data-class-id="${w.classId}"
                   data-subject="${w.subjectId}"
                   data-subject-label="${subjectDisplayName}"
                   data-hours="${w.hours}">
                <div>
                  <div class="flex items-center justify-between mb-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-xl text-sm font-bold bg-brand-50 text-brand-700 border border-brand-200/80 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-200">
                      ${classDisplayName} класс
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      ${w.hours} ч / нед
                    </span>
                  </div>

                  <h3 class="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors mb-2">
                    ${subjectDisplayName}
                  </h3>

                  <div class="space-y-2 mb-6 text-xs text-slate-500">
                    <div class="flex items-center space-x-2">
                      <span class="text-slate-400">${renderIcon("users", "w-4 h-4")}</span>
                      <span>${studentCount > 0 ? `${studentCount} учеников` : "Состав уточняется"}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-slate-400">${renderIcon("calendar", "w-4 h-4")}</span>
                      <span>Нагрузка: ${w.hours} академических часов</span>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-slate-100 flex items-center space-x-3">
                  <a href="${hrefFor(journalUrl)}"
                     data-action="open-journal"
                     data-class-id="${w.classId}"
                     data-subject-id="${w.subjectId}"
                     class="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs">
                    <span>${renderIcon("book-open", "w-4 h-4")}</span>
                    <span>Журнал</span>
                  </a>
                  <a href="${hrefFor(scheduleUrl)}"
                     data-action="open-schedule"
                     data-class-id="${w.classId}"
                     title="Расписание уроков класса"
                     class="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs transition-colors">
                    <span>${renderIcon("calendar", "w-4 h-4")}</span>
                  </a>
                </div>
              </div>
            `;
          })
          .join("")
      : `
        <div class="col-span-full bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
            ${renderIcon("grid", "w-7 h-7")}
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">Нагрузка не назначена</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            В данный момент за вами не закреплены учебные классы и часы. Обратитесь к администратору для распределения нагрузки.
          </p>
        </div>
      `;

  return `
    <div class="space-y-6 animate-fadeIn pb-12">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2.5 mb-1">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Мои классы</h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/80">
              ${teacher ? teacher.shortName : "Учитель"}
            </span>
          </div>
          <p class="text-xs text-slate-500">
            Учебные классы и предметы в соответствии с текущей нагрузкой
          </p>
        </div>

        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span class="text-brand-500">${renderIcon("grid", "w-4 h-4")}</span>
            <span class="text-xs font-semibold text-slate-600">Классов:</span>
            <span class="text-xs font-bold text-slate-900" id="stat-classes-count">${uniqueClassesCount}</span>
          </div>
          <div class="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span class="text-emerald-500">${renderIcon("calendar", "w-4 h-4")}</span>
            <span class="text-xs font-semibold text-slate-600">Всего часов:</span>
            <span class="text-xs font-bold text-slate-900" id="stat-hours-count">${totalHours} ч / нед</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="classes-cards-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}
