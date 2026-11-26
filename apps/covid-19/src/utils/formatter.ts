import { format, timeFormat } from "d3";

const formatWhole = format(",.0f");

export const formatNumber = (value: number | undefined) =>
  value === undefined ? "Unknown" : formatWhole(value);

export const formatDate = (date: Date | string, pattern = "%b %e") =>
  timeFormat(pattern)(date instanceof Date ? date : new Date(`${date}T00:00`));
