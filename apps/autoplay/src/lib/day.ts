/** Today as `YYYY-MM-DD`. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Unix ms of today's midnight. */
export const dayStart = () => Date.parse(`${today()}T00:00:00Z`);
