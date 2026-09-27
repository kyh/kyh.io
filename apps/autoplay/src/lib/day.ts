// The station's day is UTC: the budgets reset at its midnight and the day's
// format turns over with it, the same for everyone wherever they watch.

/** Today as `YYYY-MM-DD`. */
export const today = (): string => new Date().toISOString().slice(0, 10);

/** Unix ms of today's midnight. */
export const dayStart = (): number => Date.parse(`${today()}T00:00:00Z`);
