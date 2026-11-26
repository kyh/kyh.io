import { format, scaleLinear } from "d3";
import type { ScaleThreshold } from "d3";

interface ChoroLegendProps {
  color: ScaleThreshold<number, string>;
  tickSize?: number;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  tickFormat: string;
  spaceBetween?: number;
}

export const ChoroLegend = ({
  color,
  tickSize = 6,
  width = 320,
  height: heightProp,
  marginTop = 0,
  marginRight = 0,
  marginBottom: marginBottomProp,
  marginLeft = 0,
  tickFormat,
  spaceBetween = 0,
}: ChoroLegendProps) => {
  const height = heightProp ?? 44 + tickSize;
  const marginBottom = marginBottomProp ?? 16 + tickSize;
  const isHorizontal = width > height;

  const x = scaleLinear()
    .domain([-1, color.range().length - 1])
    .rangeRound([marginLeft, width - marginRight]);

  const y = scaleLinear()
    .domain([-1, color.range().length - 1])
    .rangeRound([marginTop, height - marginBottom]);

  const formatTick = format(tickFormat);

  const createRect = (d: string, i: number) => {
    const props = {
      fill: d,
      key: `rect${d}`,
    };

    if (isHorizontal) {
      return (
        <rect
          key={props.key}
          fill={props.fill}
          x={x(i - 1)}
          y={marginTop}
          width={x(i) - x(i - 1) - spaceBetween}
          height={height - marginTop - marginBottom}
        />
      );
    }

    return (
      <rect
        key={props.key}
        fill={props.fill}
        x={marginLeft + tickSize}
        y={y(i - 1)}
        width={width - marginLeft - marginRight - tickSize}
        height={y(i) - y(i - 1) - spaceBetween}
      />
    );
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <g>{color.range().map(createRect)}</g>
      {isHorizontal ? (
        <g width="100%" y={0} height="20" fontSize="11" textAnchor="middle">
          {color.domain().map((tick, i) => (
            <g className="tick" key={tick} transform={`translate(${x(i)})`}>
              <text fill="currentColor" y={height - tickSize - 2}>
                {formatTick(tick)}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <g width="100%" y={0} fontSize="11" textAnchor="middle">
          {color.domain().map((tick, i) => (
            <g className="tick" key={tick} transform={`translate(0 ${y(i)})`}>
              <text fill="currentColor">{formatTick(tick)}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};
