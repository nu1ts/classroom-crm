/**
 * Модуль: Учебный год и четверти
 * Настройки учебного года: список годов и активный год, четверти с диапазонами дат и активной четвертью, каникулы, демо-дата «сегодня» и сброс состояния к предусловию П3.
 */

import { getDB, saveDB, DEFAULT_ACADEMIC_YEARS } from './storage.js';

/**
 * Получение списка учебных годов
 */
export function getAcademicYears(db = getDB()) {
    return db.academicYears || [];
}

/**
 * Получение текущего активного учебного года
 */
export function getActiveAcademicYear(db = getDB()) {
    const years = getAcademicYears(db);
    return years.find(y => y.isActive) || years[0] || null;
}

/**
 * Смена активного учебного года
 */
export function setActiveAcademicYear(yearId) {
    if (!yearId) return { success: false, error: 'Укажите ID учебного года' };
    const db = getDB();
    const years = getAcademicYears(db);
    const targetYear = years.find(y => y.id === yearId);
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    years.forEach(y => {
        y.isActive = (y.id === yearId);
    });

    db.meta = db.meta || {};
    db.meta.academicYear = targetYear.name;

    let activeQuarter = (targetYear.quarters || []).find(q => q.isActive);
    if (!activeQuarter && (targetYear.quarters || []).length > 0) {
        activeQuarter = targetYear.quarters[0];
        activeQuarter.isActive = true;
    }
    if (activeQuarter) {
        db.meta.period = {
            id: activeQuarter.id,
            name: activeQuarter.name,
            startDate: activeQuarter.startDate,
            endDate: activeQuarter.endDate
        };
    }

    saveDB(db);
    return { success: true, year: targetYear, period: db.meta.period };
}

/**
 * Добавление нового учебного года
 */
export function addAcademicYear(data = {}) {
    const name = (data.name || '').trim();
    const startDate = (data.startDate || '').trim();
    const endDate = (data.endDate || '').trim();

    if (!name) return { success: false, error: 'Укажите название учебного года' };
    if (!/^\d{4}[\/\-]\d{4}$/.test(name)) {
        return { success: false, error: 'Формат года должен быть ГГГГ/ГГГГ (например, 2025/2026)' };
    }
    if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания учебного года' };
    if (startDate >= endDate) return { success: false, error: 'Дата начала года должна быть раньше даты окончания' };

    const db = getDB();
    if (!db.academicYears) db.academicYears = [];

    const formattedName = name.replace('-', '/');
    const exists = db.academicYears.some(y => y.name === formattedName || y.id === `ay-${formattedName.replace('/', '-')}`);
    if (exists) return { success: false, error: `Учебный год «${formattedName}» уже существует` };

    const [startYearStr, endYearStr] = formattedName.split('/');
    const startYearNum = parseInt(startYearStr, 10);
    const endYearNum = parseInt(endYearStr, 10);

    const defaultQuarters = [
        {
            id: `q1_${startYearNum}`,
            name: 'I четверть',
            startDate: `${startYearNum}-09-01`,
            endDate: `${startYearNum}-10-25`,
            isActive: false
        },
        {
            id: `q2_${startYearNum}`,
            name: 'II четверть',
            startDate: `${startYearNum}-11-05`,
            endDate: `${startYearNum}-12-28`,
            isActive: false
        },
        {
            id: `q3_${endYearNum}`,
            name: 'III четверть',
            startDate: `${endYearNum}-01-10`,
            endDate: `${endYearNum}-03-21`,
            isActive: false
        },
        {
            id: `q4_${endYearNum}`,
            name: 'IV четверть',
            startDate: `${endYearNum}-03-31`,
            endDate: `${endYearNum}-05-23`,
            isActive: false
        }
    ];

    const newYear = {
        id: `ay-${formattedName.replace('/', '-')}`,
        name: formattedName,
        startDate,
        endDate,
        isActive: false,
        quarters: Array.isArray(data.quarters) && data.quarters.length > 0 ? data.quarters : defaultQuarters,
        vacations: Array.isArray(data.vacations) ? data.vacations : [
            { id: `vac-${Date.now()}-1`, name: 'Осенние каникулы', startDate: `${startYearNum}-10-26`, endDate: `${startYearNum}-11-04` },
            { id: `vac-${Date.now()}-2`, name: 'Зимние каникулы', startDate: `${startYearNum}-12-29`, endDate: `${endYearNum}-01-09` },
            { id: `vac-${Date.now()}-3`, name: 'Весенние каникулы', startDate: `${endYearNum}-03-22`, endDate: `${endYearNum}-03-30` }
        ]
    };

    db.academicYears.push(newYear);
    saveDB(db);
    return { success: true, year: newYear };
}

/**
 * Удаление учебного года
 */
export function updateAcademicYear(yearId, data = {}) {
    if (!yearId) return { success: false, error: 'Укажите ID учебного года' };
    const name = (data.name || '').trim();
    const startDate = (data.startDate || '').trim();
    const endDate = (data.endDate || '').trim();

    if (!name) return { success: false, error: 'Укажите название учебного года' };
    if (!/^\d{4}[\/\-]\d{4}$/.test(name)) {
        return { success: false, error: 'Формат года должен быть ГГГГ/ГГГГ (например, 2025/2026)' };
    }
    if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания учебного года' };
    if (startDate >= endDate) return { success: false, error: 'Дата начала года должна быть раньше даты окончания' };

    const db = getDB();
    const years = getAcademicYears(db);
    const targetYear = years.find(y => y.id === yearId);
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    const formattedName = name.replace('-', '/');
    const duplicate = years.find(y => y.id !== yearId && y.name.toLowerCase() === formattedName.toLowerCase());
    if (duplicate) return { success: false, error: `Учебный год «${formattedName}» уже существует` };

    targetYear.name = formattedName;
    targetYear.startDate = startDate;
    targetYear.endDate = endDate;

    if (targetYear.isActive) {
        db.meta = db.meta || {};
        db.meta.academicYear = targetYear.name;
    }

    saveDB(db);
    return { success: true, year: targetYear };
}

/**
 * Удаление учебного года.
 * Активный год удалить нельзя: сначала нужно сделать активным другой год.
 * @param {string} yearId ID учебного года
 * @returns {Object} { success, error? }
 */
export function deleteAcademicYear(yearId) {
    if (!yearId) return { success: false, error: 'Укажите ID учебного года' };
    const db = getDB();
    const year = (db.academicYears || []).find(y => y.id === yearId);
    if (!year) return { success: false, error: 'Учебный год не найден' };
    if (year.isActive) return { success: false, error: 'Нельзя удалить активный учебный год' };

    db.academicYears = db.academicYears.filter(y => y.id !== yearId);
    saveDB(db);
    return { success: true };
}

/**
 * Смена активной четверти учебного года
 */
export function setActiveQuarter(yearId, quarterId) {
    if (!quarterId) return { success: false, error: 'Укажите ID четверти' };
    const db = getDB();
    const years = getAcademicYears(db);
    let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
    if (!targetYear) targetYear = years.find(y => (y.quarters || []).some(q => q.id === quarterId));
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    const targetQuarter = (targetYear.quarters || []).find(q => q.id === quarterId);
    if (!targetQuarter) return { success: false, error: 'Четверть не найдена' };

    years.forEach(y => {
        y.isActive = (y.id === targetYear.id);
        (y.quarters || []).forEach(q => {
            q.isActive = (y.id === targetYear.id && q.id === quarterId);
        });
    });

    db.meta = db.meta || {};
    db.meta.academicYear = targetYear.name;
    db.meta.period = {
        id: targetQuarter.id,
        name: targetQuarter.name,
        startDate: targetQuarter.startDate,
        endDate: targetQuarter.endDate
    };

    saveDB(db);
    return { success: true, quarter: targetQuarter, period: db.meta.period };
}

/**
 * Обновление четверти (название, даты)
 */
export function updateQuarter(yearId, quarterId, data = {}) {
    if (!quarterId) return { success: false, error: 'Укажите ID четверти' };
    const startDate = (data.startDate || '').trim();
    const endDate = (data.endDate || '').trim();
    const name = (data.name || '').trim();

    if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания четверти' };
    if (startDate > endDate) return { success: false, error: 'Дата начала четверти не может быть позже даты окончания' };

    const db = getDB();
    const years = getAcademicYears(db);
    let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
    if (!targetYear) targetYear = years.find(y => (y.quarters || []).some(q => q.id === quarterId));
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    if (targetYear.startDate && startDate < targetYear.startDate) {
        return { success: false, error: 'Дата начала четверти не может быть раньше начала учебного года' };
    }
    if (targetYear.endDate && endDate > targetYear.endDate) {
        return { success: false, error: 'Дата окончания четверти не может быть позже окончания учебного года' };
    }

    const quartersList = targetYear.quarters || [];
    const currentIndex = quartersList.findIndex(q => q.id === quarterId);
    if (currentIndex > 0) {
        const prevQuarter = quartersList[currentIndex - 1];
        if (prevQuarter.endDate && startDate <= prevQuarter.endDate) {
            return { success: false, error: `Дата начала четверти должна быть позже окончания ${prevQuarter.name}` };
        }
    }
    if (currentIndex >= 0 && currentIndex < quartersList.length - 1) {
        const nextQuarter = quartersList[currentIndex + 1];
        if (nextQuarter.startDate && endDate >= nextQuarter.startDate) {
            return { success: false, error: `Дата окончания четверти должна быть раньше начала ${nextQuarter.name}` };
        }
    }

    const targetQuarter = quartersList.find(q => q.id === quarterId);
    if (!targetQuarter) return { success: false, error: 'Четверть не найдена' };

    if (name) targetQuarter.name = name;
    targetQuarter.startDate = startDate;
    targetQuarter.endDate = endDate;

    if (targetQuarter.isActive) {
        db.meta = db.meta || {};
        db.meta.period = {
            id: targetQuarter.id,
            name: targetQuarter.name,
            startDate: targetQuarter.startDate,
            endDate: targetQuarter.endDate
        };
    }

    saveDB(db);
    return { success: true, quarter: targetQuarter };
}

/**
 * Установка системной демо-даты «сегодня»
 */
export function setDemoToday(dateStr) {
    const trimmed = (dateStr || '').trim();
    if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return { success: false, error: 'Укажите корректную дату в формате ГГГГ-ММ-ДД' };
    }

    const db = getDB();
    db.meta = db.meta || {};
    db.meta.demoToday = trimmed;

    saveDB(db);
    return { success: true, demoToday: trimmed };
}

/**
 * Сброс параметров учебного года к эталонному предусловию П3
 */
export function resetSchoolYearToP3() {
    const db = getDB();
    db.academicYears = JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_YEARS));
    db.meta = db.meta || {};
    db.meta.demoToday = '2024-10-28';
    db.meta.academicYear = '2024/2025';
    db.meta.period = {
        id: 'q1_2024',
        name: 'I четверть',
        startDate: '2024-09-02',
        endDate: '2024-10-25'
    };
    saveDB(db);
    return {
        success: true,
        academicYear: '2024/2025',
        period: db.meta.period,
        demoToday: '2024-10-28'
    };
}

/**
 * Обновление периода каникул
 */
export function updateVacation(yearId, vacationId, data = {}) {
    if (!vacationId) return { success: false, error: 'Укажите ID каникул' };
    const name = (data.name || '').trim();
    const startDate = (data.startDate || '').trim();
    const endDate = (data.endDate || '').trim();

    if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания каникул' };
    if (startDate > endDate) return { success: false, error: 'Дата начала каникул не может быть позже окончания' };

    const db = getDB();
    const years = getAcademicYears(db);
    let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    if (targetYear.startDate && startDate < targetYear.startDate) {
        return { success: false, error: 'Дата начала каникул не может быть раньше начала учебного года' };
    }
    if (targetYear.endDate && endDate > targetYear.endDate) {
        return { success: false, error: 'Дата окончания каникул не может быть позже окончания учебного года' };
    }

    if (!Array.isArray(targetYear.vacations)) targetYear.vacations = [];
    const vac = targetYear.vacations.find(v => v.id === vacationId);
    if (!vac) return { success: false, error: 'Период каникул не найден' };

    if (name) vac.name = name;
    vac.startDate = startDate;
    vac.endDate = endDate;

    saveDB(db);
    return { success: true, vacation: vac };
}

/**
 * Добавление периода каникул
 */
export function addVacation(yearId, data = {}) {
    const name = (data.name || '').trim();
    const startDate = (data.startDate || '').trim();
    const endDate = (data.endDate || '').trim();

    if (!name) return { success: false, error: 'Укажите название каникул' };
    if (!startDate || !endDate) return { success: false, error: 'Укажите даты начала и окончания каникул' };
    if (startDate > endDate) return { success: false, error: 'Дата начала каникул не может быть позже окончания' };

    const db = getDB();
    const years = getAcademicYears(db);
    let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    if (targetYear.startDate && startDate < targetYear.startDate) {
        return { success: false, error: 'Дата начала каникул не может быть раньше начала учебного года' };
    }
    if (targetYear.endDate && endDate > targetYear.endDate) {
        return { success: false, error: 'Дата окончания каникул не может быть позже окончания учебного года' };
    }

    if (!Array.isArray(targetYear.vacations)) targetYear.vacations = [];
    const newVac = {
        id: `vac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        startDate,
        endDate
    };
    targetYear.vacations.push(newVac);

    saveDB(db);
    return { success: true, vacation: newVac };
}

/**
 * Удаление периода каникул
 */
export function deleteVacation(yearId, vacationId) {
    if (!vacationId) return { success: false, error: 'Укажите ID каникул' };
    const db = getDB();
    const years = getAcademicYears(db);
    let targetYear = yearId ? years.find(y => y.id === yearId) : years.find(y => y.isActive);
    if (!targetYear) return { success: false, error: 'Учебный год не найден' };

    if (!Array.isArray(targetYear.vacations)) return { success: true };
    targetYear.vacations = targetYear.vacations.filter(v => v.id !== vacationId);

    saveDB(db);
    return { success: true };
}
