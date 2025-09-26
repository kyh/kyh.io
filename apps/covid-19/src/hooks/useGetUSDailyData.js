import useSWR from "swr";
import { formatDaily } from "utils/formatter";

export const useGetUSDailyData = () => {
  const { data = [] } = useSWR(
    "https://raw.githubusercontent.com/kyh/covid-19/c1f39d90340bbb966f1380bfb79a7a95564bcf30/data/us.json"
  );
  let formatted = [];
  if (Array.isArray(data)) {
    formatted = data.map((d) => formatDaily(d)).sort((a, b) => a.date - b.date);
  }

  return { isLoading: !data.length, data: formatted };
};
