import { z } from "zod";

const count = z
  .union([z.number(), z.literal("")])
  .transform((value) => (value === "" ? undefined : value));

const dayFields = {
  date: z.iso.date(),
  death: count,
  deathIncrease: count,
  negative: count,
  positive: count,
  positiveIncrease: count,
  recovered: count.optional(),
  totalTestResults: count,
};

const withDate = <Raw extends { date: string }>({ date, ...rest }: Raw) => ({
  ...rest,
  date: new Date(`${date}T00:00`),
  day: date,
});

export const usDaysSchema = z.array(z.object(dayFields).transform(withDate));

export const stateDaysSchema = z.array(
  z.object({ ...dayFields, state: z.string() }).transform(withDate),
);

export type Day = z.infer<typeof usDaysSchema>[number];

export type StateDay = z.infer<typeof stateDaysSchema>[number];

export type CountKey = "death" | "deathIncrease" | "positive" | "positiveIncrease";

export type MapField = "death" | "positive" | "totalTestResults";

export const byDate = (a: Day, b: Day) => a.date.getTime() - b.date.getTime();

export const fetchJson = async (url: string) => {
  const response = await fetch(url);
  const body: unknown = await response.json();

  return body;
};
