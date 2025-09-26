import { format } from "d3-format";
import { timeFormat, timeParse } from "d3-time-format";

export const formatNumber = format(",.0f");

export const parseDate = timeParse("%Y-%m-%d");

export const formatDaily = (data) => {
  const dateString = data.date.toString();
  return {
    ...data,
    date: parseDate(dateString),
  };
};

export const formatDate = (date, format = "%b %e") => {
  const formatFn = timeFormat(format);
  if (date instanceof Date) {
    return formatFn(date);
  }
  return formatFn(parseDate(date));
};
