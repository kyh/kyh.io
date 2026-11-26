import { useMemo, useState } from "react";
import { format, geoAlbersUsa, geoPath, group, index, max, scaleSqrt, scaleThreshold } from "d3";
import type { GeoPath, ScalePower } from "d3";
import statesGeoJson from "data/states.json";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { MapField, StateDay } from "utils/daily";
import { formatDate, formatNumber } from "utils/formatter";
import { z } from "zod";

import { ChoroLegend } from "./choro-legend";

const ring = z.array(z.array(z.number()));

const stateGeoSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.discriminatedUnion("type", [
        z.object({ coordinates: z.array(ring), type: z.literal("Polygon") }),
        z.object({ coordinates: z.array(z.array(ring)), type: z.literal("MultiPolygon") }),
      ]),
      properties: z.object({ NAME: z.string(), STUSPS: z.string(), population: z.number() }),
      type: z.literal("Feature"),
    }),
  ),
  type: z.literal("FeatureCollection"),
});

const statesWithPopulation = stateGeoSchema.parse(statesGeoJson);

type StateFeature = (typeof statesWithPopulation.features)[number];

export interface MapState extends Feature<Polygon | MultiPolygon> {
  properties: StateFeature["properties"] & {
    centroidCoordinates: [number, number];
    dailyData: ReadonlyMap<string, StateDay>;
  };
}

export type GetValue = (state: MapState, field: MapField, normalized?: boolean) => number;

interface Hovered {
  coordinates: [number, number];
  state: MapState;
}

type StatePath = GeoPath<unknown, MapState | StateFeature>;

type BubbleScale = ScalePower<number, number>;

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
} as const;

const margin = {
  bottom: 10,
  left: 10,
  right: 10,
  top: 10,
};

const colorLimits: Record<MapField, number[]> = {
  death: [5, 10, 25, 50, 100, 250, 500],
  positive: [100, 250, 500, 1000, 2500, 5000, 10_000],
  totalTestResults: [1000, 5000, 7500, 10_000, 12_500, 15_000, 25_000],
};

const { 3: strokeWhite, 6: strokeGrey } = colorSchemes.gray;

const getColor = {
  death: scaleThreshold(colorLimits.death, colorSchemes.pink),
  positive: scaleThreshold(colorLimits.positive, colorSchemes.teal),
  totalTestResults: scaleThreshold(colorLimits.totalTestResults, colorSchemes.gray),
};

const getStrokeColor: Record<MapField, string> = {
  death: strokeWhite,
  positive: strokeGrey,
  totalTestResults: strokeGrey,
};

const mapWidth = window.innerWidth < 910 ? window.innerWidth - 30 : 910;
const mapHeight = 520;

interface StatesProps {
  states: readonly MapState[];
  useChoropleth: boolean;
  currentField: MapField;
  hoveredState: Hovered | undefined;
  onHover: (hovered: Hovered) => void;
  getValue: GetValue;
  path: StatePath;
}

const States = ({
  states,
  useChoropleth,
  currentField,
  hoveredState,
  onHover,
  getValue,
  path,
}: StatesProps) => {
  const getColorFromFeature = (d: MapState) => {
    if (!useChoropleth) {
      return "transparent";
    }

    const value = getValue(d, currentField);
    const normalizationPopulation = 1_000_000;
    const normalizedValue = value / (d.properties.population / normalizationPopulation);

    return getColor[currentField](normalizedValue);
  };

  const strokeColor = useChoropleth ? getStrokeColor[currentField] : strokeGrey;

  const paths = states.map((d) => (
    <path
      key={`path${d.properties.NAME}`}
      d={path(d) ?? undefined}
      className="states"
      fill={getColorFromFeature(d)}
      stroke={strokeColor}
      pointerEvents="all"
      onMouseEnter={() => {
        onHover({ coordinates: d.properties.centroidCoordinates, state: d });
      }}
    />
  ));

  return (
    <>
      <g>{paths}</g>
      {hoveredState !== undefined && (
        <path
          d={path(hoveredState.state) ?? undefined}
          className="hovered-states"
          fill="transparent"
          stroke={colorSchemes.gray[4]}
          strokeWidth="2px"
        />
      )}
    </>
  );
};

interface BubblesProps {
  states: readonly MapState[];
  r: BubbleScale;
  getValue: GetValue;
}

const Bubbles = ({ states, r, getValue }: BubblesProps) => {
  const features = states.filter((d) => Number.isFinite(d.properties.centroidCoordinates[0]));

  const createBubble = (d: MapState, i: number, property: MapField) => (
    <circle
      key={property + i}
      fill={property === "positive" ? colorSchemes.teal[5] : colorSchemes.gray[5]}
      cx={d.properties.centroidCoordinates[0]}
      cy={d.properties.centroidCoordinates[1]}
      r={r(getValue(d, property))}
      fillOpacity={property === "positive" ? 0.8 : 0.2}
    />
  );

  const testBubbles = features.map((d, i) => createBubble(d, i, "totalTestResults"));
  const positiveBubbles = features.map((d, i) => createBubble(d, i, "positive"));

  return (
    <>
      <g className="test-bubbles">{testBubbles}</g>
      <g className="positive-bubbles">{positiveBubbles}</g>
    </>
  );
};

const formatLegendEntry = (d: number) => Math.trunc(Number(format(".1r")(d)));

interface BubbleLegendProps {
  r: BubbleScale;
  maxValue: number;
  width: number;
  height: number;
}

const BubbleLegend = ({ r, maxValue, width, height }: BubbleLegendProps) => {
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

interface TooltipProps {
  hoveredState: Hovered;
  currentDate: string | undefined;
  getValue: GetValue;
}

const Tooltip = ({ hoveredState, currentDate, getValue }: TooltipProps) => {
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
      className="bg-opacity-75 pointer-events-none absolute rounded-md bg-gray-800 p-2 shadow-sm"
      style={{ left: x, top: y }}
    >
      <table className="table-auto text-left">
        <thead>
          <tr>
            <th className="px-2 text-lg font-bold" colSpan={2}>
              {d.properties.NAME}
            </th>
            <th className="px-2 text-right align-middle text-xs font-normal">
              ({currentDate === undefined ? "" : formatDate(currentDate)})
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

const joinStates = (rawStateData: readonly StateDay[], path: StatePath) => {
  const byState = group(rawStateData, (d) => d.state);

  return statesWithPopulation.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      centroidCoordinates: path.centroid(feature),
      dailyData: index(byState.get(feature.properties.STUSPS) ?? [], (d) => d.day),
    },
  })) satisfies MapState[];
};

interface MapProps {
  rawStateData: readonly StateDay[];
  currentField: MapField;
  currentDate: string | undefined;
  getValue: GetValue;
  useChoropleth: boolean;
}

export const Map = ({
  rawStateData,
  currentField,
  currentDate,
  getValue,
  useChoropleth,
}: MapProps) => {
  const path = useMemo(() => {
    const projection = geoAlbersUsa().fitExtent(
      [
        [margin.left, margin.top],
        [mapWidth - margin.right, mapHeight - margin.bottom],
      ],
      statesWithPopulation,
    );

    return geoPath<unknown, MapState | StateFeature>(projection);
  }, []);

  const states = useMemo(() => joinStates(rawStateData, path), [rawStateData, path]);

  const [hoveredState, setHoveredState] = useState<Hovered>();

  const maxValue = useMemo(
    () =>
      max(
        states.flatMap((d) => [...d.properties.dailyData.values()]),
        (d) => d.totalTestResults,
      ) ?? 0,
    [states],
  );

  const r = useMemo(() => scaleSqrt().domain([0, maxValue]).range([0, 50]), [maxValue]);

  return (
    <div className="relative">
      <div className={["map-legend", useChoropleth ? "choropleth" : "bubble"].join(" ")}>
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
          <BubbleLegend r={r} maxValue={maxValue} height={150} width={150} />
        )}
      </div>

      <div className="mb-4">
        <svg
          width={mapWidth}
          height={mapHeight}
          onMouseLeave={() => {
            setHoveredState(undefined);
          }}
        >
          {!useChoropleth && <Bubbles states={states} getValue={getValue} r={r} />}
          <States
            states={states}
            useChoropleth={useChoropleth}
            currentField={currentField}
            getValue={getValue}
            hoveredState={hoveredState}
            onHover={setHoveredState}
            path={path}
          />
        </svg>
        {hoveredState !== undefined && (
          <Tooltip hoveredState={hoveredState} getValue={getValue} currentDate={currentDate} />
        )}
      </div>
      <span className="text-xs text-gray-500">* Per one million people</span>
    </div>
  );
};
