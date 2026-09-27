import useSWR from "swr";
import { formatDaily } from "utils/formatter";

export const useGetStatesDailyData = () => {
  const { data = [] } = useSWR(
    "https://raw.githubusercontent.com/kyh/covid-19/c1f39d90340bbb966f1380bfb79a7a95564bcf30/data/states.json",
  );

  const formatted = {};
  if (Array.isArray(data)) {
    const sorted = data.map((d) => formatDaily(d)).toSorted((a, b) => a.date - b.date);
    for (const state of sorted) {
      if (formatted[state.state]) {
        formatted[state.state].push(state);
      } else {
        formatted[state.state] = [state];
      }
    }
  }

  return {
    data: formatted,
    isLoading: !data.length,
    raw: data,
    states: Object.keys(formatted).toSorted(),
  };
};
