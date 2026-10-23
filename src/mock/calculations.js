/**
 * Строгое математическое округление до одного десятичного знака (0.1)
 * Половина (.05) округляется вверх.
 * @param {number|null|undefined} value
 * @returns {number|null}
 */
export function roundToOneDecimal(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

/**
 * Фильтрация уроков по периоду или диапазону дат
 * @param {Array} lessons
 * @param {Object} options { periodId, dateFrom, dateTo, onlyMarked }
 * @returns {Array}
 */
export function filterLessons(lessons, options = {}) {
  let result = lessons || [];
  if (options.periodId) {
    result = result.filter(l => l.periodId === options.periodId);
  }
  if (options.dateFrom) {
    result = result.filter(l => l.date >= options.dateFrom);
  }
  if (options.dateTo) {
    result = result.filter(l => l.date <= options.dateTo);
  }
  if (options.onlyMarked !== false) {
    result = result.filter(l => l.isMarked || l.status === 'closed');
  }
  return result;
}

/**
 * Расчёт посещаемости за конкретный день
 * Поддерживает расчёт как только по 1-му уроку дня, так и за весь день по всем проведённым урокам.
 * @param {Array} lessons Массив занятий
 * @param {Array} attendance Массив отметок посещаемости
 * @param {string} targetDate Дата в формате 'YYYY-MM-DD'
 * @param {Object} options { onlyFirstLesson: boolean }
 * @returns {Object} { totalMarks, presentCount, absentCount, attendanceRate, absenceRate, lessonIds }
 */
export function calculateAttendanceForDay(lessons, attendance, targetDate, options = {}) {
  let dayLessons = (lessons || []).filter(l => l.date === targetDate && (l.isMarked || l.status === 'closed'));

  dayLessons.sort((a, b) => (a.lessonNumber || 0) - (b.lessonNumber || 0));

  if (options.onlyFirstLesson && dayLessons.length > 0) {
    dayLessons = [dayLessons[0]];
  }

  const lessonIds = new Set(dayLessons.map(l => l.id));
  const dayAttendance = (attendance || []).filter(a => lessonIds.has(a.lessonId) && a.date === targetDate);

  const totalMarks = dayAttendance.length;
  if (totalMarks === 0) {
    return {
      date: targetDate,
      totalMarks: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: null,
      absenceRate: null,
      lessonIds: Array.from(lessonIds)
    };
  }

  const presentCount = dayAttendance.filter(a => a.value === 'present').length;
  const absentCount = dayAttendance.filter(a => a.value === 'absent').length;

  const attendanceRate = roundToOneDecimal((presentCount / totalMarks) * 100);
  const absenceRate = roundToOneDecimal((absentCount / totalMarks) * 100);

  return {
    date: targetDate,
    totalMarks,
    presentCount,
    absentCount,
    attendanceRate,
    absenceRate,
    lessonIds: Array.from(lessonIds)
  };
}

/**
 * Расчёт среднего балла ученика за период
 * - Отметки о присутствии не влияют на балл
 * - Если 0 оценок: возвращает null («нет данных», прочерк)
 * - Если 1 оценка: возвращает точное число с округлением (например 5.0)
 * - Округление строго математическое до 0.1
 * @param {Array} grades
 * @param {string} studentId
 * @param {Object} options { periodId, dateFrom, dateTo, subjectId }
 * @returns {number|null}
 */
export function calculateStudentAverage(grades, studentId, options = {}) {
  let stGrades = (grades || []).filter(g => g.studentId === studentId);

  if (options.subjectId) {
    stGrades = stGrades.filter(g => g.subjectId === options.subjectId);
  }
  if (options.periodId) {
    stGrades = stGrades.filter(g => g.periodId === options.periodId);
  }
  if (options.dateFrom) {
    stGrades = stGrades.filter(g => g.date >= options.dateFrom);
  }
  if (options.dateTo) {
    stGrades = stGrades.filter(g => g.date <= options.dateTo);
  }

  if (stGrades.length === 0) {
    return null;
  }

  const sum = stGrades.reduce((acc, g) => acc + g.value, 0);
  return roundToOneDecimal(sum / stGrades.length);
}

/**
 * Расчёт среднего балла класса за период
 * Считается по ВСЕМ оценкам класса (сумма / количество оценок), НЕ как среднее из средних учеников!
 * @param {Array} grades
 * @param {Object} options { periodId, dateFrom, dateTo, subjectId }
 * @returns {number|null}
 */
export function calculateClassAverage(grades, options = {}) {
  let filtered = grades || [];

  if (options.subjectId) {
    filtered = filtered.filter(g => g.subjectId === options.subjectId);
  }
  if (options.periodId) {
    filtered = filtered.filter(g => g.periodId === options.periodId);
  }
  if (options.dateFrom) {
    filtered = filtered.filter(g => g.date >= options.dateFrom);
  }
  if (options.dateTo) {
    filtered = filtered.filter(g => g.date <= options.dateTo);
  }

  if (filtered.length === 0) {
    return null;
  }

  const sum = filtered.reduce((acc, g) => acc + g.value, 0);
  return roundToOneDecimal(sum / filtered.length);
}

/**
 * Расчёт средних баллов класса по каждому предмету за период
 * @param {Array} grades
 * @param {Array} subjects
 * @param {Object} options { periodId, dateFrom, dateTo, threshold = 3.5 }
 * @returns {Array} Массив предметов со средними баллами и флагом выхода за порог
 */
export function calculateSubjectAverages(grades, subjects, options = {}) {
  const threshold = options.threshold ?? 3.5;

  return (subjects || []).map(subj => {
    const avg = calculateClassAverage(grades, { ...options, subjectId: subj.id });
    const count = (grades || []).filter(g => {
      let match = g.subjectId === subj.id;
      if (options.periodId) match = match && g.periodId === options.periodId;
      if (options.dateFrom) match = match && g.date >= options.dateFrom;
      if (options.dateTo) match = match && g.date <= options.dateTo;
      return match;
    }).length;

    return {
      id: subj.id,
      name: subj.name,
      shortName: subj.shortName || subj.name,
      color: subj.color,
      teacher: subj.teacher,
      room: subj.room,
      average: avg,
      gradesCount: count,
      threshold,
      isBelowThreshold: avg !== null && avg < threshold
    };
  });
}

/**
 * Расчёт показателей посещаемости конкретного ученика за период
 * Знаменатель — только проведённые/отмеченные уроки (неотмеченные не считаются прогулами!).
 * @param {Array} lessons
 * @param {Array} attendance
 * @param {string} studentId
 * @param {Object} options { periodId, dateFrom, dateTo }
 * @returns {Object} { totalLessons, presentCount, absentCount, attendanceRate, absenceRate }
 */
export function calculateStudentAttendance(lessons, attendance, studentId, options = {}) {
  const markedLessons = filterLessons(lessons, options);
  const lessonIds = new Set(markedLessons.map(l => l.id));

  const stAttendance = (attendance || []).filter(a => a.studentId === studentId && lessonIds.has(a.lessonId));

  const totalLessons = markedLessons.length;
  if (totalLessons === 0) {
    return {
      studentId,
      totalLessons: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: null,
      absenceRate: null
    };
  }

  const absentCount = stAttendance.filter(a => a.value === 'absent').length;
  const presentCount = totalLessons - absentCount;

  const attendanceRate = roundToOneDecimal((presentCount / totalLessons) * 100);
  const absenceRate = roundToOneDecimal((absentCount / totalLessons) * 100);

  return {
    studentId,
    totalLessons,
    presentCount,
    absentCount,
    attendanceRate,
    absenceRate
  };
}

/**
 * Расчёт показателей посещаемости класса за период
 * Считается по всем ученикам и всем отмеченным урокам.
 * @param {Array} lessons
 * @param {Array} attendance
 * @param {Object} options { periodId, dateFrom, dateTo }
 * @returns {Object} { totalMarks, presentCount, absentCount, attendanceRate, absenceRate, totalLessons }
 */
export function calculateClassAttendance(lessons, attendance, options = {}) {
  const markedLessons = filterLessons(lessons, options);
  const lessonIds = new Set(markedLessons.map(l => l.id));

  const periodAttendance = (attendance || []).filter(a => lessonIds.has(a.lessonId));
  const totalMarks = periodAttendance.length;

  if (totalMarks === 0) {
    return {
      totalLessons: markedLessons.length,
      totalMarks: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: null,
      absenceRate: null
    };
  }

  const absentCount = periodAttendance.filter(a => a.value === 'absent').length;
  const presentCount = totalMarks - absentCount;

  const attendanceRate = roundToOneDecimal((presentCount / totalMarks) * 100);
  const absenceRate = roundToOneDecimal((absentCount / totalMarks) * 100);

  return {
    totalLessons: markedLessons.length,
    totalMarks,
    presentCount,
    absentCount,
    attendanceRate,
    absenceRate
  };
}

/**
 * Расчёт динамики пропусков по неделям
 * @param {Array} lessons
 * @param {Array} attendance
 * @param {Object} options { periodId }
 * @returns {Array} Массив недель с долей пропусков
 */
export function calculateWeeklyAbsences(lessons, attendance, options = {}) {
  const markedLessons = filterLessons(lessons, options);

  const weeksMap = new Map();
  for (const lsn of markedLessons) {
    const wIdx = lsn.weekIndex;
    if (!weeksMap.has(wIdx)) {
      weeksMap.set(wIdx, []);
    }
    weeksMap.get(wIdx).push(lsn);
  }

  const sortedWeeks = Array.from(weeksMap.keys()).sort((a, b) => a - b);
  const result = [];

  for (const wIdx of sortedWeeks) {
    const wLessons = weeksMap.get(wIdx);
    const lIds = new Set(wLessons.map(l => l.id));
    const wAtt = (attendance || []).filter(a => lIds.has(a.lessonId));
    const totalMarks = wAtt.length;
    const absences = wAtt.filter(a => a.value === 'absent').length;
    const rate = totalMarks > 0 ? roundToOneDecimal((absences / totalMarks) * 100) : 0.0;

    result.push({
      weekIndex: wIdx,
      label: `Нед ${wIdx}`,
      totalLessons: wLessons.length,
      totalMarks,
      absentCount: absences,
      absencePercentage: rate
    });
  }

  return result;
}

/**
 * Получение списка неподтверждённых пропусков
 * В счётчик и список входят только отметки со статусом 'unconfirmed' ('Н (без)').
 * Подтверждённые ('УП', статус 'confirmed') не входят!
 * @param {Array} attendance
 * @param {Array} lessons
 * @param {Array} students
 * @param {Object} options { periodId, date, dateFrom, dateTo }
 * @returns {Array} Список неподтверждённых пропусков с подробной информацией
 */
export function getUnconfirmedAbsences(attendance, lessons, students, options = {}) {
  const lessonMap = new Map((lessons || []).map(l => [l.id, l]));
  const studentMap = new Map((students || []).map(s => [s.id, s]));

  let records = (attendance || []).filter(a => a.status === 'unconfirmed' && a.value === 'absent');

  if (options.periodId) {
    records = records.filter(a => {
      const lsn = lessonMap.get(a.lessonId);
      return lsn && lsn.periodId === options.periodId;
    });
  }
  if (options.date) {
    records = records.filter(a => a.date === options.date);
  }
  if (options.dateFrom) {
    records = records.filter(a => a.date >= options.dateFrom);
  }
  if (options.dateTo) {
    records = records.filter(a => a.date <= options.dateTo);
  }

  return records.map(att => {
    const lsn = lessonMap.get(att.lessonId);
    const st = studentMap.get(att.studentId);
    return {
      id: att.id,
      lessonId: att.lessonId,
      lessonNumber: lsn ? lsn.lessonNumber : null,
      studentId: att.studentId,
      studentName: st ? st.fullName : 'Неизвестный ученик',
      date: att.date,
      time: lsn ? lsn.time : '',
      subjectId: lsn ? lsn.subjectId : '',
      subjectName: lsn ? lsn.subjectName : '',
      teacher: lsn ? lsn.teacher : '',
      reason: att.reason || 'Причина не указана',
      code: att.code || 'Н (без)',
      statusLabel: 'Ожидает подтверждения'
    };
  });
}

/**
 * Определение учеников зоны риска
 * Пороги строгие:
 * - пропуски БОЛЕЕ 20% уроков за период (20.0% ровно не входит)
 * - средний балл по любому предмету НИЖЕ 3.5 (3.5 ровно не входит)
 * - общий средний балл НИЖЕ 3.5 (3.5 ровно не входит)
 *
 * @param {Array} students
 * @param {Array} lessons
 * @param {Array} attendance
 * @param {Array} grades
 * @param {Array} subjects
 * @param {Object} options { periodId, dateFrom, dateTo, absenceThreshold = 20.0, gradeThreshold = 3.5 }
 * @returns {Array} Список учеников в зоне риска с подробными причинами и уровнем риска
 */
export function getRiskZoneStudents(students, lessons, attendance, grades, subjects, options = {}) {
  const absenceThreshold = options.absenceThreshold ?? 20.0;
  const gradeThreshold = options.gradeThreshold ?? 3.5;

  const riskStudents = [];

  for (const st of (students || [])) {
    const sId = st.id;
    const attStats = calculateStudentAttendance(lessons, attendance, sId, options);
    const overallAvg = calculateStudentAverage(grades, sId, options);

    const reasons = [];
    let isCritical = false;

    if (attStats.absenceRate !== null && attStats.absenceRate > absenceThreshold) {
      reasons.push({
        type: 'absence',
        title: 'Пропуски уроков',
        description: `Пропуски ${attStats.absentCount} из ${attStats.totalLessons} уроков (${attStats.absenceRate}%)`,
        value: attStats.absenceRate
      });
      if (attStats.absenceRate >= 30.0) {
        isCritical = true;
      }
    }

    if (overallAvg !== null && overallAvg < gradeThreshold) {
      reasons.push({
        type: 'overall_grade',
        title: 'Низкий средний балл',
        description: `Общий средний балл ${overallAvg} (ниже порога ${gradeThreshold})`,
        value: overallAvg
      });
      isCritical = true;
    }

    for (const subj of (subjects || [])) {
      const subjAvg = calculateStudentAverage(grades, sId, { ...options, subjectId: subj.id });
      if (subjAvg !== null && subjAvg < gradeThreshold) {
        reasons.push({
          type: 'subject_grade',
          subjectId: subj.id,
          subjectName: subj.name,
          title: `Низкий балл: ${subj.name}`,
          description: `Средний балл по предмету «${subj.name}» ${subjAvg} (ниже порога ${gradeThreshold})`,
          value: subjAvg
        });
      }
    }

    if (reasons.length > 0) {
      riskStudents.push({
        studentId: sId,
        name: st.fullName,
        shortName: st.shortName,
        gender: st.gender,
        attendanceRate: attStats.attendanceRate,
        absenceRate: attStats.absenceRate,
        overallAverage: overallAvg,
        riskLevel: isCritical ? 'critical' : 'moderate',
        riskLevelLabel: isCritical ? 'Критический риск' : 'Умеренный риск',
        reasons
      });
    }
  }

  riskStudents.sort((a, b) => {
    if (a.riskLevel === 'critical' && b.riskLevel !== 'critical') return -1;
    if (a.riskLevel !== 'critical' && b.riskLevel === 'critical') return 1;
    return (b.absenceRate || 0) - (a.absenceRate || 0);
  });

  return riskStudents;
}

/**
 * Комплексный динамический отчёт по классу за период
 * Отчёт не сохраняется в состояние и пересчитывается при каждом вызове.
 * @param {Object} dataset Полный объект состояния
 * @param {Object} options { periodId = 'q1_2024', dateFrom, dateTo }
 * @returns {Object}
 */
export function generateClassReport(dataset, options = {}) {
  const periodId = options.periodId || 'q1_2024';
  const periodOptions = { periodId, ...options };

  const classAvg = calculateClassAverage(dataset.grades, periodOptions);
  const classAtt = calculateClassAttendance(dataset.lessons, dataset.attendance, periodOptions);
  const subjectAverages = calculateSubjectAverages(dataset.grades, dataset.subjects, periodOptions);
  const riskZone = getRiskZoneStudents(
    dataset.students,
    dataset.lessons,
    dataset.attendance,
    dataset.grades,
    dataset.subjects,
    periodOptions
  );
  const unconfirmed = getUnconfirmedAbsences(
    dataset.attendance,
    dataset.lessons,
    dataset.students,
    periodOptions
  );

  return {
    periodId,
    periodTitle: periodId === 'q1_2024' ? 'I четверть (02.09–25.10.2024)' : periodId,
    generatedAt: new Date().toISOString(),
    metrics: {
      studentsCount: (dataset.students || []).length,
      classAverageGrade: classAvg,
      totalGradesCount: (dataset.grades || []).filter(g => (!periodId || g.periodId === periodId) && (!options.dateFrom || g.date >= options.dateFrom) && (!options.dateTo || g.date <= options.dateTo)).length,
      attendanceRate: classAtt.attendanceRate,
      absenceRate: classAtt.absenceRate,
      totalMarkedLessons: classAtt.totalLessons,
      totalAttendanceMarks: classAtt.totalMarks,
      totalAbsences: classAtt.absentCount,
      unconfirmedAbsencesCount: unconfirmed.length,
      riskZoneCount: riskZone.length
    },
    subjectAverages,
    riskZone,
    unconfirmedAbsences: unconfirmed
  };
}

/**
 * Расчёт отчёта по опросу родителей / согласиям (макет Объявления.png, сбор согласий на экскурсию)
 * @param {string} surveyId Идентификатор опроса
 * @param {Object} dataset Полный датасет
 * @returns {Object}
 */
export function getSurveyReport(surveyId, dataset) {
  const survey = (dataset.surveys || []).find(s => s.id === surveyId);
  if (!survey) {
    return null;
  }

  const responses = (dataset.surveyResponses || []).filter(r => r.surveyId === surveyId);
  const totalTarget = responses.length;
  const answeredList = responses.filter(r => r.answered);
  const totalResponded = answeredList.length;
  const responseRate = totalTarget > 0 ? roundToOneDecimal((totalResponded / totalTarget) * 100) : 0.0;

  const distribution = (survey.options || []).map(opt => {
    const count = responses.filter(r => r.answer === opt.id).length;
    const percentage = totalTarget > 0 ? roundToOneDecimal((count / totalTarget) * 100) : 0.0;
    return {
      optionId: opt.id,
      text: opt.text,
      count,
      percentage
    };
  });

  const noAnswerCount = responses.filter(r => !r.answered).length;
  const noAnswerPercentage = totalTarget > 0 ? roundToOneDecimal((noAnswerCount / totalTarget) * 100) : 0.0;

  distribution.push({
    optionId: 'no_answer',
    text: 'Нет ответа',
    count: noAnswerCount,
    percentage: noAnswerPercentage
  });

  return {
    surveyId: survey.id,
    title: survey.title,
    deadline: survey.deadline,
    status: survey.status,
    totalTarget,
    totalResponded,
    responseRate,
    distribution,
    responses
  };
}

/**
 * Расчёт явки родителей на собрание
 * @param {string} meetingId Идентификатор собрания
 * @param {Object} dataset Полный датасет
 * @returns {Object}
 */
export function getMeetingAttendanceReport(meetingId, dataset) {
  const meeting = (dataset.meetings || []).find(m => m.id === meetingId);
  if (!meeting) {
    return null;
  }

  const attendanceList = (dataset.meetingAttendance || []).filter(a => a.meetingId === meetingId);
  const totalInvited = attendanceList.length;
  const respondedList = attendanceList.filter(a => a.responded);
  const totalResponded = respondedList.length;
  const responseRate = totalInvited > 0 ? roundToOneDecimal((totalResponded / totalInvited) * 100) : 0.0;

  const presentCount = attendanceList.filter(a => a.status === 'present').length;
  const absentCount = attendanceList.filter(a => a.status === 'absent').length;
  const noAnswerCount = attendanceList.filter(a => a.status === 'no_answer').length;

  return {
    meetingId: meeting.id,
    title: meeting.title,
    date: meeting.date,
    time: meeting.time,
    totalInvited,
    totalResponded,
    responseRate,
    summaryText: `Всего ответов: ${totalResponded} из ${totalInvited}`,
    stats: {
      presentCount,
      absentCount,
      noAnswerCount
    },
    records: attendanceList
  };
}
