import { leading } from "@repo/tailwind-compat/leading.stylex";
import * as stylex from "@stylexjs/stylex";
import { fontSizes, fontWeights, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { Card } from "components/Card";
import { Loader } from "components/Loader";

import { colors, fontSizes as localFontSizes } from "../styles/tokens.stylex";

const styles = stylex.create({
  point: {
    marginRight: spacing[2],
    display: "flex",
    height: spacing[4],
    width: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
  },
  dot: {
    height: spacing[2],
    width: spacing[2],
    borderRadius: radii.full,
  },
  label: {
    fontSize: localFontSizes["2xs"],
    fontWeight: fontWeights.medium,
    color: colors.gray400,
  },
  uppercase: { textTransform: "uppercase" },
  header: { display: "flex", alignItems: "center" },
  body: { display: "flex", alignItems: "baseline", paddingLeft: spacing[6] },
  value: {
    marginRight: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.gray100,
  },
  suffix: { fontSize: localFontSizes["2xs"], color: colors.gray400 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  rowValue: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.gray100,
  },
});

/** Replaces the pointClassname/pointShadeClassname pair the Tailwind version
 * drilled through as class strings. */
const dotTone = stylex.create({
  gray: { backgroundColor: colors.gray500 },
  teal: { backgroundColor: colors.teal500 },
  green: { backgroundColor: colors.green500 },
  yellow: { backgroundColor: colors.yellow500 },
  purple: { backgroundColor: colors.purple500 },
  pink: { backgroundColor: colors.pink500 },
});

const shadeTone = stylex.create({
  gray: { backgroundColor: colors.gray800 },
  teal: { backgroundColor: colors.teal800 },
  green: { backgroundColor: colors.green800 },
  yellow: { backgroundColor: colors.yellow800 },
  purple: { backgroundColor: colors.purple800 },
  pink: { backgroundColor: colors.pink800 },
});

const Point = ({ label = "", tone }) => {
  return (
    <span aria-label={label} {...stylex.props(styles.point, tone && shadeTone[tone])}>
      <span {...stylex.props(styles.dot, tone && dotTone[tone])} />
    </span>
  );
};

export const CardLabel = ({ label, lowercase }) => (
  <span {...stylex.props(styles.label, !lowercase && styles.uppercase)}>{label}</span>
);

export const StatCard = ({ tone, label, value, suffix, style, isLoading }) => {
  return (
    <Card style={style}>
      <div {...stylex.props(styles.header)}>
        <Point label={label} tone={tone} />
        <CardLabel label={label} />
      </div>
      <div {...stylex.props(styles.body)}>
        {isLoading ? (
          <Loader width="100%" height="21">
            <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
          </Loader>
        ) : (
          <>
            <span {...stylex.props(styles.value)}>{value}</span>
            {!!suffix && <span {...stylex.props(styles.suffix)}>{suffix}</span>}
          </>
        )}
      </div>
    </Card>
  );
};

export const StatRow = ({ style, label, value, lowercase, isLoading }) => (
  <div {...stylex.props(styles.row, style)}>
    <CardLabel label={label} lowercase={lowercase} />
    {isLoading ? (
      <Loader width="20%" height="21">
        <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
      </Loader>
    ) : (
      <span {...stylex.props(styles.rowValue)}>{value}</span>
    )}
  </div>
);
