import { differenceInDays } from "date-fns";
import { Card } from "components/Card";
import { StatCard, StatRow } from "components/StatCard";
import { LineChart } from "components/LineChart";
import { growthRate } from "utils/stats";
import { stateAbbrevToFullname } from "utils/map-utils";
import { formatNumber } from "utils/formatter";
import { DataFilter, SELECTIONS } from "./DataFilter";

const selectionToLabels = {
  [SELECTIONS.time]: {
    positiveChange: "% increase in Total Cases",
    positiveTotal: "Total Cases today",
    positiveTotalComparator: "Total Cases yesterday",
    positiveKey: "positive",
    deathChange: "% increase in Deaths",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths yesterday",
    deathKey: "death",
    days: 2,
  },
  [SELECTIONS.trendDay]: {
    positiveChange: "1 day average change in New Cases",
    positiveTotal: "New Cases today",
    positiveTotalComparator: "New Cases yesterday",
    positiveKey: "positiveIncrease",
    deathChange: "1 day average change in Deaths",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths yesterday",
    deathKey: "deathIncrease",
    days: 2,
  },
  [SELECTIONS.trendWeek]: {
    positiveChange: "7 day average change in New Cases",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 7 days ago",
    positiveKey: "positiveIncrease",
    deathChange: "7 day average change in Deaths",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 7 days ago",
    deathKey: "deathIncrease",
    days: 8,
  },
  [SELECTIONS.trendBiWeek]: {
    positiveChange: "14 day average change in New Cases",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 14 days ago",
    positiveKey: "positiveIncrease",
    deathChange: "14 day average change in Deaths",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 14 days ago",
    deathKey: "deathIncrease",
    days: 15,
  },
  [SELECTIONS.trendMonth]: {
    positiveChange: "1 month average change in New Cases",
    positiveTotal: "New cases today",
    positiveTotalComparator: "New cases 1 month ago",
    positiveKey: "positiveIncrease",
    deathChange: "1 month average change in Deaths",
    deathTotal: "Deaths today",
    deathTotalComparator: "Deaths 1 month ago",
    deathKey: "deathIncrease",
    days: 31,
  },
};

export const Featured = ({
  dailyData,
  selectedState,
  selectedFilter,
  onSelectFilter,
  isLoading,
}) => {
  const firstDay = dailyData[0];
  const today = dailyData[dailyData.length - 1];
  const label = selectionToLabels[selectedFilter];
  const comparator = dailyData[dailyData.length - label.days];

  return (
    <section className="featured-content flex flex-col flex-1 px-4 sm:px-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg">
          {stateAbbrevToFullname[selectedState] || "United States"}
        </h1>
        <DataFilter selected={selectedFilter} onSelectFilter={onSelectFilter} />
      </div>
      <div className="sm:grid grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Cases"
          pointClassname="bg-teal-500"
          pointShadeClassname="bg-teal-800"
          value={today && formatNumber(today.positive)}
          isLoading={isLoading}
        />
        <StatCard
          label="First Case"
          pointClassname="bg-yellow-500"
          pointShadeClassname="bg-yellow-800"
          value={differenceInDays(new Date(), firstDay && firstDay.date)}
          suffix="days ago"
          isLoading={isLoading}
        />
        <StatCard
          label="Recovered"
          pointClassname="bg-purple-500"
          pointShadeClassname="bg-purple-800"
          value={
            today && today.recovered ? formatNumber(today.recovered) : "Unknown"
          }
          isLoading={isLoading}
        />
        <StatCard
          label="Deaths"
          pointClassname="bg-pink-500"
          pointShadeClassname="bg-pink-800"
          value={today && today.death ? formatNumber(today.death) : "Unknown"}
          isLoading={isLoading}
        />
      </div>
      <div className="sm:grid grid-cols-2 gap-4 mb-4">
        <Card>
          <StatRow
            className="mb-1"
            label={label.positiveChange}
            value={
              today &&
              `${growthRate(
                comparator[label.positiveKey],
                today[label.positiveKey]
              )}%`
            }
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            className="mb-1"
            label={label.positiveTotal}
            value={today && formatNumber(today[label.positiveKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.positiveTotalComparator}
            value={
              comparator ? formatNumber(comparator[label.positiveKey]) : "N/A"
            }
            isLoading={isLoading}
            lowercase
          />
        </Card>
        <Card>
          <StatRow
            className="mb-1"
            label={label.deathChange}
            value={
              today &&
              `${growthRate(
                comparator[label.deathKey],
                today[label.deathKey]
              )}%`
            }
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            className="mb-1"
            label={label.deathTotal}
            value={today && formatNumber(today[label.deathKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.deathTotalComparator}
            value={
              comparator ? formatNumber(comparator[label.deathKey]) : "N/A"
            }
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
