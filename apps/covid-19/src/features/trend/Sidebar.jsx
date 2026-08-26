import * as stylex from "@stylexjs/stylex";
import {
  defaults,
  easings,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  mediaQueries,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import { Loader } from "components/Loader";
import { Progress } from "components/Progress";
import { formatNumber } from "utils/formatter";
import { stateAbbrevToFullname } from "utils/map-utils";

import { colors } from "../../styles/tokens.stylex";

const TRANSITION_ALL =
  "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events";

const styles = stylex.create({
  aside: {
    marginRight: spacing[10],
    display: { default: "none", [mediaQueries.sm]: "block" },
    width: spacing[64],
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.gray700,
    // was `.sidebar` in TrendPage.css
    height: { default: null, [mediaQueries.sm]: "var(--trend-page-height)" },
    overflow: { default: null, [mediaQueries.sm]: "auto" },
  },
  list: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: colors.gray700 },
  /** was `divide-y divide-gray-700`, a child combinator StyleX cannot express */
  divider: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: colors.gray700,
  },
  item: {
    width: "100%",
    padding: spacing[4],
    textAlign: "left",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    transitionProperty: TRANSITION_ALL,
    transitionTimingFunction: easings.inOut,
    transitionDuration: defaults.transitionDuration,
    outlineStyle: { default: null, ":focus": "none" },
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray800 },
    },
  },
  itemSelected: { backgroundColor: colors.gray800 },
  itemRow: { marginBottom: spacing[2], display: "flex", justifyContent: "space-between" },
  mobile: {
    marginBottom: spacing[4],
    paddingInline: spacing[4],
    display: { default: null, [mediaQueries.sm]: "none" },
  },
  mobileSelect: {
    width: "100%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.gray400,
    backgroundColor: {
      default: colors.gray900,
      "@media (hover: hover)": { default: colors.gray900, ":hover": colors.gray800 },
    },
    paddingInline: spacing[4],
    paddingBlock: spacing[2],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    fontWeight: fontWeights.medium,
    transitionProperty: TRANSITION_ALL,
    transitionTimingFunction: easings.inOut,
    transitionDuration: defaults.transitionDuration,
    outlineStyle: { default: null, ":focus": "none" },
  },
});

export const Sidebar = ({
  states,
  isLoading,
  selectedState,
  onSelectState,
  statesDailyData,
  usDailyData,
}) => {
  const lastUSDay = usDailyData[usDailyData.length - 1];
  return (
    <>
      <section {...stylex.props(styles.aside)}>
        {isLoading ? (
          <Loader width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="70" />
            <rect x="0" y="71" width="100%" height="70" />
            <rect x="0" y="142" width="100%" height="70" />
            <rect x="0" y="213" width="100%" height="70" />
            <rect x="0" y="284" width="100%" height="70" />
            <rect x="0" y="355" width="100%" height="70" />
            <rect x="0" y="426" width="100%" height="70" />
            <rect x="0" y="497" width="100%" height="70" />
          </Loader>
        ) : (
          <ul {...stylex.props(styles.list)}>
            {states.map((state, i) => {
              const data = statesDailyData[state];
              const lastDay = data[data.length - 1];
              return (
                <li key={state} {...stylex.props(i < states.length - 1 && styles.divider)}>
                  <button
                    {...stylex.props(styles.item, selectedState === state && styles.itemSelected)}
                    type="button"
                    onClick={() => onSelectState(state)}
                  >
                    <div {...stylex.props(styles.itemRow)}>
                      <span>{stateAbbrevToFullname[state]}</span>
                      <span>{formatNumber(lastDay.positive)}</span>
                    </div>
                    <Progress
                      value={lastDay ? lastDay.positive : 0}
                      total={lastUSDay ? lastUSDay.positive : 0}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section {...stylex.props(styles.mobile)}>
        {isLoading ? (
          <Loader width="100%" height="36">
            <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
          </Loader>
        ) : (
          <select
            {...stylex.props(styles.mobileSelect)}
            value={selectedState}
            onChange={(event) => onSelectState(event.target.value)}
          >
            <option value={undefined}>United States</option>
            <optgroup label="States">
              {states.map((state) => (
                <option value={state} key={state}>
                  {stateAbbrevToFullname[state]}
                </option>
              ))}
            </optgroup>
          </select>
        )}
      </section>
    </>
  );
};
