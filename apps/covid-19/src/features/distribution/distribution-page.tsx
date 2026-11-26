import { useEffect, useMemo, useState } from "react";
import { Icon } from "components/icon";
import { Loader } from "components/loader";
import { Map } from "components/map";
import type { GetValue } from "components/map";
import { PageContainer } from "components/page-container";
import { StatCard } from "components/stat-card";
import { sum } from "d3";
import { useGetStatesDailyData } from "hooks/use-get-states-daily-data";
import { formatDate, formatNumber } from "utils/formatter";

const US_POPULATION = 400_376_491;

export const DistributionPage = () => {
  const { raw, isLoading } = useGetStatesDailyData();
  const [sliderIndex, setSliderIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const dates = useMemo(() => [...new Set(raw.map((s) => s.day).toReversed())], [raw]);
  const currentDate = dates[sliderIndex];
  const [firstDate] = dates;
  const lastDate = dates.at(-1);

  const getValue = useMemo<GetValue>(
    () =>
      (d, field, normalized = false) =>
        ((currentDate === undefined
          ? undefined
          : d.properties.dailyData.get(currentDate)?.[field]) ?? 0) /
        (normalized ? d.properties.population / 1_000_000 : 1),
    [currentDate],
  );

  const sumTotalTestResults = useMemo(
    () => sum(raw, (day) => (day.day === currentDate ? day.totalTestResults : 0)),
    [currentDate, raw],
  );

  const sumPositive = useMemo(
    () => sum(raw, (day) => (day.day === currentDate ? day.positive : 0)),
    [currentDate, raw],
  );

  const sumNegative = useMemo(
    () => sum(raw, (day) => (day.day === currentDate ? day.negative : 0)),
    [currentDate, raw],
  );

  const [knownDateCount, setKnownDateCount] = useState(0);

  if (dates.length !== knownDateCount) {
    setKnownDateCount(dates.length);
    setSliderIndex(dates.length > 0 ? dates.length - 1 : 0);
  }

  const atEnd = dates.length === 0 || sliderIndex >= dates.length - 1;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isPlaying) {
      const interval = setInterval(() => {
        setSliderIndex((index) => index + 1);
      }, 300);

      cleanup = () => {
        clearInterval(interval);
      };
    }

    return cleanup;
  }, [isPlaying]);

  const togglePlaying = () => {
    if (dates.length === 0) {
      return;
    }

    if (isPlaying) {
      setPlaying(false);

      return;
    }

    if (atEnd) {
      setSliderIndex(0);
    }

    setPlaying(true);
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
                onClick={togglePlaying}
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
                <span>{currentDate === undefined ? "" : formatDate(currentDate, "%B %d")}</span>
              )}
            </h1>
          </div>
          <div>
            <div>
              <input
                aria-label="Displayed date"
                className="w-64"
                onChange={(event) => {
                  setSliderIndex(Math.trunc(Number(event.target.value)));
                }}
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
                  <span className="text-xs">
                    {firstDate === undefined ? "" : formatDate(firstDate)}
                  </span>
                  <span className="text-xs">
                    {lastDate === undefined ? "" : formatDate(lastDate)}
                  </span>
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
