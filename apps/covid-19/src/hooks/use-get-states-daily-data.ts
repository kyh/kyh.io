import { group } from "d3";
import { useMemo } from "react";
import useSWR from "swr";
import { byDate, fetchJson, stateDaysSchema } from "utils/daily";
import type { StateDay } from "utils/daily";

const STATES_DAILY_URL =
  "https://raw.githubusercontent.com/kyh/covid-19/c1f39d90340bbb966f1380bfb79a7a95564bcf30/data/states.json";

const fetchStateDays = async (url: string) => stateDaysSchema.parse(await fetchJson(url));

const EMPTY_DAYS: StateDay[] = [];

export const useGetStatesDailyData = () => {
  const { data = EMPTY_DAYS } = useSWR(STATES_DAILY_URL, fetchStateDays);

  const byState = useMemo(() => group(data.toSorted(byDate), (day) => day.state), [data]);

  const states = useMemo(() => [...byState.keys()].toSorted(), [byState]);

  return {
    data: byState,
    isLoading: data.length === 0,
    raw: data,
    states,
  };
};
