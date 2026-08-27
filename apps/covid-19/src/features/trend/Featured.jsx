import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import * as stylex from "@stylexjs/stylex";
import { fontSizes, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { Card } from "components/Card";
import { LineChart } from "components/LineChart";
import { StatCard, StatRow } from "components/StatCard";
import { differenceInDays } from "date-fns";
import { formatNumber } from "utils/formatter";
import { stateAbbrevToFullname } from "utils/map-utils";
import { growthRate } from "utils/stats";

import { DataFilter, SELECTIONS } from "./DataFilter";

const styles = stylex.create({
  section: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    paddingInline: { default: spacing[4], [mediaUp.sm]: 0 },
    // was `.featured-content` in TrendPage.css
    height: { default: null, [mediaUp.sm]: "var(--trend-page-height)" },
    overflow: { default: null, [mediaUp.sm]: "hidden" },
  },
  header: {
    marginBottom: spacing[4],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSizes.lg, lineHeight: leading.lg },
  grid4: {
    marginBottom: spacing[4],
    display: { default: null, [mediaUp.sm]: "grid" },
    gridTemplateColumns: { default: null, [mediaUp.sm]: "repeat(4, minmax(0, 1fr))" },
    gap: spacing[4],
  },
  grid2: {
    marginBottom: spacing[4],
    display: { default: null, [mediaUp.sm]: "grid" },
    gridTemplateColumns: { default: null, [mediaUp.sm]: "repeat(2, minmax(0, 1fr))" },
    gap: spacing[4],
  },
  mb1: { marginBottom: spacing[1] },
  flex1: { flex: 1 },
});

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
    <section {...stylex.props(styles.section)}>
      <div {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>
          {stateAbbrevToFullname[selectedState] || "United States"}
        </h1>
        <DataFilter selected={selectedFilter} onSelectFilter={onSelectFilter} />
      </div>
      <div {...stylex.props(styles.grid4)}>
        <StatCard
          label="Total Cases"
          tone="teal"
          value={today && formatNumber(today.positive)}
          isLoading={isLoading}
        />
        <StatCard
          label="First Case"
          tone="yellow"
          value={differenceInDays(new Date(), firstDay && firstDay.date)}
          suffix="days ago"
          isLoading={isLoading}
        />
        <StatCard
          label="Recovered"
          tone="purple"
          value={today && today.recovered ? formatNumber(today.recovered) : "Unknown"}
          isLoading={isLoading}
        />
        <StatCard
          label="Deaths"
          tone="pink"
          value={today && today.death ? formatNumber(today.death) : "Unknown"}
          isLoading={isLoading}
        />
      </div>
      <div {...stylex.props(styles.grid2)}>
        <Card>
          <StatRow
            style={styles.mb1}
            label={label.positiveChange}
            value={
              today && `${growthRate(comparator[label.positiveKey], today[label.positiveKey])}%`
            }
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            style={styles.mb1}
            label={label.positiveTotal}
            value={today && formatNumber(today[label.positiveKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.positiveTotalComparator}
            value={comparator ? formatNumber(comparator[label.positiveKey]) : "N/A"}
            isLoading={isLoading}
            lowercase
          />
        </Card>
        <Card>
          <StatRow
            style={styles.mb1}
            label={label.deathChange}
            value={today && `${growthRate(comparator[label.deathKey], today[label.deathKey])}%`}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            style={styles.mb1}
            label={label.deathTotal}
            value={today && formatNumber(today[label.deathKey])}
            isLoading={isLoading}
            lowercase
          />
          <StatRow
            label={label.deathTotalComparator}
            value={comparator ? formatNumber(comparator[label.deathKey]) : "N/A"}
            isLoading={isLoading}
            lowercase
          />
        </Card>
      </div>
      <Card style={styles.flex1}>
        <LineChart data={dailyData} dataKey={label.positiveKey} />
      </Card>
    </section>
  );
};
