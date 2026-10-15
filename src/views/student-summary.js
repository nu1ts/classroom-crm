import { getDB, saveDB, confirmAbsenceRecord, addParentContact, addStudentNote } from '../services/storage.js';
import { calculateStudentAverage, calculateStudentAttendance, getRiskZoneStudents } from '../mock/calculations.js';
import { renderIcon } from '../components/icons.js';

function formatDateRu(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoDate;
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return 13;
  const birth = new Date(birthDateStr);
  const now = new Date(2024, 9, 28);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function daysWordRu(count) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'дней';
  if (n1 > 1 && n1 < 5) return 'дня';
  if (n1 === 1) return 'день';
  return 'дней';
}

function getChannelBadge(channel) {
  switch (channel) {
    case 'phone':
      return { label: 'Звонок', color: 'bg-slate-100 text-slate-700' };
    case 'chat':
      return { label: 'Мессенджер', color: 'bg-sky-50 text-sky-700' };
    case 'personal':
    case 'meeting':
      return { label: 'Личная беседа', color: 'bg-indigo-50 text-indigo-700' };
    case 'letter':
      return { label: 'Письмо', color: 'bg-emerald-50 text-emerald-700' };
    default:
      return { label: 'Контакт', color: 'bg-slate-100 text-slate-700' };
  }
}

function formatAbsenceDisplayText(record) {
  const isConfirmed = record.status === 'confirmed' || record.status === 'excused';
  const r = (record.reason || '').trim();
  const d = (record.document || '').trim();

  if (!isConfirmed) {
    return r || 'Причина не подтверждена';
  }

  if (!r && !d) {
    return 'Уважительная причина (подтверждено)';
  }

  const isIllness = r.toLowerCase().includes('болезн') || d.toLowerCase().includes('болезн') ||
    r.toLowerCase().includes('орви') || d.toLowerCase().includes('орви') ||
    r.toLowerCase() === 'справка' || d.toLowerCase().includes('справка') ||
    d.toLowerCase().includes('мед');

  if (isIllness) {
    const hasSpecificDoc = d && !d.toLowerCase().includes('справка орви') && d.toLowerCase() !== 'справка' && d.toLowerCase() !== 'медицинская справка';
    let diag = '';
    const cleanR = r.replace(/^по болезни\s*/i, '').replace(/^\(|\)$/g, '').trim();
    if (cleanR && !['справка', 'болезнь', 'болезнь / справка', 'по болезни'].includes(cleanR.toLowerCase())) {
      diag = cleanR;
    }

    if (diag) {
      if (hasSpecificDoc) {
        return `По болезни (${diag}, ${d})`;
      }
      return `По болезни (${diag}, справка предоставлена)`;
    } else {
      if (hasSpecificDoc) {
        return `По болезни (${d})`;
      }
      return 'По болезни (справка предоставлена)';
    }
  }

  if (r.toLowerCase().includes('заявление') || d.toLowerCase().includes('заявление')) {
    const details = (r && !r.toLowerCase().includes('заявление')) ? r : 'по семейным обстоятельствам';
    return `Заявление родителей (${details})`;
  }

  if (r && d) {
    if (r.toLowerCase() === d.toLowerCase()) return r;
    return `${r} (${d})`;
  }

  return r || d || 'Уважительная причина (подтверждено)';
}

export function renderStudentSummaryView(options = {}) {
  const db = getDB();
  const periodId = options.periodId || 'q1_2024';
  const studentId = options.studentId || options.id || 'st-23';

  let student = (db.students || []).find(s => s.id === studentId);
  let isOtherClassStudent = false;

  if (!student) {
    for (const p of (db.parents || [])) {
      if (p.otherChildren && p.otherChildren.length > 0) {
        const foundOc = p.otherChildren.find(oc => oc.id === studentId || `ext-${encodeURIComponent(oc.name)}` === studentId || `ext-${oc.name}` === studentId || studentId.toLowerCase().includes('darya') || studentId.toLowerCase().includes('дарья'));
        if (foundOc) {
          student = {
            id: studentId,
            classId: `class-${(foundOc.class || '9v').toLowerCase()}`,
            className: foundOc.class || '9В',
            fullName: foundOc.name,
            firstName: foundOc.name.split(' ')[1] || 'Дарья',
            lastName: foundOc.name.split(' ')[0] || 'Котова',
            birthDate: '2009-04-12',
            gender: 'F',
            status: 'active',
            parentId: p.id,
            parentName: p.fullName
          };
          isOtherClassStudent = true;
          break;
        }
      }
    }
  }

  if (!student) {
    return `
      <div class="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          ${renderIcon('alert', 'w-8 h-8')}
        </div>
        <h2 class="text-xl font-bold text-slate-900">Ученик не найден</h2>
        <p class="text-sm text-slate-500">Ученик с идентификатором «${studentId}» не зарегистрирован в системе или был удалён.</p>
        <div class="pt-2">
          <a href="#/students" class="inline-flex items-center px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors">
            Вернуться к списку учеников
          </a>
        </div>
      </div>
    `;
  }

  const overallAverage = calculateStudentAverage(db.grades, student.id, { periodId });
  const avgColorClass = overallAverage === null
    ? 'text-slate-400'
    : overallAverage < 3.5
      ? 'text-rose-600'
      : overallAverage >= 4.5
        ? 'text-emerald-500'
        : 'text-slate-900';

  const attendanceStats = calculateStudentAttendance(db.lessons, db.attendance, student.id, { periodId });

  const riskList = getRiskZoneStudents(db.students, db.lessons, db.attendance, db.grades, db.subjects, { periodId });
  const isRisk = riskList.some(r => r.studentId === student.id);
  const riskItem = riskList.find(r => r.studentId === student.id);

  const q1LessonIds = new Set((db.lessons || []).filter(l => !l.periodId || l.periodId === periodId).map(l => l.id));
  const studentAbsences = (db.attendance || []).filter(
    a => a.studentId === student.id && a.value === 'absent' && q1LessonIds.has(a.lessonId)
  );

  const absencesByDateMap = new Map();
  studentAbsences.forEach(rec => {
    const lesson = (db.lessons || []).find(l => l.id === rec.lessonId);
    const date = lesson ? lesson.date : '2024-10-24';
    if (!absencesByDateMap.has(date)) {
      absencesByDateMap.set(date, []);
    }
    absencesByDateMap.get(date).push({ record: rec, lesson });
  });

  const totalAbsenceDays = absencesByDateMap.size;
  let excusedAbsenceDays = 0;
  absencesByDateMap.forEach(records => {
    const isExcused = records.some(r =>
      r.record.status === 'excused' ||
      r.record.status === 'confirmed' ||
      (r.record.reason && (r.record.reason.toLowerCase().includes('болезн') || r.record.reason.toLowerCase().includes('справк') || r.record.reason.toLowerCase().includes('орви')))
    );
    if (isExcused) excusedAbsenceDays++;
  });

  const rels = (db.parentStudentRelations || []).filter(r => r.studentId === student.id);
  const parentContactsList = rels.map(rel => {
    const parent = (db.parents || []).find(p => p.id === rel.parentId);
    return {
      rel,
      parent,
      relationRole: rel.relationRole || rel.relation || 'Родитель',
      isPrimary: rel.isPrimary === true || rel.isPrimaryContact === true
    };
  }).filter(item => item.parent);

  parentContactsList.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  const rawContacts = (db.parentContacts || []).filter(c => c.studentId === student.id);
  const contactsHistory = [...rawContacts].sort((a, b) => {
    const dtA = `${a.date || ''} ${a.time || ''}`;
    const dtB = `${b.date || ''} ${b.time || ''}`;
    return dtB.localeCompare(dtA);
  });

  const rawNotes = (db.notes || []).filter(n => n.studentId === student.id);
  const notesHistory = [...rawNotes].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const pendingContact = contactsHistory.find(c => !c.agreementReached && c.nextContactDate);

  const subjectsData = (db.subjects || []).map(subj => {
    const avg = calculateStudentAverage(db.grades, student.id, { periodId, subjectId: subj.id });
    const gradesCount = (db.grades || []).filter(g => g.studentId === student.id && g.subjectId === subj.id && g.periodId === periodId).length;
    return {
      ...subj,
      average: avg,
      gradesCount
    };
  });

  const studentGrades = (db.grades || []).filter(g => g.studentId === student.id && (!g.periodId || g.periodId === periodId))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const sortedDates = Array.from(absencesByDateMap.keys()).sort((a, b) => b.localeCompare(a));

  return `
    <div id="student-summary-view" class="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <nav class="flex items-center space-x-2 text-xs font-medium text-slate-500">
        <a href="#/overview" class="hover:text-brand-600 transition-colors">${isOtherClassStudent ? `Класс ${student.className || '9В'}` : 'Класс 7Б'}</a>
        <span class="text-slate-300">/</span>
        <a href="${isOtherClassStudent && student.parentId ? `#/parent?id=${student.parentId}` : '#/students'}" class="hover:text-brand-600 transition-colors">${isOtherClassStudent ? 'Родители' : 'Ученики'}</a>
        <span class="text-slate-300">/</span>
        <span class="text-slate-900 font-semibold truncate">${student.fullName}</span>
      </nav>

      ${isOtherClassStudent ? `
        <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div class="flex items-center space-x-2">
            ${renderIcon('alert', 'w-4 h-4 text-amber-600')}
            <span>Данные ученика из другого класса (${student.className || '9В'}) доступны только для чтения</span>
          </div>
          <a href="#/parent?id=${student.parentId || 'pr-10'}" class="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 rounded-xl transition-colors text-amber-950 font-bold">
            Вернуться к родителю
          </a>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 text-center">

            <div class="w-20 h-20 mx-auto mb-3.5 rounded-full bg-gradient-to-br from-indigo-50 to-brand-50 border-2 border-brand-200/80 text-brand-700 font-extrabold text-2xl flex items-center justify-center shadow-2xs select-none">
              ${student.firstName ? student.firstName[0] : ''}${student.lastName ? student.lastName[0] : ''}
            </div>

            <h1 class="text-lg font-bold text-slate-900 leading-snug">${student.fullName}</h1>
            <p class="text-xs text-slate-500 mt-1">
              Дата рождения: ${formatDateRu(student.birthDate)} (${calculateAge(student.birthDate)} лет)
            </p>

            <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isOtherClassStudent ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                ${isOtherClassStudent ? `${student.className || '9В'} класс · Обучается в другом классе` : '7Б · Активен'}
              </span>
              ${isRisk ? `
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200" title="${riskItem?.reasons?.join(', ') || 'В зоне риска'}">
                  ${renderIcon('alert', 'w-3.5 h-3.5 mr-1 text-rose-500')} В зоне риска
                </span>
              ` : ''}
            </div>

            <hr class="border-slate-100 my-5" />

            <div class="text-left space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Контакты родителей</h3>
              </div>

              ${parentContactsList.length === 0 ? `
                <p class="text-xs text-slate-400 italic">Контакты родителей не внесены в базу</p>
              ` : `
                <div class="space-y-3">
                  ${parentContactsList.map(item => `
                    <div class="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-colors">
                      <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-xs font-bold text-slate-900">${item.relationRole}: ${item.parent.fullName}</span>
                        ${item.isPrimary ? `
                          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex-shrink-0">
                            Основной контакт
                          </span>
                        ` : ''}
                      </div>
                      <div class="text-xs text-slate-600 flex items-center space-x-1.5 mt-1">
                        <span class="text-slate-400">Телефон:</span>
                        <a href="tel:${item.parent.phone}" class="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                          ${item.parent.phone}
                        </a>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            ${pendingContact ? `
              <div class="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-left space-y-1">
                <div class="flex items-center space-x-1.5 text-amber-800 text-xs font-bold">
                  ${renderIcon('calendar', 'w-3.5 h-3.5 text-amber-600')}
                  <span>Напоминание о повторном контакте</span>
                </div>
                <div class="text-xs text-amber-900">
                  Дата: <strong class="font-semibold">${formatDateRu(pendingContact.nextContactDate)}</strong>
                </div>
                <div class="text-[11px] text-amber-700">
                  Договорённость ранее не была достигнута. Требуется контрольная беседа.
                </div>
              </div>
            ` : ''}

          </div>
        </div>

        <div class="lg:col-span-8 space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90">
              <div class="text-xs font-medium text-slate-500">Средний балл</div>
              <div class="text-3xl font-extrabold ${avgColorClass} mt-1">
                ${overallAverage !== null ? overallAverage.toFixed(1) : '—'}
              </div>
              <div class="text-[11px] text-slate-400 mt-1">за I четверть 2024</div>
            </div>

            <div class="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90">
              <div class="text-xs font-medium text-slate-500">Пропусков всего</div>
              <div class="text-3xl font-extrabold text-slate-900 mt-1">
                ${totalAbsenceDays} ${daysWordRu(totalAbsenceDays)}
              </div>
              <div class="text-[11px] text-slate-400 mt-1">${studentAbsences.length} уроков за период</div>
            </div>

            <div class="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90">
              <div class="text-xs font-medium text-slate-500">Из них по болезни</div>
              <div class="text-3xl font-extrabold text-brand-600 mt-1">
                ${excusedAbsenceDays} ${daysWordRu(excusedAbsenceDays)}
              </div>
              <div class="text-[11px] text-slate-400 mt-1">подтверждены справками</div>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-900">Успеваемость по предметам</h3>
                <p class="text-xs text-slate-500 mt-0.5">Текущие средние баллы за период</p>
              </div>
              <button type="button" id="btn-toggle-grades-journal" class="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1 cursor-pointer">
                <span>Журнал оценок (${studentGrades.length})</span>
                ${renderIcon('chevron-down', 'w-4 h-4 transition-transform duration-200')}
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${subjectsData.map(sub => {
    const isSubRisk = sub.average !== null && sub.average < 3.5;
    const badgeColor = sub.average === null
      ? 'text-slate-400 bg-slate-50 border-slate-200'
      : isSubRisk
        ? 'text-rose-600 bg-rose-50 border-rose-200'
        : sub.average >= 4.5
          ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
          : 'text-slate-800 bg-slate-50 border-slate-200';

    return `
                  <div class="p-3.5 rounded-2xl border ${badgeColor} transition-all">
                    <div class="text-xs font-semibold text-slate-700 truncate" title="${sub.name}">${sub.name}</div>
                    <div class="flex items-baseline justify-between mt-1">
                      <span class="text-xl font-bold">${sub.average !== null ? sub.average.toFixed(1) : '—'}</span>
                      <span class="text-[11px] text-slate-400">${sub.gradesCount} ${sub.gradesCount === 1 ? 'оценка' : 'оценок'}</span>
                    </div>
                  </div>
                `;
  }).join('')}
            </div>

            <div id="grades-journal-wrapper" class="hidden pt-3 border-t border-slate-100">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Хронологический список оценок</h4>
              ${studentGrades.length === 0 ? `
                <p class="text-xs text-slate-400 italic">Оценок пока нет</p>
              ` : `
                <div class="overflow-x-auto max-h-56 scrollbar-thin">
                  <table class="w-full text-xs text-left">
                    <thead>
                      <tr class="text-slate-400 border-b border-slate-100">
                        <th class="py-2 font-medium">Дата</th>
                        <th class="py-2 font-medium">Предмет</th>
                        <th class="py-2 font-medium">Оценка</th>
                        <th class="py-2 font-medium">Тема / Комментарий</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${studentGrades.map(g => {
    const subj = (db.subjects || []).find(s => s.id === g.subjectId);
    const valClass = g.value >= 4 ? 'text-emerald-600 font-bold' : (g.value <= 2 ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold');
    return `
                          <tr class="hover:bg-slate-50">
                            <td class="py-2 text-slate-500">${formatDateRu(g.date)}</td>
                            <td class="py-2 font-semibold text-slate-800">${subj ? subj.name : '—'}</td>
                            <td class="py-2 ${valClass} text-sm">${g.value}</td>
                            <td class="py-2 text-slate-500">${g.comment || g.topic || 'Ответ на уроке'}</td>
                          </tr>
                        `;
  }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-900">Последние пропуски занятий</h3>
                <p class="text-xs text-slate-500 mt-0.5">История отсутствий и статус справок</p>
              </div>
            </div>

            ${sortedDates.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400 rounded-2xl bg-slate-50/50 border border-slate-100">
                За данный период пропусков уроков не зафиксировано
              </div>
            ` : `
              <div class="divide-y divide-slate-100">
                ${sortedDates.map(date => {
    const records = absencesByDateMap.get(date);
    const isAllConfirmed = records.every(r => r.record.status === 'confirmed' || r.record.status === 'excused');
    const firstRecord = records[0].record;
    const displayText = formatAbsenceDisplayText(firstRecord);
    const totalLessonsCount = records.length;
    const lessonText = totalLessonsCount >= 5 ? `Все уроки (${totalLessonsCount})` : `${totalLessonsCount} ${totalLessonsCount === 1 ? 'урок' : 'урока'}`;

    return `
                    <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div class="flex items-center space-x-4">
                        <div class="text-xs font-bold text-slate-900 min-w-[75px]">${formatDateRu(date)}</div>
                        <div class="text-xs text-slate-500 min-w-[100px]">${lessonText}</div>
                        <div class="text-xs text-slate-700">
                          ${displayText}
                        </div>
                      </div>

                      <div class="flex items-center flex-shrink-0">
                        ${isAllConfirmed ? `
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-2xs">
                            Подтверждено
                          </span>
                        ` : isOtherClassStudent ? `
                          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Только просмотр
                          </span>
                        ` : `
                          <button type="button"
                                  class="btn-confirm-absence-action inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:border-amber-400 shadow-2xs transition-all cursor-pointer group"
                                  data-absence-ids="${records.map(r => r.record.id).join(',')}"
                                  data-student-name="${student.fullName}"
                                  data-date="${date}"
                                  title="Нажмите для подтверждения уважительной причины">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Подтвердить причину</span>
                            ${renderIcon('chevron-right', 'w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform')}
                          </button>
                        `}
                      </div>
                    </div>
                  `;
  }).join('')}
              </div>
            `}
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-900">История общения с родителями</h3>
                <p class="text-xs text-slate-500 mt-0.5">Контакты классного руководителя с родителями</p>
              </div>
              ${!isOtherClassStudent ? `
                <button type="button" id="btn-open-contact-modal" class="px-3.5 py-2 rounded-xl border border-brand-500 text-brand-600 hover:bg-brand-50 text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer">
                  ${renderIcon('plus', 'w-3.5 h-3.5 text-brand-600')}
                  <span>Добавить запись</span>
                </button>
              ` : `
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Только просмотр
                </span>
              `}
            </div>

            ${contactsHistory.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400 rounded-2xl bg-slate-50/50 border border-slate-100">
                Записей контактов с родителями пока нет.
              </div>
            ` : `
              <div class="space-y-3.5" id="parent-contacts-history-container">
                ${contactsHistory.map(c => {
    const badge = getChannelBadge(c.channel);
    const parent = (db.parents || []).find(p => p.id === c.parentId);

    return `
                    <div class="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2">
                      <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center space-x-2">
                          <span class="text-xs font-bold text-slate-900">${formatDateRu(c.date)}</span>
                          <span class="text-slate-400 text-xs">·</span>
                          <span class="text-xs text-slate-500">Автор: <strong class="text-slate-700 font-semibold">${c.author || 'Смирнова М. В.'}</strong></span>
                        </div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badge.color}">
                          ${c.channelLabel || badge.label}
                        </span>
                      </div>

                      ${parent ? `
                        <div class="text-xs text-slate-500">
                          Родитель: <strong class="text-slate-800 font-medium">${parent.fullName}</strong>
                        </div>
                      ` : ''}

                      <p class="text-xs text-slate-700 leading-relaxed">${c.summary}</p>

                      <div class="pt-1 flex items-center space-x-2">
                        ${c.agreementReached ? `
                          <span class="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ${renderIcon('check', 'w-3 h-3 mr-1 text-emerald-600')} Договорённость достигнута
                          </span>
                        ` : (c.nextContactDate ? `
                          <span class="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            ${renderIcon('calendar', 'w-3 h-3 mr-1 text-amber-600')} Повторный контакт: ${formatDateRu(c.nextContactDate)}
                          </span>
                        ` : `
                          <span class="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Договорённость не закрыта
                          </span>
                        `)}
                      </div>
                    </div>
                  `;
  }).join('')}
              </div>
            `}
          </div>

          <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="text-base font-bold text-slate-900">Заметки классрука</h3>
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Приватно (только для классрука)
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Педагогические наблюдения за поведением и развитием</p>
              </div>
              ${!isOtherClassStudent ? `
                <button type="button" id="btn-open-note-modal" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer">
                  ${renderIcon('plus', 'w-3.5 h-3.5 text-white')}
                  <span>Добавить заметку</span>
                </button>
              ` : `
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Только просмотр
                </span>
              `}
            </div>

            ${notesHistory.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400 rounded-2xl bg-slate-50/50 border border-slate-100">
                Заметок классного руководителя пока нет.
              </div>
            ` : `
              <div class="space-y-3" id="student-notes-history-container">
                ${notesHistory.map(n => `
                  <div class="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-1.5">
                    <div class="flex items-center justify-between text-xs text-slate-400">
                      <span>${n.date || '—'}</span>
                      <span class="font-medium text-slate-600">Автор: ${n.author || 'Смирнова М. В.'}</span>
                    </div>
                    <p class="text-xs text-slate-800 leading-relaxed font-medium">${n.text}</p>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

      </div>

      ${!isOtherClassStudent ? `
        <div id="modal-contact-parent" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
          <div id="modal-contact-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  ${renderIcon('phone', 'w-4 h-4 text-brand-600')}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Зафиксировать контакт</h3>
                  <p class="text-xs text-slate-500">Запись о состоявшемся разговоре</p>
                </div>
              </div>
              <button type="button" id="btn-close-contact-modal-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                ${renderIcon('x', 'w-4 h-4')}
              </button>
            </div>

            <form id="form-contact-parent" class="py-4 space-y-3.5 text-xs">
              <div id="contact-error-box" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="contact-date" class="block font-semibold text-slate-700 mb-1.5">Дата <span class="text-rose-500">*</span></label>
                  <input type="date" id="contact-date" required
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer" />
                </div>

                <div>
                  <label for="contact-channel-select" class="block font-semibold text-slate-700 mb-1.5">Канал связи <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <select id="contact-channel-select" required
                            class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                      <option value="">Выберите канал</option>
                      <option value="phone" selected>Звонок</option>
                      <option value="personal">Личная беседа</option>
                      <option value="chat">Мессенджер</option>
                      <option value="letter">Письмо</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      ${renderIcon('chevron-down', 'w-4 h-4')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label for="contact-parent-select" class="block font-semibold text-slate-700 mb-1.5">Родитель / представитель <span class="text-rose-500">*</span></label>
                <div class="relative">
                  <select id="contact-parent-select" required
                          class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    ${parentContactsList.map(item => `
                      <option value="${item.parent.id}" ${item.isPrimary ? 'selected' : ''}>
                        ${item.parent.fullName} (${item.relationRole}) ${item.isPrimary ? '★ Основной контакт' : ''}
                      </option>
                    `).join('')}
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon('chevron-down', 'w-4 h-4')}
                  </div>
                </div>
              </div>

              <div>
                <label for="contact-summary-input" class="block font-semibold text-slate-700 mb-1.5">Итог разговора <span class="text-rose-500">*</span></label>
                <textarea id="contact-summary-input" rows="3" required placeholder="Кратко опишите содержание беседы и договоренности..."
                          class="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
              </div>

              <label for="contact-agreement-checkbox" class="flex items-start p-3 rounded-2xl bg-slate-50 border border-slate-200/90 transition-colors cursor-pointer space-x-2.5">
                <input type="checkbox" id="contact-agreement-checkbox" checked class="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 cursor-pointer" />
                <div class="text-xs text-slate-700 select-none">
                  <span class="font-bold text-slate-900">Договорённость достигнута</span>
                  <p class="text-[11px] text-slate-500">Причина подтверждена или согласован план действий</p>
                </div>
              </label>

              <div id="contact-reminder-date-wrapper" class="hidden p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <label for="contact-next-date-input" class="block font-semibold text-amber-900">
                  Напоминание о повторном контакте (дата)
                </label>
                <input type="date" id="contact-next-date-input"
                       class="w-full h-10 px-3.5 rounded-xl border border-amber-300 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all cursor-pointer" />
              </div>

              <div class="pt-2 flex items-center space-x-3">
                <button type="button" id="btn-cancel-contact-modal" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" id="btn-submit-contact-modal" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-add-note" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
          <div id="modal-note-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  ${renderIcon('message-square', 'w-4 h-4 text-slate-700')}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Заметка классного руководителя</h3>
                  <p class="text-xs text-slate-500">Педагогическое наблюдение</p>
                </div>
              </div>
              <button type="button" id="btn-close-note-modal-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                ${renderIcon('x', 'w-4 h-4')}
              </button>
            </div>

            <form id="form-add-note" class="py-4 space-y-3.5 text-xs">
              <div id="note-error-box" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

              <div>
                <label for="note-text-input" class="block font-semibold text-slate-700 mb-1.5">Текст заметки <span class="text-rose-500">*</span></label>
                <textarea id="note-text-input" rows="4" required placeholder="Запишите наблюдение (например: «Стал замкнут, нужна беседа с психологом»)..."
                          class="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
              </div>

              <label for="note-private-checkbox" class="flex items-start p-3 rounded-2xl bg-slate-50 border border-slate-200/90 transition-colors cursor-pointer space-x-2.5">
                <input type="checkbox" id="note-private-checkbox" checked class="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 cursor-pointer" />
                <div class="text-xs text-slate-700 select-none">
                  <span class="font-bold text-slate-900">Приватная заметка</span>
                  <p class="text-[11px] text-slate-500">Заметка видна только классному руководителю (не отображается ученику и родителю)</p>
                </div>
              </label>

              <div class="pt-2 flex items-center space-x-3">
                <button type="button" id="btn-cancel-note-modal" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" id="btn-submit-note-modal" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-confirm-student-absence" class="fixed inset-0 z-50 !m-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
          <div id="modal-confirm-dialog" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all duration-200 scale-95">
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  ${renderIcon('check', 'w-4 h-4 text-emerald-600')}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Подтверждение пропуска занятий</h3>
                  <p class="text-xs text-slate-500">Учёт уважительной причины и медицинских документов</p>
                </div>
              </div>
              <button type="button" id="btn-close-absence-modal-x" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                ${renderIcon('x', 'w-4 h-4')}
              </button>
            </div>

            <form id="form-confirm-student-absence" class="py-4 space-y-3.5 text-xs">
              <input type="hidden" id="absence-record-ids" />

              <div>
                <label for="confirm-reason-type" class="block font-semibold text-slate-700 mb-1.5">Тип причины</label>
                <div class="relative">
                  <select id="confirm-reason-type"
                          class="w-full h-10 appearance-none pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer">
                    <option value="excused">Уважительная (по справке от врача / заявлению родителей)</option>
                    <option value="unexcused">Неуважительная (прогул / причина не подтверждена)</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ${renderIcon('chevron-down', 'w-4 h-4')}
                  </div>
                </div>
              </div>

              <div id="block-absence-doc-fields" class="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <label for="confirm-has-doc-check" class="flex items-center space-x-2 cursor-pointer select-none">
                  <input type="checkbox" id="confirm-has-doc-check" checked class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                  <span class="text-xs font-semibold text-slate-800">Предоставлен подтверждающий документ (справка / заявление)</span>
                </label>

                <div>
                  <label for="confirm-doc-text-input" class="block font-semibold text-slate-700 mb-1">
                    Реквизиты документа (номер, дата, медучреждение)
                  </label>
                  <input type="text" id="confirm-doc-text-input"
                         placeholder="Справка № 142 от 25.10.2024 (ДГП № 1)"
                         class="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-2xs" />
                </div>
              </div>

              <div>
                <label for="confirm-absence-notes-input" class="block font-semibold text-slate-700 mb-1.5">Комментарий</label>
                <textarea id="confirm-absence-notes-input" rows="2" placeholder="Например: ОРВИ, постельный режим или семейные обстоятельства..."
                          class="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 resize-none shadow-2xs focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"></textarea>
              </div>

              <div class="pt-2 flex items-center space-x-3">
                <button type="button" id="btn-cancel-absence-modal" class="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer">
                  Подтвердить
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <div id="summary-toast" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none">
        <span id="summary-toast-icon">${renderIcon('check', 'w-4 h-4 text-emerald-400')}</span>
        <span id="summary-toast-message" class="text-xs font-medium"></span>
      </div>
    </div>
  `;
}

export function setupStudentSummaryListeners(onNavigate) {
  const hash = window.location.hash || '';
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  const studentId = params.get('id') || params.get('student') || 'st-23';

  function showToast(message, isSuccess = true) {
    const toast = document.getElementById('summary-toast');
    const msgEl = document.getElementById('summary-toast-message');
    const iconEl = document.getElementById('summary-toast-icon');
    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = message;
    iconEl.innerHTML = isSuccess ? renderIcon('check', 'w-4 h-4 text-emerald-400') : renderIcon('alert', 'w-4 h-4 text-rose-400');
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3200);
  }

  const toggleGradesBtn = document.getElementById('btn-toggle-grades-journal');
  const gradesJournalWrapper = document.getElementById('grades-journal-wrapper');
  if (toggleGradesBtn && gradesJournalWrapper) {
    toggleGradesBtn.addEventListener('click', () => {
      const isHidden = gradesJournalWrapper.classList.toggle('hidden');
      const icon = toggleGradesBtn.querySelector('svg');
      if (icon) {
        icon.classList.toggle('rotate-180', !isHidden);
      }
    });
  }

  const modalContact = document.getElementById('modal-contact-parent');
  const modalContactDialog = document.getElementById('modal-contact-dialog');
  const btnOpenContact = document.getElementById('btn-open-contact-modal');
  const btnCloseContactX = document.getElementById('btn-close-contact-modal-x');
  const btnCancelContact = document.getElementById('btn-cancel-contact-modal');
  const formContact = document.getElementById('form-contact-parent');
  const contactDateInput = document.getElementById('contact-date');
  const contactChannelSelect = document.getElementById('contact-channel-select');
  const contactSummaryInput = document.getElementById('contact-summary-input');
  const contactAgreementCheckbox = document.getElementById('contact-agreement-checkbox');
  const contactReminderWrapper = document.getElementById('contact-reminder-date-wrapper');
  const contactNextDateInput = document.getElementById('contact-next-date-input');
  const contactErrorBox = document.getElementById('contact-error-box');

  function openContactModal() {
    if (!modalContact) return;
    if (contactDateInput && !contactDateInput.value) {
      contactDateInput.value = '2024-10-28';
    }
    if (contactNextDateInput && !contactNextDateInput.value) {
      contactNextDateInput.value = '2024-11-05';
    }
    if (contactErrorBox) {
      contactErrorBox.classList.add('hidden');
      contactErrorBox.textContent = '';
    }
    modalContact.classList.remove('opacity-0', 'pointer-events-none');
    modalContact.classList.add('opacity-100', 'pointer-events-auto');
    if (modalContactDialog) {
      modalContactDialog.classList.remove('scale-95');
      modalContactDialog.classList.add('scale-100');
    }
  }

  function closeContactModal() {
    if (!modalContact) return;
    modalContact.classList.remove('opacity-100', 'pointer-events-auto');
    modalContact.classList.add('opacity-0', 'pointer-events-none');
    if (modalContactDialog) {
      modalContactDialog.classList.remove('scale-100');
      modalContactDialog.classList.add('scale-95');
    }
    if (formContact) formContact.reset();
    if (contactReminderWrapper) contactReminderWrapper.classList.add('hidden');
  }

  if (btnOpenContact) btnOpenContact.onclick = openContactModal;
  if (btnCloseContactX) btnCloseContactX.onclick = closeContactModal;
  if (btnCancelContact) btnCancelContact.onclick = closeContactModal;
  if (modalContact) {
    modalContact.addEventListener('click', (e) => {
      if (e.target === modalContact) closeContactModal();
    });
  }

  if (contactAgreementCheckbox && contactReminderWrapper) {
    contactAgreementCheckbox.addEventListener('change', () => {
      contactReminderWrapper.classList.toggle('hidden', contactAgreementCheckbox.checked);
    });
  }

  if (formContact) {
    formContact.addEventListener('submit', (e) => {
      e.preventDefault();

      const summary = (contactSummaryInput?.value || '').trim();
      const channel = contactChannelSelect?.value || '';
      const parentId = document.getElementById('contact-parent-select')?.value || '';
      const date = contactDateInput?.value || '2024-10-28';
      const agreementReached = contactAgreementCheckbox?.checked ?? true;
      const nextContactDate = (!agreementReached && contactNextDateInput) ? contactNextDateInput.value : null;

      if (!summary) {
        if (contactErrorBox) {
          contactErrorBox.textContent = 'Поле «Итог» обязательно для заполнения';
          contactErrorBox.classList.remove('hidden');
        }
        if (contactSummaryInput) {
          contactSummaryInput.classList.add('border-rose-500');
          contactSummaryInput.focus();
        }
        return;
      }

      if (!channel) {
        if (contactErrorBox) {
          contactErrorBox.textContent = 'Выберите канал связи';
          contactErrorBox.classList.remove('hidden');
        }
        if (contactChannelSelect) {
          contactChannelSelect.classList.add('border-rose-500');
          contactChannelSelect.focus();
        }
        return;
      }

      const res = addParentContact({
        studentId,
        parentId,
        date,
        channel,
        summary,
        agreementReached,
        nextContactDate
      });

      if (!res.success) {
        if (contactErrorBox) {
          contactErrorBox.textContent = res.error;
          contactErrorBox.classList.remove('hidden');
        }
        return;
      }

      closeContactModal();
      showToast('Контакт с родителем успешно зафиксирован');

      if (onNavigate) {
        onNavigate(window.location.hash || `#/student?id=${studentId}`);
      }
    });
  }

  const modalNote = document.getElementById('modal-add-note');
  const modalNoteDialog = document.getElementById('modal-note-dialog');
  const btnOpenNote = document.getElementById('btn-open-note-modal');
  const btnCloseNoteX = document.getElementById('btn-close-note-modal-x');
  const btnCancelNote = document.getElementById('btn-cancel-note-modal');
  const formNote = document.getElementById('form-add-note');
  const noteTextInput = document.getElementById('note-text-input');
  const notePrivateCheckbox = document.getElementById('note-private-checkbox');
  const noteErrorBox = document.getElementById('note-error-box');

  function openNoteModal() {
    if (!modalNote) return;
    if (noteErrorBox) {
      noteErrorBox.classList.add('hidden');
      noteErrorBox.textContent = '';
    }
    modalNote.classList.remove('opacity-0', 'pointer-events-none');
    modalNote.classList.add('opacity-100', 'pointer-events-auto');
    if (modalNoteDialog) {
      modalNoteDialog.classList.remove('scale-95');
      modalNoteDialog.classList.add('scale-100');
    }
  }

  function closeNoteModal() {
    if (!modalNote) return;
    modalNote.classList.remove('opacity-100', 'pointer-events-auto');
    modalNote.classList.add('opacity-0', 'pointer-events-none');
    if (modalNoteDialog) {
      modalNoteDialog.classList.remove('scale-100');
      modalNoteDialog.classList.add('scale-95');
    }
    if (formNote) formNote.reset();
  }

  if (btnOpenNote) btnOpenNote.onclick = openNoteModal;
  if (btnCloseNoteX) btnCloseNoteX.onclick = closeNoteModal;
  if (btnCancelNote) btnCancelNote.onclick = closeNoteModal;
  if (modalNote) {
    modalNote.addEventListener('click', (e) => {
      if (e.target === modalNote) closeNoteModal();
    });
  }

  if (formNote) {
    formNote.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = (noteTextInput?.value || '').trim();
      const isPrivate = notePrivateCheckbox?.checked ?? true;

      if (!text) {
        if (noteErrorBox) {
          noteErrorBox.textContent = 'Введите текст педагогической заметки';
          noteErrorBox.classList.remove('hidden');
        }
        if (noteTextInput) {
          noteTextInput.classList.add('border-rose-500');
          noteTextInput.focus();
        }
        return;
      }

      const res = addStudentNote({
        studentId,
        text,
        isPrivate
      });

      if (!res.success) {
        if (noteErrorBox) {
          noteErrorBox.textContent = res.error;
          noteErrorBox.classList.remove('hidden');
        }
        return;
      }

      closeNoteModal();
      showToast('Педагогическая заметка сохранена');

      if (onNavigate) {
        onNavigate(window.location.hash || `#/student?id=${studentId}`);
      }
    });
  }

  const modalAbsence = document.getElementById('modal-confirm-student-absence');
  const modalAbsenceDialog = document.getElementById('modal-confirm-dialog');
  const btnCloseAbsenceX = document.getElementById('btn-close-absence-modal-x');
  const btnCancelAbsence = document.getElementById('btn-cancel-absence-modal');
  const formAbsence = document.getElementById('form-confirm-student-absence');
  const absenceRecordIdsInput = document.getElementById('absence-record-ids');
  const selectReasonType = document.getElementById('confirm-reason-type');
  const checkHasDoc = document.getElementById('confirm-has-doc-check');
  const blockDocFields = document.getElementById('block-absence-doc-fields');
  const inputDocText = document.getElementById('confirm-doc-text-input');
  const inputAbsenceNotes = document.getElementById('confirm-absence-notes-input');

  if (selectReasonType && blockDocFields) {
    selectReasonType.addEventListener('change', () => {
      blockDocFields.classList.toggle('hidden', selectReasonType.value !== 'excused');
    });
  }

  function openAbsenceModal(recordIds) {
    if (!modalAbsence) return;
    if (absenceRecordIdsInput) absenceRecordIdsInput.value = recordIds;
    if (formAbsence) formAbsence.reset();
    if (selectReasonType) selectReasonType.value = 'excused';
    if (checkHasDoc) checkHasDoc.checked = true;
    if (blockDocFields) blockDocFields.classList.remove('hidden');
    if (inputDocText) inputDocText.value = '';
    if (inputAbsenceNotes) inputAbsenceNotes.value = '';

    modalAbsence.classList.remove('opacity-0', 'pointer-events-none');
    modalAbsence.classList.add('opacity-100', 'pointer-events-auto');
    if (modalAbsenceDialog) {
      modalAbsenceDialog.classList.remove('scale-95');
      modalAbsenceDialog.classList.add('scale-100');
    }
  }

  function closeAbsenceModal() {
    if (!modalAbsence) return;
    modalAbsence.classList.remove('opacity-100', 'pointer-events-auto');
    modalAbsence.classList.add('opacity-0', 'pointer-events-none');
    if (modalAbsenceDialog) {
      modalAbsenceDialog.classList.remove('scale-100');
      modalAbsenceDialog.classList.add('scale-95');
    }
  }

  if (btnCloseAbsenceX) btnCloseAbsenceX.onclick = closeAbsenceModal;
  if (btnCancelAbsence) btnCancelAbsence.onclick = closeAbsenceModal;
  if (modalAbsence) {
    modalAbsence.addEventListener('click', (e) => {
      if (e.target === modalAbsence) closeAbsenceModal();
    });
  }

  document.querySelectorAll('.btn-confirm-absence-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const ids = btn.getAttribute('data-absence-ids');
      openAbsenceModal(ids);
    });
  });

  if (formAbsence) {
    formAbsence.addEventListener('submit', (e) => {
      e.preventDefault();
      const ids = (absenceRecordIdsInput?.value || '').split(',').map(s => s.trim()).filter(Boolean);
      const isExcused = selectReasonType ? selectReasonType.value === 'excused' : true;
      const hasDoc = checkHasDoc ? checkHasDoc.checked : true;
      const docText = inputDocText ? inputDocText.value.trim() : '';
      const notes = inputAbsenceNotes ? inputAbsenceNotes.value.trim() : '';

      const documentValue = isExcused
        ? (hasDoc ? (docText || 'Медицинская справка') : 'Заявление родителей')
        : null;
      const reasonValue = notes || (isExcused ? 'По болезни' : 'Неуважительная причина');

      ids.forEach(id => {
        confirmAbsenceRecord(id, {
          status: isExcused ? 'excused' : 'unexcused',
          reason: reasonValue,
          document: documentValue,
          confirmedBy: 'Смирнова М. В.'
        });
      });

      closeAbsenceModal();
      showToast('Уважительная причина пропуска успешно подтверждена');

      if (onNavigate) {
        onNavigate(window.location.hash || `#/student?id=${studentId}`);
      }
    });
  }
}
