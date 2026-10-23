/**
 * Модуль: Операции посещаемости и комментариев журнала
 * Подтверждение причин отсутствия (одиночное и массовое, «Справка» закрывает несколько дней), пересчёт счётчика неподтверждённых пропусков, комментарии предметника и классрука к записям журнала.
 */

import { getDB, saveDB } from './storage.js';

/**
 * Подтверждение пропуска урока (БП «Посещаемость: подтверждение пропусков»)
 * @param {string} recordId ID записи посещаемости (или поиск по lessonId + studentId)
 * @param {Object} data { status: 'excused' | 'unexcused', reason, document, confirmedBy }
 */
export function confirmAbsenceRecord(recordId, data = {}) {
    const db = getDB();
    const record = (db.attendance || []).find(a => a.id === recordId);
    if (!record) {
        return { success: false, error: 'Запись посещаемости не найдена' };
    }

    const isExcused = data.status === 'excused' || data.isExcused === true;
    record.status = isExcused ? 'excused' : 'unexcused';
    record.code = isExcused ? 'УП' : 'Н';
    record.value = 'absent';
    record.reason = data.reason || (isExcused ? 'Уважительная причина (справка / заявление)' : 'Неуважительная причина');
    record.document = data.document || (isExcused ? 'Медицинская справка' : null);
    record.confirmedBy = data.confirmedBy || 'Смирнова М. В.';
    record.confirmedAt = new Date().toISOString();

    if (db.meta) {
        const q1LessonIds = new Set((db.lessons || []).filter(l => l.periodId === 'q1_2024').map(l => l.id));
        db.meta.unconfirmedAbsencesCount = (db.attendance || []).filter(
            a => a.status === 'unconfirmed' && a.value === 'absent' && q1LessonIds.has(a.lessonId)
        ).length;
    }

    saveDB(db);
    return { success: true, record };
}

/**
 * Массовое подтверждение пропусков (например, за несколько уроков по одной справке)
 */
export function batchConfirmAbsences(recordIds, data = {}) {
    const db = getDB();
    const idsSet = new Set(recordIds);
    let updatedCount = 0;

    const isExcused = data.status === 'excused' || data.isExcused === true;
    const reason = data.reason || (isExcused ? 'Уважительная причина (справка / заявление)' : 'Неуважительная причина');
    const document = data.document || (isExcused ? 'Медицинская справка' : null);
    const confirmedBy = data.confirmedBy || 'Смирнова М. В.';
    const confirmedAt = new Date().toISOString();

    (db.attendance || []).forEach(record => {
        if (idsSet.has(record.id)) {
            record.status = isExcused ? 'excused' : 'unexcused';
            record.code = isExcused ? 'УП' : 'Н';
            record.value = 'absent';
            record.reason = reason;
            record.document = document;
            record.confirmedBy = confirmedBy;
            record.confirmedAt = confirmedAt;
            updatedCount++;
        }
    });

    if (db.meta) {
        const q1LessonIds = new Set((db.lessons || []).filter(l => l.periodId === 'q1_2024').map(l => l.id));
        db.meta.unconfirmedAbsencesCount = (db.attendance || []).filter(
            a => a.status === 'unconfirmed' && a.value === 'absent' && q1LessonIds.has(a.lessonId)
        ).length;
    }

    saveDB(db);
    return { success: true, updatedCount };
}

/**
 * Получение комментариев к конкретной записи журнала (уроку и ученику)
 */
export function getJournalComments(lessonId, studentId) {
    const db = getDB();
    if (!db.journalComments) return [];
    return db.journalComments.filter(c => c.lessonId === lessonId && c.studentId === studentId);
}

/**
 * Добавление комментария к записи журнала (БП «Журнал класса»)
 * @param {Object} data { lessonId, studentId, text, author, role }
 */
export function addJournalComment(data = {}) {
    const text = (data.text || '').trim();
    if (!text || !data.lessonId || !data.studentId) {
        return { success: false, error: 'Заполните текст комментария' };
    }

    const db = getDB();
    if (!db.journalComments) {
        db.journalComments = [];
    }

    const newComment = {
        id: `jc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        lessonId: data.lessonId,
        studentId: data.studentId,
        text,
        author: data.author || 'Смирнова М. В.',
        role: data.role || 'teacher',
        createdAt: data.createdAt || new Date().toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    };

    db.journalComments.push(newComment);
    saveDB(db);
    return { success: true, comment: newComment };
}
