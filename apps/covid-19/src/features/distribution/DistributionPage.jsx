import React, { useState, useMemo, useEffect } from "react";
import { set } from "d3-collection";
import { sum } from "d3-array";
import { useGetStatesDailyData } from "hooks/useGetStatesDailyData";
import { Loader } from "components/Loader";
import { PageContainer } from "components/PageContainer";
import { StatCard } from "components/StatCard";
import { Map } from "components/Map";
import { Icon } from "components/Icon";
import { formatDate, formatNumber } from "utils/formatter";

const US_POPULATION = 400376491;

export const DistributionPage = () => {
  const { raw, isLoading } = useGetStatesDailyData();
  const [sliderIndex, setSliderIndex] = useState(0);
  const [sliderInterval, setSliderInterval] = useState(null);
  const [playing, setPlaying] = useState(false);
  // the data is joined to the stateJson in the Map child component and
  // updated using setJoinedData.
  // this is because we need access to the d3 Path used for calculating
  // the centroid of each state
  const [joinedData, setJoinedData] = useState(null);

  const dates = useMemo(
    () => set(raw.map((s) => s.date).reverse()).values(),
    [raw]
  );
  // holds the date of the displayed day. calculated using the slider index
  const currentDate = useMemo(() => dates[sliderIndex], [dates, sliderIndex]);

  const getValue = useMemo(
    () =>
      (d, field, normalized = false) =>
        ((d.properties.dailyData[currentDate] &&
          d.properties.dailyData[currentDate][field]) ||
          0) / (normalized ? d.properties.population / 1000000 : 1),
    [currentDate]
  );

  const sumTotalTestResults = useMemo(
    () =>
      joinedData &&
      sum(joinedData.features, (d) => getValue(d, "totalTestResults")),
    [joinedData, getValue]
  );

  const sumPositive = useMemo(
    () =>
      joinedData && sum(joinedData.features, (d) => getValue(d, "positive")),
    [joinedData, getValue]
  );

  const sumNegative = useMemo(
    () =>
      joinedData && sum(joinedData.features, (d) => getValue(d, "negative")),
    [joinedData, getValue]
  );

  useEffect(() => {
    if (sliderIndex === dates.length - 1) {
      stop();
    }
  }, [sliderIndex]);

  useEffect(() => {
    if (playing && !sliderInterval) {
      start();
    } else {
      stop();
    }
  }, [playing]);

  useEffect(() => {
    if (dates.length) {
      setSliderIndex(dates.length - 1);
    }
  }, [dates.length]);

  const start = () => {
    if (sliderIndex === dates.length - 1) {
      setSliderIndex(0);
    }
    setSliderInterval(setInterval(() => setSliderIndex((i) => i + 1), 300));
  };

  const stop = () => {
    clearInterval(sliderInterval);
    setPlaying(false);
    setSliderInterval(null);
  };

  const togglePlaying = () => setPlaying((p) => !p);

  return (
    <PageContainer>
      <div className="w-full max-w-4xl mx-auto mb-8 px-4">
        <div className="sm:flex justify-between mb-3 items-center">
          <div>
            <h4 className="text-xs uppercase text-gray-400 font-semibold">
              The Spread of COVID-19 in the US
            </h4>
            <h1 className="text-2xl font-bold flex items-center">
              <button
                className="mr-2"
                onClick={() => togglePlaying()}
                onKeyDown={() => togglePlaying()}
                role="switch"
                label={playing ? "stop" : "start"}
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
                className="w-64"
                onChange={(event) =>
                  setSliderIndex(parseInt(event.target.value, 10))
                }
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
                  <span className="text-xs">
                    {formatDate(dates[dates.length - 1])}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="sm:grid grid-cols-3 gap-4 mb-4">
          <StatCard
            label="Total Tests Conducted"
            pointClassname="bg-gray-500"
            pointShadeClassname="bg-gray-800"
            value={formatNumber(sumTotalTestResults)}
            suffix={`(${((sumTotalTestResults / US_POPULATION) * 100).toFixed(
              2
            )}% of US population)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Positive Tests"
            pointClassname="bg-teal-500"
            pointShadeClassname="bg-teal-800"
            value={formatNumber(sumPositive)}
            suffix={`(${((sumPositive / sumTotalTestResults) * 100).toFixed(
              2
            )}% of tests)`}
            isLoading={isLoading}
          />
          <StatCard
            label="Negative Tests"
            pointClassname="bg-green-500"
            pointShadeClassname="bg-green-800"
            value={formatNumber(sumNegative)}
            suffix={`(${((sumNegative / sumTotalTestResults) * 100).toFixed(
              2
            )}% of tests)`}
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
            setJoinedData={setJoinedData}
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
