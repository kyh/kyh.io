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

  useEffect(() => {
    if (sliderIndex === dates.length - 1) {
      setPlaying(false);
    }
  }, [dates.length, sliderIndex]);

  useEffect(() => {
    if (!playing || dates.length === 0) return undefined;

    const interval = setInterval(() => setSliderIndex((index) => index + 1), 300);
    return () => clearInterval(interval);
  }, [dates.length, playing]);

  useEffect(() => {
    if (dates.length) {
      setSliderIndex(dates.length - 1);
    }
  }, [dates.length]);

  const togglePlaying = () => {
    if (dates.length === 0) return;
    if (!playing && sliderIndex === dates.length - 1) {
      setSliderIndex(0);
    }
    setPlaying((current) => !current);
  };

  return (
    <PageContainer>
      <div className="mx-auto mb-8 w-full max-w-4xl px-4">
        <div className="mb-3 items-center justify-between sm:flex">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase">
              The Spread of COVID-19 in the US
            </h4>
            <h1 className="flex items-center text-2xl font-bold">
              <button
                type="button"
                disabled={dates.length === 0}
                className="mr-2"
                onClick={() => togglePlaying()}
                role="switch"
                aria-label={playing ? "Stop animation" : "Start animation"}
                aria-checked={playing}
                tabIndex={0}
              >
                <Icon icon={playing ? "pause" : "play"} />
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
                className="w-64"
                onChange={(event) => setSliderIndex(parseInt(event.target.value, 10))}
                min={0}
                max={dates.length - 1}
                value={sliderIndex}
                type="range"
              />
            </div>
            <div className="flex justify-between">
              {isLoading ? (
                <Loader width="250" height="18">
                  <rect x="0" y="0" rx="4" ry="4" width="100%" height="100%" />
                </Loader>
              ) : (
                <>
                  <span className="text-xs">{formatDate(dates[0])}</span>
                  <span className="text-xs">{formatDate(dates[dates.length - 1])}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mb-4 grid-cols-3 gap-4 sm:grid">
          <StatCard
            label="Total Tests Conducted"
            pointClassname="bg-gray-500"
            pointShadeClassname="bg-gray-800"
            value={formatNumber(sumTotalTestResults)}
            suffix={`(${((sumTotalTestResults / US_POPULATION) * 100).toFixed(
              2,
            )}% of US population)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Positive Tests"
            pointClassname="bg-teal-500"
            pointShadeClassname="bg-teal-800"
            value={formatNumber(sumPositive)}
            suffix={`(${((sumPositive / sumTotalTestResults) * 100).toFixed(2)}% of tests)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Negative Tests"
            pointClassname="bg-green-500"
            pointShadeClassname="bg-green-800"
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
