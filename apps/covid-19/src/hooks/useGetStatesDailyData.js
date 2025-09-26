import useSWR from "swr";
import { formatDaily } from "utils/formatter";

export const useGetStatesDailyData = () => {
  const { data = [] } = useSWR(
    "https://raw.githubusercontent.com/kyh/covid-19/c1f39d90340bbb966f1380bfb79a7a95564bcf30/data/states.json"
  );

  let formatted = {};
  if (Array.isArray(data)) {
    formatted = data
      .map((d) => formatDaily(d))
      .sort((a, b) => a.date - b.date)
      .reduce((acc, state) => {
        if (!acc[state.state]) {
          acc[state.state] = [state];
        } else {
          acc[state.state].push(state);
        }
        return acc;
      }, {});
  }

  return {
    isLoading: !data.length,
    data: formatted,
    raw: data,
    states: Object.keys(formatted).sort(),
  };
};
