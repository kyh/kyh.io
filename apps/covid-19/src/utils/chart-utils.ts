import {
  area,
  axisBottom,
  axisLeft,
  bisector,
  extent,
  line,
  max,
  scaleLinear,
  scaleTime,
  select,
  timeFormat,
} from "d3";
import type { NumberValue, ScaleLinear, ScaleTime, Selection } from "d3";
import type { CountKey, Day } from "utils/daily";

export interface Margin {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export type ChartSvg = Selection<SVGSVGElement, unknown, null, undefined>;

type TimeScale = ScaleTime<number, number>;

type CountScale = ScaleLinear<number, number>;

export const createScales = (
  data: readonly Day[],
  dataKey: CountKey,
  width: number,
  height: number,
  margin: Margin,
) => {
  const [first, last] = extent(data, (d) => d.date);

  const x = scaleTime()
    .domain(first === undefined || last === undefined ? [] : [first, last])
    .nice()
    .rangeRound([margin.left, width - margin.right]);

  const y = scaleLinear()
    .domain([0, max(data, (d) => d[dataKey]) ?? 0])
    .nice()
    .range([height - margin.bottom, margin.top]);

  return { x, y };
};

const formatTick = timeFormat("%m/%d");

export const createAxis = (width: number, x: TimeScale, y: CountScale) => {
  const xAxis = axisBottom(x)
    .ticks(width / 80)
    .tickFormat((value: Date | NumberValue) =>
      formatTick(value instanceof Date ? value : new Date(value.valueOf())),
    )
    .tickSizeOuter(0);

  const yAxis = axisLeft(y).tickSize(-width);

  return { xAxis, yAxis };
};

const isDefined = (d: Day, dataKey: CountKey) => {
  const value = d[dataKey];

  return value !== undefined && value !== 0 && !Number.isNaN(d.date.getTime());
};

export const createLineFn = (dataKey: CountKey, x: TimeScale, y: CountScale) => {
  const d3Line = line<Day>()
    .defined((d) => isDefined(d, dataKey))
    .x((d) => x(d.date))
    .y((d) => y(d[dataKey] ?? 0));

  const d3Area = area<Day>()
    .defined((d) => isDefined(d, dataKey))
    .x((d) => x(d.date))
    .y0(y(0))
    .y1((d) => y(d[dataKey] ?? 0));

  return { area: d3Area, line: d3Line };
};

type Tooltip = Selection<SVGGElement, unknown, null, undefined>;

const callout = (g: Tooltip, value: string) => {
  g.style("display", null).style("pointer-events", "none").style("font-size", "10px");

  const path = g
    .selectAll("path")
    .data([null])
    .join("path")
    .attr("fill", "#252f3f")
    .attr("stroke", "#374151");

  const text = g
    .selectAll<SVGTextElement, null>("text")
    .data([null])
    .join("text")
    .call((textSel) => {
      textSel
        .selectAll("tspan")
        .data(value.split(/\n/u))
        .join("tspan")
        .attr("fill", "#d2d6dc")
        .attr("x", 0)
        .attr("y", (_, i) => `${i * 1.1}em`)
        .text((d) => d);
    });

  const box = text.node()?.getBBox();

  if (box === undefined) {
    return;
  }

  const { y: textY, width: w, height: h } = box;

  text.attr("transform", `translate(${-w / 2},${15 - textY})`);
  path.attr(
    "d",
    `M${-w / 2 - 10},5H${w / 2 + 10} a3,3 0 0 1 3,3 v${
      h + 15
    } a3,3 0 0 1 -3,3 h-${w + 20} a3,3 0 0 1 -3,-3 v-${h + 15} a3,3 0 0 1 3,-3 z`,
  );
};

export const createTooltipEvents = (data: readonly Day[], x: TimeScale) => {
  const byDay = bisector((d: Day) => d.date);

  const onMouseEvent = (mx: number) => {
    const date = x.invert(mx);
    const index = byDay.left(data, date, 1);
    const a = data[index - 1];
    const b = data[index];

    if (a === undefined || b === undefined) {
      return a ?? b;
    }

    return date.getTime() - a.date.getTime() > b.date.getTime() - date.getTime() ? b : a;
  };

  return { callout, onMouseEvent };
};

export const appendSvg = (container: HTMLElement, width: number, height: number) =>
  select(container)
    .append("svg")
    .attr("class", "chart")
    .attr("width", width)
    .attr("height", height);

export const appendDefs = (svg: ChartSvg) => {
  const defs = svg.append("defs");

  const gradient = defs
    .append("linearGradient")
    .attr("id", "svgGradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "100%");

  gradient
    .append("stop")
    .attr("class", "start")
    .attr("offset", "0%")
    .attr("stop-color", "#0694a2")
    .attr("stop-opacity", 1);

  gradient
    .append("stop")
    .attr("class", "end")
    .attr("offset", "80%")
    .attr("stop-color", "#161e2e10")
    .attr("stop-opacity", 1);

  return defs;
};

export const appendTooltip = (svg: ChartSvg) => {
  let tooltip = svg.select<SVGGElement>(".cursor-tooltip");
  let point = svg.select<SVGCircleElement>(".cursor-point");
  let cursorLine = svg.select<SVGLineElement>(".cursor-line");

  if (tooltip.empty()) {
    cursorLine = svg
      .append("line")
      .style("display", "none")
      .attr("class", "cursor-line")
      .attr("stroke", "black");
    point = svg
      .append("circle")
      .style("display", "none")
      .attr("class", "cursor-point")
      .attr("r", 3);
    tooltip = svg.append("g").attr("class", "cursor-tooltip");
  }

  return { cursorLine, point, tooltip };
};
