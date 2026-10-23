/**
 * Модуль: Карточки учителей
 * CRUD карточек учителей: создание, изменение данных и предметов, удаление (запрещено при наличии нагрузки), поиск по справочникам.
 */

import { getDB, saveDB, shortenName } from './storage.js';
import { getClassNameById, getSubjectShortName } from './directories.js';

/**
 * Карточки учителей.
 * Удаление карточки возможно только без нагрузки и без привязанной учётной записи.
 */
export function createTeacherCard(data = {}) {
    const db = getDB();
    if (!Array.isArray(db.teachers)) db.teachers = [];

    const fullName = (data.fullName || '').trim();
    const subjectIds = Array.isArray(data.subjectIds) ? data.subjectIds.filter(Boolean) : [];

    if (!fullName) {
        return { success: false, error: 'Укажите ФИО учителя' };
    }
    if (!subjectIds.length) {
        return { success: false, error: 'Выберите хотя бы один предмет' };
    }
    if (db.teachers.some(t => (t.fullName || '').toLowerCase() === fullName.toLowerCase())) {
        return { success: false, error: 'Карточка с таким ФИО уже существует' };
    }

    const account = data.accountUserId
        ? (db.users || []).find(u => u.id === data.accountUserId)
        : null;
    if (data.accountUserId && !account) {
        return { success: false, error: 'Учётная запись не найдена' };
    }
    if (account) {
        if (account.role !== 'teacher' && account.role !== 'subject_teacher') {
            return { success: false, error: 'Привязать можно только учётную запись с ролью учителя' };
        }
        if (db.teachers.some(t => t.accountUserId === account.id)) {
            return { success: false, error: 'Эта учётная запись уже привязана к другому учителю' };
        }
    }

    const teacher = {
        id: `t-${Date.now()}`,
        fullName,
        shortName: shortenName(fullName),
        subjectIds,
        status: data.status === 'archived' ? 'archived' : 'active',
        homeroomClassId: data.homeroomClassId || null,
        accountUserId: account ? account.id : null,
        workload: []
    };

    db.teachers.push(teacher);
    if (account) {
        account.cardName = teacher.shortName;
    }
    saveDB(db);

    return { success: true, teacher, message: 'Карточка учителя создана' };
}

/**
 * Изменение карточки учителя (ФИО, предметы).
 * При смене короткого имени обновляет привязанные учётные записи учителей.
 * @param {string} teacherId ID карточки учителя
 * @param {Object} data { fullName, subjectIds }
 * @returns {Object} { success, teacher?, error? }
 */
export function updateTeacherCard(teacherId, data = {}) {
    const db = getDB();
    const teacher = (db.teachers || []).find(t => t.id === teacherId);
    if (!teacher) {
        return { success: false, error: 'Карточка учителя не найдена' };
    }

    if (data.fullName !== undefined) {
        const fullName = String(data.fullName).trim();
        if (!fullName) {
            return { success: false, error: 'Укажите ФИО учителя' };
        }
        if (db.teachers.some(t => t.id !== teacherId && (t.fullName || '').toLowerCase() === fullName.toLowerCase())) {
            return { success: false, error: 'Карточка с таким ФИО уже существует' };
        }
        teacher.fullName = fullName;
        teacher.shortName = shortenName(fullName);
    }

    if (data.subjectIds !== undefined) {
        const subjectIds = Array.isArray(data.subjectIds) ? data.subjectIds.filter(Boolean) : [];
        if (!subjectIds.length) {
            return { success: false, error: 'Выберите хотя бы один предмет' };
        }
        teacher.subjectIds = subjectIds;
    }

    if (data.status !== undefined) {
        teacher.status = data.status === 'archived' ? 'archived' : 'active';
    }

    if (data.homeroomClassId !== undefined) {
        teacher.homeroomClassId = data.homeroomClassId || null;
    }

    if (data.accountUserId !== undefined) {
        const account = data.accountUserId
            ? (db.users || []).find(u => u.id === data.accountUserId)
            : null;
        if (data.accountUserId && !account) {
            return { success: false, error: 'Учётная запись не найдена' };
        }
        if (account) {
            if (account.role !== 'teacher' && account.role !== 'subject_teacher') {
                return { success: false, error: 'Привязать можно только учётную запись с ролью учителя' };
            }
            if (db.teachers.some(t => t.id !== teacherId && t.accountUserId === account.id)) {
                return { success: false, error: 'Эта учётная запись уже привязана к другому учителю' };
            }
        }
        (db.users || []).forEach(u => {
            if (u.cardName === teacher.shortName && (!account || u.id !== account.id)) {
                delete u.cardName;
            }
        });
        teacher.accountUserId = account ? account.id : null;
        if (account) {
            account.cardName = teacher.shortName;
        }
    }

    saveDB(db);
    return { success: true, teacher, message: 'Карточка учителя обновлена' };
}

/**
 * Удаление карточки учителя.
 * Запрещено, если к карточке привязана учётная запись или есть строки нагрузки.
 * @param {string} teacherId ID карточки учителя
 * @returns {Object} { success, error? }
 */
export function deleteTeacherCard(teacherId) {
    const db = getDB();
    const teacher = (db.teachers || []).find(t => t.id === teacherId);
    if (!teacher) {
        return { success: false, error: 'Карточка учителя не найдена' };
    }
    if ((teacher.workload || []).length) {
        return { success: false, error: 'Сначала снимите учебную нагрузку учителя' };
    }
    if (teacher.accountUserId) {
        return { success: false, error: 'Сначала отвяжите учётную запись учителя' };
    }

    db.teachers = (db.teachers || []).filter(t => t.id !== teacherId);
    saveDB(db);
    return { success: true, message: 'Карточка учителя удалена' };
}
