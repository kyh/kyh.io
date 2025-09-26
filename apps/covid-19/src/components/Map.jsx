import React, { useState, useMemo } from "react";

import { format } from "d3-format";
import { geoPath, geoAlbersUsa } from "d3-geo";
import { max } from "d3-array";
import { nest } from "d3-collection";
import { scaleSqrt, scaleThreshold } from "d3-scale";

import StatesWithPopulation from "data/states.json";
import { formatNumber, formatDate, parseDate } from "utils/formatter";
import { ChoroLegend } from "./ChoroLegend";

const colorSchemes = {
  gray: [
    "#f9fafb",
    "#f4f5f7",
    "#e5e7eb",
    "#d2d6dc",
    "#9fa6b2",
    "#6b7280",
    "#4b5563",
    "#374151",
    "#252f3f",
    "#161e2e",
  ],
  teal: [
    "#edfafa",
    "#d5f5f6",
    "#afecef",
    "#7edce2",
    "#16bdca",
    "#0694a2",
    "#047481",
    "#036672",
    "#05505c",
    "#014451",
  ],
  pink: [
    "#fdf2f8",
    "#fce8f3",
    "#fad1e8",
    "#f8b4d9",
    "#f17eb8",
    "#e74694",
    "#d61f69",
    "#bf125d",
    "#99154b",
    "#751a3d",
  ],
};

// static d3 setup
const margin = {
  bottom: 10,
  left: 10,
  right: 10,
  top: 10,
};
// this should be dynamic, espcially with the numbers only growing each day.
// for now there is just a scale for each of the fields.

/*
const limit = [
  1,
  5,
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10000,
  25000,
  50000,
]
*/

const colorLimits = {
  death: [5, 10, 25, 50, 100, 250, 500],
  positive: [100, 250, 500, 1000, 2500, 5000, 10000],
  totalTestResults: [1000, 5000, 7500, 10000, 12500, 15000, 25000],
};
const strokeGrey = colorSchemes.gray[6];
const strokeWhite = colorSchemes.gray[3];

const getColor = {
  death: scaleThreshold(colorLimits.death, colorSchemes.pink),
  positive: scaleThreshold(colorLimits.positive, colorSchemes.teal),
  totalTestResults: scaleThreshold(
    colorLimits.totalTestResults,
    colorSchemes.gray
  ),
};

const getStrokeColor = {
  death: strokeWhite,
  positive: strokeGrey,
  totalTestResults: strokeGrey,
};

const mapWidth = window.innerWidth < 910 ? window.innerWidth - 30 : 910;
const mapHeight = 520;

export const Map = ({
  rawStateData,
  currentField,
  currentDate,
  getValue,
  useChoropleth,
  setJoinedData,
}) => {
  const path = useMemo(() => {
    const projection = geoAlbersUsa().fitExtent(
      [
        [margin.left, margin.top],
        [mapWidth - margin.right, mapHeight - margin.bottom],
      ],
      StatesWithPopulation
    );
    return geoPath().projection(projection);
  }, []);

  const data = useMemo(() => {
    if (!rawStateData || !rawStateData.length || !path) return null;
    const createMapFromArray = (array, keyField, valueField = null) => {
      return Object.assign(
        {},
        ...array.map((a) => ({ [a[keyField]]: valueField ? a[valueField] : a }))
      );
    };
    const groupedByState = nest()
      .key((d) => d.state)
      .entries(rawStateData);
    const stateMap = createMapFromArray(groupedByState, "key", "values");
    const joinedFeatures = StatesWithPopulation.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        centroidCoordinates: path.centroid(feature), // should get rid of turf and use d3 for the centroid
        dailyData: createMapFromArray(
          stateMap[feature.properties.STUSPS],
          "date"
        ),
      },
    }));
    const tempData = { ...StatesWithPopulation, features: joinedFeatures };
    setJoinedData(tempData);
    return tempData;
  }, [rawStateData, path]);

  const [hoveredState, setHoveredState] = useState(null);
  const maxValue = useMemo(
    () =>
      data &&
      max(
        data.features
          .map((d) => Object.values(d.properties.dailyData))
          .reduce((acc, val) => acc.concat(val), [])
          .map((d) => d.totalTestResults)
      ),
    [data]
  );
  const r = useMemo(
    () => maxValue && scaleSqrt().domain([0, maxValue]).range([0, 50]),
    [maxValue]
  );

  return (
    <div className="relative">
      <div
        className={["map-legend", useChoropleth ? "choropleth" : "bubble"].join(
          " "
        )}
      >
        {useChoropleth ? (
          <ChoroLegend
            color={getColor[currentField]}
            height={36}
            width={300}
            tickSize={6}
            tickFormat="~s"
            spaceBetween={2}
          />
        ) : (
          <BubbleLegend
            data={data}
            r={r}
            maxValue={maxValue}
            height={150}
            width={150}
          />
        )}
      </div>

      <div className="mb-4">
        <svg
          width={mapWidth}
          height={mapHeight}
          onMouseLeave={() => {
            if (hoveredState) {
              setHoveredState(null);
            }
          }}
        >
          <>
            {!useChoropleth && (
              <Bubbles geoJson={data} getValue={getValue} r={r} />
            )}
            <States
              geoJson={data}
              useChoropleth={useChoropleth}
              currentField={currentField}
              getValue={getValue}
              hoveredState={hoveredState}
              setHoveredState={setHoveredState}
              path={path}
            />
          </>
        </svg>
        {!!hoveredState && (
          <Tooltip
            hoveredState={hoveredState}
            getValue={getValue}
            currentDate={currentDate}
          />
        )}
      </div>
      <span className="text-xs text-gray-500">* Per one million people</span>
    </div>
  );
};

const States = ({
  geoJson,
  useChoropleth,
  currentField,
  hoveredState,
  setHoveredState,
  getValue,
  path,
}) => {
  // below function should use getValue
  const getColorFromFeature = (d) => {
    if (!useChoropleth) return "transparent";
    const value = getValue(d) ? getValue(d) : 0; // account for undefined values
    const normalizationPopulation = 1000000; // 1 million;
    const normalizedValue =
      value / (d.properties.population / normalizationPopulation);
    return getColor[currentField](normalizedValue);
  };
  const strokeColor = useChoropleth ? getStrokeColor[currentField] : strokeGrey;
  const states = geoJson.features.map((d) => (
    <path
      key={`path${d.properties.NAME}`}
      d={path(d)}
      className="states"
      fill={getColorFromFeature(d)}
      stroke={strokeColor}
      pointerEvents="all"
      onMouseEnter={() => {
        setHoveredState({
          coordinates: [
            d.properties.centroidCoordinates[0],
            d.properties.centroidCoordinates[1],
          ],
          state: d,
        });
      }}
    />
  ));
  return (
    <>
      <g>{states}</g>
      {hoveredState && (
        <path
          d={path(hoveredState.state)}
          className="hovered-states"
          fill="transparent"
          stroke={colorSchemes.gray[4]}
          strokeWidth="2px"
        />
      )}
    </>
  );
};

const Bubbles = ({ geoJson, r, getValue }) => {
  // filter out "states" outside of render area (should be hoisted)
  const features = geoJson.features.filter(
    (d) => d.properties.centroidCoordinates[0]
  );

  const createBubble = (d, i, property) => {
    const props = {
      cx: d.properties.centroidCoordinates[0],
      cy: d.properties.centroidCoordinates[1],
      r: r(getValue(d, property)),
    };
    return (
      <circle
        key={property + i}
        fill={
          property === "positive" ? colorSchemes.teal[5] : colorSchemes.gray[5]
        }
        {...props}
        fillOpacity={property === "positive" ? 0.8 : 0.2}
      />
    );
  };
  const testBubbles = features.map((d, i) =>
    createBubble(d, i, "totalTestResults")
  );
  const positiveBubbles = features.map((d, i) =>
    createBubble(d, i, "positive")
  );
  return (
    <>
      <g className="test-bubbles">{testBubbles}</g>
      <g className="positive-bubbles">{positiveBubbles}</g>
    </>
  );
};

const BubbleLegend = ({ r, maxValue, width, height }) => {
  const formatLegendEntry = (d) => parseInt(format(".1r")(d), 10);
  const legendData = [
    formatLegendEntry(maxValue * 0.1),
    formatLegendEntry(maxValue * 0.5),
    formatLegendEntry(maxValue),
  ];
  const legendBubbles = legendData.map((d) => (
    <circle
      key={`legendBubbles${d}`}
      cx={width / 3 + 2}
      cy={height - r(d)}
      r={r(d)}
      stroke={colorSchemes.gray[6]}
      fill="none"
    />
  ));
  const legendLines = legendData.map((d) => (
    <line
      key={`legendLines${d}`}
      x1={width / 3 + 2}
      y1={height - 2 * r(d)}
      x2={width - 20}
      y2={height - 2 * r(d)}
      stroke={colorSchemes.gray[6]}
      strokeDasharray="5 5"
    />
  ));
  const legendText = legendData.map((d) => (
    <text
      key={`legendText${d}`}
      x={(width * 2) / 3 + 4}
      y={height - 2 * r(d) - 2}
      fill={colorSchemes.gray[4]}
      fontSize="15px"
    >
      {formatNumber(d)}
    </text>
  ));
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {legendBubbles}
      {legendLines}
      {legendText}
    </svg>
  );
};

const Tooltip = ({ hoveredState, currentDate, getValue }) => {
  const { coordinates, state } = hoveredState;
  const d = state;
  const [x, y] = coordinates;
  const positive = getValue(d, "positive");
  const positiveNorm = getValue(d, "positive", true);
  const totalTestResults = getValue(d, "totalTestResults");
  const totalTestResultsNorm = getValue(d, "totalTestResults", true);
  const death = getValue(d, "death");
  const deathNorm = getValue(d, "death", true);
  return (
    <div
      className="absolute pointer-events-none bg-gray-800 bg-opacity-75 rounded-md p-2 shadow-sm"
      style={{ top: y, left: x }}
    >
      <table className="table-auto text-left">
        <thead>
          <tr>
            <th className="text-lg font-bold px-2">{d.properties.NAME}</th>
            <th />
            <th className="text-xs text-right align-middle px-2 font-normal">
              ({formatDate(parseDate(currentDate))})
            </th>
          </tr>
          <tr className="text-sm font-normal">
            <th className="px-2 py-1">Metric</th>
            <th className="px-2 py-1">Total</th>
            <th className="px-2 py-1">Per capita*</th>
          </tr>
        </thead>
        <tbody className="text-sm font-normal">
          <tr>
            <th className="px-2 py-1">Tests</th>
            <td className="px-2 py-1">{formatNumber(totalTestResults)}</td>
            <td className="px-2 py-1">{formatNumber(totalTestResultsNorm)}</td>
          </tr>
          <tr>
            <th className="px-2 py-1">Positives</th>
            <td className="px-2 py-1">{formatNumber(positive)}</td>
            <td className="px-2 py-1">{formatNumber(positiveNorm)}</td>
          </tr>
          <tr>
            <th className="px-2 py-1">Deaths</th>
            <td className="px-2 py-1">{formatNumber(death)}</td>
            <td className="px-2 py-1">{formatNumber(deathNorm)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
