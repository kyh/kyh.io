import { useMemo } from "react";
import useSWR from "swr";
import { byDate, fetchJson, usDaysSchema } from "utils/daily";
import type { Day } from "utils/daily";

const US_DAILY_URL =
  "https://raw.githubusercontent.com/kyh/covid-19/c1f39d90340bbb966f1380bfb79a7a95564bcf30/data/us.json";

const fetchUsDays = async (url: string) => usDaysSchema.parse(await fetchJson(url));

const EMPTY_DAYS: Day[] = [];

export const useGetUSDailyData = () => {
  const { data = EMPTY_DAYS } = useSWR(US_DAILY_URL, fetchUsDays);
  const sorted = useMemo(() => data.toSorted(byDate), [data]);

  return { data: sorted, isLoading: data.length === 0 };
};
