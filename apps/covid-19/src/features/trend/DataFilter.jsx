import { feature } from "@repo/tailwind-compat/media.stylex";
import { boxShadow } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  defaults,
  easings,
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

const styles = stylex.create({
  group: {
    position: "relative",
    zIndex: 0,
    display: "inline-flex",
    borderRadius: radii.md,
    boxShadow: boxShadow.sm,
  },
  control: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.gray400,
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    fontWeight: fontWeights.medium,
    transitionProperty: transitionProperty.default,
    transitionTimingFunction: easings.inOut,
    transitionDuration: defaults.transitionDuration,
    outlineStyle: { default: null, ":focus": "none" },
    backgroundColor: {
      default: null,
      [feature.hover]: { default: null, ":hover": colors.gray800 },
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
