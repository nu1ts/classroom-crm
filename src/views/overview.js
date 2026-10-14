import { getDB } from '../services/storage.js';

export function renderOverviewView() {
  const db = getDB();
  const meta = db.meta || {};

  return `
    <div class="space-y-6 animate-fadeIn">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Всего учеников</span>
          <div class="mt-3">
            <span class="text-4xl font-extrabold text-slate-900 tracking-tight">${meta.studentsCount || 28}</span>
          </div>
          <div class="mt-2 text-xs font-medium text-emerald-600 flex items-center space-x-1">
            <span>15 мальчиков / 13 девочек</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Посещаемость сегодня</span>
          <div class="mt-3">
            <span class="text-4xl font-extrabold text-brand-500 tracking-tight">${meta.todayAttendancePercentage || 96.4}%</span>
          </div>
          <div class="mt-2 text-xs font-medium text-rose-500 flex items-center space-x-1">
            <span>1 отсутствующий из 28</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Средний балл класса</span>
          <div class="mt-3">
            <span class="text-4xl font-extrabold text-slate-900 tracking-tight">${meta.classAverageGrade || 4.2}</span>
          </div>
          <div class="mt-2 text-xs font-medium text-amber-600 flex items-center space-x-1">
            <span>За I четверть (+0.1 к прошлой)</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold text-slate-900">Зона риска (3)</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500 text-white">
                Важно
              </span>
            </div>

            <div class="space-y-3">
              <div class="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start space-x-3">
                  <span class="text-rose-500 mt-0.5 text-base">⚠️</span>
                  <div>
                    <div class="font-bold text-sm text-slate-900">Сидоров Никита</div>
                    <div class="text-xs text-slate-600 mt-0.5">
                      <span class="font-semibold text-slate-700">[Пропуски]</span> Пропуск 3 дней подряд без подтверждённой уважительной причины.
                    </div>
                  </div>
                </div>
                <button type="button" class="sm:flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors">
                  Зафиксировать контакт
                </button>
              </div>

              <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start space-x-3">
                  <span class="text-amber-500 mt-0.5 text-base">⚠️</span>
                  <div>
                    <div class="font-bold text-sm text-slate-900">Петрова Анна</div>
                    <div class="text-xs text-slate-600 mt-0.5">
                      <span class="font-semibold text-slate-700">[Оценки]</span> Снижение средней успеваемости по математике с 4.5 до 3.6.
                    </div>
                  </div>
                </div>
                <a href="#/students" class="sm:flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs text-center transition-colors">
                  Открыть сводку
                </a>
              </div>

              <div class="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start space-x-3">
                  <span class="text-rose-500 mt-0.5 text-base">⚠️</span>
                  <div>
                    <div class="font-bold text-sm text-slate-900">Кузнецов Данила</div>
                    <div class="text-xs text-slate-600 mt-0.5">
                      <span class="font-semibold text-slate-700">[Заметка]</span> Конфликтная ситуация на уроке истории 24.10. Требуется комментарий.
                    </div>
                  </div>
                </div>
                <button type="button" class="sm:flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors">
                  Написать заметку
                </button>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-4">
              Расписание на сегодня (Пн, 28 окт)
            </h2>

            <div class="divide-y divide-slate-100">
              <div class="py-3 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-xs font-semibold text-slate-500 w-24">08:30 - 09:15</span>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Разговоры о важном</div>
                    <div class="text-xs text-slate-500">Смирнова М. В. (Каб. 302)</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500 text-white">Проведено</span>
              </div>

              <div class="py-3 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-xs font-semibold text-slate-500 w-24">09:30 - 10:15</span>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Математика (Алгебра)</div>
                    <div class="text-xs text-slate-500">Козлов А. П. (Каб. 204)</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-brand-500 text-white animate-pulse">Проводится</span>
              </div>

              <div class="py-3 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-xs font-semibold text-slate-500 w-24">10:30 - 11:15</span>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Русский язык</div>
                    <div class="text-xs text-slate-500">Иванова Е. С. (Каб. 302)</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-500 text-white">Ожидается</span>
              </div>

              <div class="py-3 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-xs font-semibold text-slate-500 w-24">11:30 - 12:15</span>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Физика</div>
                    <div class="text-xs text-slate-500">Дмитриев Д. К. (Каб. 401)</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-500 text-white">Ожидается</span>
              </div>

              <div class="py-3 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-xs font-semibold text-slate-500 w-24">12:35 - 13:20</span>
                  <div>
                    <div class="text-sm font-bold text-slate-800">Физкультура</div>
                    <div class="text-xs text-slate-500">Новиков С. А. (Спортзал)</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-500 text-white">Ожидается</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-4">Родительское собрание</h2>
            <div class="p-5 rounded-2xl bg-brand-50/60 border border-brand-100 flex flex-col justify-between">
              <div>
                <div class="flex items-center space-x-2 text-brand-700 font-bold text-sm mb-3">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                  <span>31.10.2024, 18:30</span>
                </div>
                <div class="text-sm font-bold text-slate-900 mb-1">
                  Итоги первой четверти 7Б
                </div>
                <p class="text-xs text-slate-600 leading-relaxed mb-4">
                  Повестка: Успеваемость, предстоящие каникулы, экскурсионная поездка в музей.
                </p>
              </div>
              <a href="#/meetings" class="block w-full py-2 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs text-center shadow-sm shadow-brand-500/30 transition-colors">
                Список участников
              </a>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-4">Быстрые действия</h2>
            <div class="space-y-2.5">
              <a href="#/announcements" class="block w-full py-2.5 px-4 rounded-xl border border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold text-xs text-center transition-colors">
                Новое объявление родителям
              </a>
              <a href="#/analytics" class="block w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs text-center transition-colors">
                Сформировать отчёт 7Б
              </a>
              <a href="#/meetings" class="block w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs text-center transition-colors">
                Создать собрание
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
