// Fixed UTC zone so a server render and a client render of the same timestamp
// always produce the same string — a locale-default formatter hydrates
// differently on a UTC server and a PST browser. Module-level so the formatter
// isn't rebuilt on every render.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Returns null for missing or unparseable dates; callers pick their own placeholder. */
export const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormatter.format(date);
};
