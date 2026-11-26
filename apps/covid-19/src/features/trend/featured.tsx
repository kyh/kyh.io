import { Card } from "components/card";
import { LineChart } from "components/line-chart";
import { StatCard, StatRow } from "components/stat-card";
import { differenceInDays } from "date-fns";
import type { CountKey, Day } from "utils/daily";
import { formatNumber } from "utils/formatter";
import { stateAbbrevToFullname } from "utils/map-utils";
import { growthRate } from "utils/stats";

import { DataFilter } from "./data-filter";
import type { Selection } from "./data-filter";

const now = new Date();

interface Labels {
  days: number;
  deathChange: string;
  deathKey: CountKey;
  deathTotal: string;
  deathTotalComparator: string;
  positiveChange: string;
  positiveKey: CountKey;
  positiveTotal: string;
  positiveTotalComparator: string;
}

const selectionToLabels = {
  time: {
    days: 2,
    deathChange: "% increase in Deaths",
    deathKey: "death",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths yesterday",
    positiveChange: "% increase in Total Cases",
    positiveKey: "positive",
    positiveTotal: "Total Cases today",
    positiveTotalComparator: "Total Cases yesterday",
  },
  trendDay: {
    days: 2,
    deathChange: "1 day average change in Deaths",
    deathKey: "deathIncrease",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths yesterday",
    positiveChange: "1 day average change in New Cases",
    positiveKey: "positiveIncrease",
    positiveTotal: "New Cases today",
    positiveTotalComparator: "New Cases yesterday",
  },
  trendWeek: {
    days: 8,
    deathChange: "7 day average change in Deaths",
    deathKey: "deathIncrease",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 7 days ago",
    positiveChange: "7 day average change in New Cases",
    positiveKey: "positiveIncrease",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 7 days ago",
  },
  trendBiWeek: {
    days: 15,
    deathChange: "14 day average change in Deaths",
    deathKey: "deathIncrease",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 14 days ago",
    positiveChange: "14 day average change in New Cases",
    positiveKey: "positiveIncrease",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 14 days ago",
  },
  trendMonth: {
    days: 31,
    deathChange: "1 month average change in Deaths",
    deathKey: "deathIncrease",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 1 month ago",
    positiveChange: "1 month average change in New Cases",
    positiveKey: "positiveIncrease",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 1 month ago",
  },
} satisfies Record<Selection, Labels>;

const changeOf = (from: Day | undefined, to: Day | undefined, key: CountKey) => {
  const before = from?.[key];
  const after = to?.[key];

  return before === undefined || after === undefined ? "N/A" : `${growthRate(before, after)}%`;
};

interface FeaturedProps {
  dailyData: readonly Day[];
  selectedState: string | undefined;
  selectedFilter: Selection;
  onSelectFilter: (selection: Selection) => void;
  isLoading: boolean;
}

export const Featured = ({
  dailyData,
  selectedState,
  selectedFilter,
  onSelectFilter,
  isLoading,
}: FeaturedProps) => {
  const [firstDay] = dailyData;
  const today = dailyData.at(-1);
  const label = selectionToLabels[selectedFilter];
  const comparator = dailyData.at(-label.days);

  return (
    <section className="featured-content flex flex-1 flex-col px-4 sm:px-0">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg">
          {(selectedState === undefined ? undefined : stateAbbrevToFullname.get(selectedState)) ??
            "United States"}
        </h1>
        <DataFilter selected={selectedFilter} onSelectFilter={onSelectFilter} />
      </div>
      <div className="mb-4 grid-cols-4 gap-4 sm:grid">
        <StatCard
          label="Total Cases"
          pointClassname="bg-teal-500"
          pointShadeClassname="bg-teal-800"
          value={formatNumber(today?.positive)}
          isLoading={isLoading}
        />
        <StatCard
          label="First Case"
          pointClassname="bg-yellow-500"
          pointShadeClassname="bg-yellow-800"
          value={firstDay === undefined ? "Unknown" : differenceInDays(now, firstDay.date)}
          suffix="days ago"
          isLoading={isLoading}
        />
        <StatCard
          label="Recovered"
          pointClassname="bg-purple-500"
          pointShadeClassname="bg-purple-800"
          value={formatNumber(today?.recovered)}
          isLoading={isLoading}
        />
        <StatCard
          label="Deaths"
          pointClassname="bg-pink-500"
          pointShadeClassname="bg-pink-800"
          value={formatNumber(today?.death)}
          isLoading={isLoading}
        />
      </div>
      <div className="mb-4 grid-cols-2 gap-4 sm:grid">
        <Card>
          <StatRow
            className="mb-1"
            label={label.positiveChange}
            value={changeOf(comparator, today, label.positiveKey)}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            className="mb-1"
            label={label.positiveTotal}
            value={formatNumber(today?.[label.positiveKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.positiveTotalComparator}
            value={comparator === undefined ? "N/A" : formatNumber(comparator[label.positiveKey])}
            isLoading={isLoading}
            lowercase
          />
        </Card>
        <Card>
          <StatRow
            className="mb-1"
            label={label.deathChange}
            value={changeOf(comparator, today, label.deathKey)}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            className="mb-1"
            label={label.deathTotal}
            value={formatNumber(today?.[label.deathKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.deathTotalComparator}
            value={comparator === undefined ? "N/A" : formatNumber(comparator[label.deathKey])}
            isLoading={isLoading}
            lowercase
          />
        </Card>
      </div>
      <Card className="flex-1">
        <LineChart data={dailyData} dataKey={label.positiveKey} />
      </Card>
    </section>
  );
};
