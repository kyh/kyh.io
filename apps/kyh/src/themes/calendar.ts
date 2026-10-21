// The holidays' dates, in the visitor's local time. A day is one number,
// yyyymmdd, so days compare as numbers and a theme's days are a range of
// them. Pure.

/** The days a theme runs, from and to, both included. */
export type Window = readonly [from: number, to: number];

/** A day as yyyymmdd, in local time. */
export const dayKey = (date: Date) =>
  date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();

/** The day `offset` days on from a date (month 1–12), as a key: overflow rolls into the next month or year. */
export const dayOf = (year: number, month: number, day: number, offset = 0) =>
  dayKey(new Date(year, month - 1, day + offset));

/** The key back as a date, at local midnight. */
export const dateOf = (key: number) =>
  new Date(Math.floor(key / 10_000), (Math.floor(key / 100) % 100) - 1, key % 100);

/** From one date (month, day) to a later one in the same year. */
export const span = (year: number, from: [number, number], to: [number, number]): Window => [
  dayOf(year, ...from),
  dayOf(year, ...to),
];

/** Some days either side of one date. */
export const around = (center: number, before: number, after: number): Window => {
  const date = dateOf(center);
  return [
    dayOf(date.getFullYear(), date.getMonth() + 1, date.getDate(), -before),
    dayOf(date.getFullYear(), date.getMonth() + 1, date.getDate(), after),
  ];
};

/** Western Easter Sunday (the anonymous Gregorian computus). */
export const easterSunday = (year: number) => {
  const golden = year % 19;
  const century = Math.floor(year / 100);
  const yearOf = year % 100;
  const leapCenturies = Math.floor(century / 4);
  const skipped = Math.floor((century + 8) / 25);
  const correction = Math.floor((century - skipped + 1) / 3);
  const epact = (19 * golden + century - leapCenturies - correction + 15) % 30;
  const weekday = (32 + 2 * (century % 4) + 2 * Math.floor(yearOf / 4) - epact - (yearOf % 4)) % 7;
  const shift = Math.floor((golden + 11 * epact + 22 * weekday) / 451);
  const sum = epact + weekday - 7 * shift + 114;
  return dayOf(year, Math.floor(sum / 31), (sum % 31) + 1);
};

/** The nth weekday (0 Sunday … 6 Saturday) of a month: Thanksgiving is the 4th Thursday of November. */
export const nthWeekday = (year: number, month: number, weekday: number, nth: number) => {
  const first = new Date(year, month - 1, 1).getDay();
  return dayOf(year, month, 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7);
};

// The lunisolar calendar has no short formula; the years past this table
// simply have no Lunar New Year until it's extended.
const LUNAR_NEW_YEAR = new Map<number, readonly [number, number]>([
  [2024, [2, 10]],
  [2025, [1, 29]],
  [2026, [2, 17]],
  [2027, [2, 6]],
  [2028, [1, 26]],
  [2029, [2, 13]],
  [2030, [2, 3]],
  [2031, [1, 23]],
  [2032, [2, 11]],
  [2033, [1, 31]],
  [2034, [2, 19]],
  [2035, [2, 8]],
  [2036, [1, 28]],
  [2037, [2, 15]],
  [2038, [2, 4]],
  [2039, [1, 24]],
  [2040, [2, 12]],
]);

/** The first day of the lunar year, or null past the table. */
export const lunarNewYear = (year: number) => {
  const date = LUNAR_NEW_YEAR.get(year);
  return date ? dayOf(year, ...date) : null;
};
