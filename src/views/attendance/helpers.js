import {
  getDB,
  confirmAbsenceRecord,
  batchConfirmAbsences,
} from "../../services/storage.js";
import { getUnconfirmedAbsences } from "../../mock/calculations.js";
import { renderIcon } from "../../components/icons.js";
import { navigate } from "../../services/navigation.js";

/**
 * Генерация 5 учебных дней (ПН-ПТ) для выбранной недели
 */
export function generateDaysOfWeek(fromStr) {
  const dayNames = ["ПН", "ВТ", "СР", "ЧТ", "ПТ"];
  const monthNames = [
    "ЯНВ",
    "ФЕВ",
    "МАР",
    "АПР",
    "МАЙ",
    "ИЮН",
    "ИЮЛ",
    "АВГ",
    "СЕН",
    "ОКТ",
    "НОЯ",
    "ДЕК",
  ];
  const [startY, startM, startD] = fromStr.split("-").map(Number);

  const days = [];
  for (let i = 0; i < 5; i++) {
    const curDate = new Date(Date.UTC(startY, startM - 1, startD + i));
    const yyyy = curDate.getUTCFullYear();
    const mm = String(curDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(curDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayLabel = `${dayNames[i]}, ${dd} ${monthNames[curDate.getUTCMonth()]}`;
    days.push({
      date: dateStr,
      dayLabel,
      shortName: dayNames[i],
    });
  }
  return days;
}

/**
 * Формирование динамического текста в баннере неподтверждённых пропусков
 */
export function generateUnconfirmedBannerText(unconfirmedList) {
  if (!unconfirmedList || unconfirmedList.length === 0) {
    return "Все пропуски подтверждены. Неподтверждённых пропусков за период нет.";
  }

  const studentMap = new Map();
  unconfirmedList.forEach((u) => {
    let displayName = u.studentName || "Ученик";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      displayName = `${parts[0]} ${parts[1]}`;
    }
    const current = studentMap.get(displayName) || 0;
    studentMap.set(displayName, current + 1);
  });

  function pluralizeLessons(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} уроков`;
    if (mod10 === 1) return `${n} урок`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} урока`;
    return `${n} уроков`;
  }

  const items = Array.from(studentMap.entries()).map(
    ([name, count]) => `${name} (${pluralizeLessons(count)})`,
  );

  if (items.length === 1) {
    return `${items[0]} имеет пропуск уроков без подтверждающих документов. Родители пока не предоставили справку или заявление.`;
  }

  const lastItem = items.pop();
  return `${items.join(", ")} и ${lastItem} имеют пропуски уроков без подтверждающих документов. Родители пока не предоставили справку или заявление.`;
}
