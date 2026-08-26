import * as stylex from "@stylexjs/stylex";
import {
  containers,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  mediaQueries,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../../styles/tokens.stylex";
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "components/Icon";
import { Loader } from "components/Loader";
import { Map } from "components/Map";
import { PageContainer } from "components/PageContainer";
import { StatCard } from "components/StatCard";
import { sum } from "d3-array";
import { set } from "d3-collection";
import { useGetStatesDailyData } from "hooks/useGetStatesDailyData";
import { formatDate, formatNumber } from "utils/formatter";

const US_POPULATION = 400376491;

const styles = stylex.create({
  wrap: {
    marginInline: "auto",
    marginBottom: spacing[8],
    width: "100%",
    maxWidth: containers["4xl"],
    paddingInline: spacing[4],
  },
  head: {
    marginBottom: spacing[3],
    alignItems: "center",
    justifyContent: "space-between",
    display: { default: null, [mediaQueries.sm]: "flex" },
  },
  eyebrow: {
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    fontWeight: fontWeights.semibold,
    color: colors.gray400,
    textTransform: "uppercase",
  },
  title: {
    display: "flex",
    alignItems: "center",
    fontSize: fontSizes["2xl"],
    lineHeight: fontSizeLineHeights["2xl"],
    fontWeight: fontWeights.bold,
  },
  playButton: { marginRight: spacing[2] },
  slider: { width: spacing[64] },
  sliderLabels: { display: "flex", justifyContent: "space-between" },
  sliderLabel: { fontSize: fontSizes.xs, lineHeight: fontSizeLineHeights.xs },
  grid3: {
    marginBottom: spacing[4],
    display: { default: null, [mediaQueries.sm]: "grid" },
    gridTemplateColumns: { default: null, [mediaQueries.sm]: "repeat(3, minmax(0, 1fr))" },
    gap: spacing[4],
  },
});

export const DistributionPage = () => {
  const { raw, isLoading } = useGetStatesDailyData();
  const [sliderIndex, setSliderIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const dates = useMemo(() => set(raw.map((s) => s.date).toReversed()).values(), [raw]);
  // holds the date of the displayed day. calculated using the slider index
  const currentDate = useMemo(() => dates[sliderIndex], [dates, sliderIndex]);

  const getValue = useMemo(
    () =>
      (d, field, normalized = false) =>
        ((d.properties.dailyData[currentDate] && d.properties.dailyData[currentDate][field]) || 0) /
        (normalized ? d.properties.population / 1000000 : 1),
    [currentDate],
  );

  const sumTotalTestResults = useMemo(
    () => sum(raw, (day) => (day.date === currentDate ? day.totalTestResults : 0)),
    [currentDate, raw],
  );

  const sumPositive = useMemo(
    () => sum(raw, (day) => (day.date === currentDate ? day.positive : 0)),
    [currentDate, raw],
  );

  const sumNegative = useMemo(
    () => sum(raw, (day) => (day.date === currentDate ? day.negative : 0)),
    [currentDate, raw],
  );

  // The slider starts on the most recent day, and playback stops on its own
  // once it gets back there.
  const [knownDateCount, setKnownDateCount] = useState(0);
  if (dates.length !== knownDateCount) {
    setKnownDateCount(dates.length);
    setSliderIndex(dates.length > 0 ? dates.length - 1 : 0);
  }

  const atEnd = dates.length === 0 || sliderIndex >= dates.length - 1;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return undefined;

    const interval = setInterval(() => setSliderIndex((index) => index + 1), 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlaying = () => {
    if (dates.length === 0) return;
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (atEnd) setSliderIndex(0);
    setPlaying(true);
  };

  return (
    <PageContainer>
      <div {...stylex.props(styles.wrap)}>
        <div {...stylex.props(styles.head)}>
          <div>
            <h4 {...stylex.props(styles.eyebrow)}>The Spread of COVID-19 in the US</h4>
            <h1 {...stylex.props(styles.title)}>
              <button
                type="button"
                disabled={dates.length === 0}
                {...stylex.props(styles.playButton)}
                onClick={() => togglePlaying()}
                role="switch"
                aria-label={isPlaying ? "Stop animation" : "Start animation"}
                aria-checked={isPlaying}
                tabIndex={0}
              >
                <Icon icon={isPlaying ? "pause" : "play"} />
              </button>
              {isLoading ? (
                <Loader width="100%" height="36">
                  <rect x="0" y="0" rx="4" ry="4" width="100%" height="100%" />
                </Loader>
              ) : (
                <span>{formatDate(currentDate, "%B %d")}</span>
              )}
            </h1>
          </div>
          <div>
            <div>
              <input
                aria-label="Displayed date"
                {...stylex.props(styles.slider)}
                onChange={(event) => setSliderIndex(parseInt(event.target.value, 10))}
                min={0}
                max={dates.length - 1}
                value={sliderIndex}
                type="range"
              />
            </div>
            <div {...stylex.props(styles.sliderLabels)}>
              {isLoading ? (
                <Loader width="250" height="18">
                  <rect x="0" y="0" rx="4" ry="4" width="100%" height="100%" />
                </Loader>
              ) : (
                <>
                  <span {...stylex.props(styles.sliderLabel)}>{formatDate(dates[0])}</span>
                  <span {...stylex.props(styles.sliderLabel)}>
                    {formatDate(dates[dates.length - 1])}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div {...stylex.props(styles.grid3)}>
          <StatCard
            label="Total Tests Conducted"
            tone="gray"
            value={formatNumber(sumTotalTestResults)}
            suffix={`(${((sumTotalTestResults / US_POPULATION) * 100).toFixed(
              2,
            )}% of US population)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Positive Tests"
            tone="teal"
            value={formatNumber(sumPositive)}
            suffix={`(${((sumPositive / sumTotalTestResults) * 100).toFixed(2)}% of tests)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Negative Tests"
            tone="green"
            value={formatNumber(sumNegative)}
            suffix={`(${((sumNegative / sumTotalTestResults) * 100).toFixed(2)}% of tests)`}
            isLoading={isLoading}
          />
        </div>
        {isLoading ? (
          <Loader width="100%" height="600">
            <rect x="0" y="0" rx="4" ry="4" width="100%" height="100%" />
          </Loader>
        ) : (
          <Map
            rawStateData={raw}
            getValue={getValue}
            currentDate={currentDate}
            currentField="positive"
            useChoropleth={false}
          />
        )}
      </div>
    </PageContainer>
  );
};
