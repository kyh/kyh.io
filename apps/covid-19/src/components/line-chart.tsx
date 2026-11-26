import { useEffect, useRef } from "react";
import { pointer, select } from "d3";
import { format } from "date-fns";
import {
  appendDefs,
  appendSvg,
  appendTooltip,
  createAxis,
  createLineFn,
  createScales,
  createTooltipEvents,
} from "utils/chart-utils";
import type { ChartSvg, Margin } from "utils/chart-utils";
import type { CountKey, Day } from "utils/daily";
import { formatNumber } from "utils/formatter";

import "./line-chart.css";

const margin = {
  bottom: 20,
  left: 50,
  right: 30,
  top: 10,
} satisfies Margin;

const TRANSITION_MS = 1500;

const sizeOf = (length: number) => (length > 0 ? length : 300);

const drawChart = (containerElement: HTMLElement, data: readonly Day[], dataKey: CountKey) => {
  const width = sizeOf(containerElement.offsetWidth);
  const height = sizeOf(containerElement.offsetHeight);
  const { x, y } = createScales(data, dataKey, width, height, margin);
  const { xAxis, yAxis } = createAxis(width, x, y);
  const { line, area } = createLineFn(dataKey, x, y);
  let svg: ChartSvg = select(containerElement).select<SVGSVGElement>(".chart");

  if (svg.empty()) {
    svg = appendSvg(containerElement, width, height);
    appendDefs(svg);
  }

  const xAxisSvg = svg.selectAll<SVGGElement, unknown>(".x-axis");

  if (xAxisSvg.empty()) {
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "x-axis")
      .call(xAxis);
  } else {
    xAxisSvg.transition().duration(TRANSITION_MS).call(xAxis);
  }

  const yAxisSvg = svg.selectAll<SVGGElement, unknown>(".y-axis");

  if (yAxisSvg.empty()) {
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", "y-axis")
      .call(yAxis)
      .call((g) => {
        g.select(".domain").remove();
      });
  } else {
    yAxisSvg
      .transition()
      .duration(TRANSITION_MS)
      .call(yAxis)
      .call((g) => {
        g.select(".domain").remove();
      });
  }

  svg
    .selectAll<SVGPathElement, readonly Day[]>(".growth-background")
    .data([data])
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "growth-background")
        .attr("fill", "url(#svgGradient)")
        .attr("d", (series) => area(series)),
    )
    .transition()
    .duration(TRANSITION_MS)
    .attr("d", (series) => area(series));

  svg
    .selectAll<SVGPathElement, readonly Day[]>(".growth-line")
    .data([data])
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "growth-line")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", (series) => line(series)),
    )
    .transition()
    .duration(TRANSITION_MS)
    .attr("d", (series) => line(series));

  const { onMouseEvent, callout } = createTooltipEvents(data, x);
  const { tooltip, point, cursorLine } = appendTooltip(svg);

  svg.on("touchmove mousemove", (event: MouseEvent | TouchEvent) => {
    const [mx] = pointer(event);
    const day = onMouseEvent(mx);
    const value = day?.[dataKey];

    if (day === undefined || value === undefined || value === 0) {
      return;
    }

    tooltip
      .attr("transform", `translate(${x(day.date)},0)`)
      .call(callout, `${format(day.date, "MM/dd")} - ${formatNumber(value)}`);
    cursorLine
      .style("display", null)
      .attr("y1", 0)
      .attr("x1", x(day.date))
      .attr("y2", height - margin.bottom)
      .attr("x2", x(day.date));
    point.style("display", null).attr("cx", x(day.date)).attr("cy", y(value));
  });

  svg.on("touchend mouseleave", () => {
    tooltip.style("display", "none");
    point.style("display", "none");
    cursorLine.style("display", "none");
  });

  return () => {
    svg.interrupt();
    svg.selectAll("*").interrupt();
    svg.on("touchmove mousemove", null);
    svg.on("touchend mouseleave", null);
  };
};

const EMPTY_DATA: readonly Day[] = [];

interface LineChartProps {
  data?: readonly Day[];
  dataKey?: CountKey;
}

export const LineChart = ({ data = EMPTY_DATA, dataKey = "positive" }: LineChartProps) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerElement = container.current;

    return containerElement === null || data.length === 0
      ? undefined
      : drawChart(containerElement, data, dataKey);
  }, [data, dataKey]);

  return <div className="h-full" ref={container} />;
};
