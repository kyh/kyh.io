import * as stylex from "@stylexjs/stylex";
import {
  defaults,
  easings,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../../styles/tokens.stylex";

export const SELECTIONS = {
  time: "time",
  trendDay: "trendDay",
  trendWeek: "trendWeek",
  trendBiWeek: "trendBiWeek",
  trendMonth: "trendMonth",
};

const TRANSITION_ALL =
  "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events";

const styles = stylex.create({
  group: {
    position: "relative",
    zIndex: 0,
    display: "inline-flex",
    borderRadius: radii.md,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },
  control: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.gray400,
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    fontWeight: fontWeights.medium,
    transitionProperty: TRANSITION_ALL,
    transitionTimingFunction: easings.inOut,
    transitionDuration: defaults.transitionDuration,
    outlineStyle: { default: null, ":focus": "none" },
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray800 },
    },
  },
  button: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  select: {
    marginLeft: -1,
    display: "block",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  on: { backgroundColor: colors.gray800 },
  off: { backgroundColor: colors.gray900 },
});

export const DataFilter = ({ selected, onSelectFilter }) => {
  const isTime = selected === SELECTIONS.time;
  return (
    <span {...stylex.props(styles.group)}>
      <button
        type="button"
        {...stylex.props(styles.control, styles.button, isTime ? styles.on : styles.off)}
        onClick={() => onSelectFilter(SELECTIONS.time)}
      >
        Cases over time
      </button>
      <select
        {...stylex.props(styles.control, styles.select, isTime ? styles.off : styles.on)}
        value={selected}
        onChange={(event) => onSelectFilter(event.target.value)}
      >
        <option value={SELECTIONS.time} disabled>
          Trends
        </option>
        <option value={SELECTIONS.trendDay}>1 Day Trend</option>
        <option value={SELECTIONS.trendWeek}>1 Week Trend</option>
        <option value={SELECTIONS.trendBiWeek}>2 Week Trend</option>
        <option value={SELECTIONS.trendMonth}>1 Month Trend</option>
      </select>
    </span>
  );
};
