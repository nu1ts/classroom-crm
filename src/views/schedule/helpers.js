export const SCHEDULE_WEEKS = [
  { id: "w1", label: "02.09.2024 – 06.09.2024", from: "2024-09-02", to: "2024-09-06" },
  { id: "w2", label: "09.09.2024 – 13.09.2024", from: "2024-09-09", to: "2024-09-13" },
  { id: "w3", label: "16.09.2024 – 20.09.2024", from: "2024-09-16", to: "2024-09-20" },
  { id: "w4", label: "23.09.2024 – 27.09.2024", from: "2024-09-23", to: "2024-09-27" },
  { id: "w5", label: "30.09.2024 – 04.10.2024", from: "2024-09-30", to: "2024-10-04" },
  { id: "w6", label: "07.10.2024 – 11.10.2024", from: "2024-10-07", to: "2024-10-11" },
  { id: "w7", label: "14.10.2024 – 18.10.2024", from: "2024-10-14", to: "2024-10-18" },
  { id: "w8", label: "21.10.2024 – 25.10.2024 (Текущая неделя)", from: "2024-10-21", to: "2024-10-25" },
  { id: "w9", label: "28.10.2024 – 01.11.2024 (Каникулы)", from: "2024-10-28", to: "2024-11-01", isVacation: true }
];

export const TIME_SLOTS = [
  { number: 1, time: "08:30 - 09:15" },
  { number: 2, time: "09:30 - 10:15" },
  { number: 3, time: "10:30 - 11:15" },
  { number: 4, time: "11:30 - 12:15" },
  { number: 5, time: "12:35 - 13:20" }
];

const DAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
const SHORT_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт"];

export function getWeekDays(fromIsoDate) {
  const [year, month, day] = fromIsoDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  return DAY_NAMES.map((name, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    return {
      dayOfWeek: index,
      name,
      shortName: SHORT_DAY_NAMES[index],
      date: isoDate,
      displayDate: `${dd}.${mm}`
    };
  });
}
