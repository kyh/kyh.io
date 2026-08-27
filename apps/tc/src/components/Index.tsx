import { leading } from "@repo/tailwind-compat/leading.stylex";
import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import { ParentSize } from "@visx/responsive";
import * as stylex from "@stylexjs/stylex";
import {
  colors,
  containers,
  defaults,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { NumericFormat } from "react-number-format";

import Chart from "@/components/Chart";
import { CompForm } from "@/components/CompForm";
import { CompTable } from "@/components/CompTable";
import { Navigation } from "@/components/Navigation";
import { useCompHooks } from "@/lib/comp";
import { currencyTextFormatProps } from "@/lib/formProps";

const styles = stylex.create({
  main: {
    position: "relative",
    marginInline: "auto",
    marginBottom: spacing[20],
    maxWidth: containers["7xl"],
    display: { default: null, [mediaUp.md]: "grid" },
    gridTemplateColumns: { default: null, [mediaUp.md]: "repeat(5, minmax(0, 1fr))" },
  },
  formCol: {
    marginLeft: `calc(-1 * ${spacing[5]})`,
    paddingInline: spacing[8],
    gridColumn: { default: null, [mediaUp.md]: "span 2 / span 2" },
  },
  title: {
    fontSize: fontSizes["2xl"],
    lineHeight: leading["2xl"],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: { marginTop: spacing[3], color: colors.slate300 },
  formWrap: { marginTop: spacing[10] },
  chartCol: {
    position: "sticky",
    top: spacing[5],
    overflowX: "hidden",
    overflowY: "auto",
    paddingBlock: { default: spacing[10], [mediaUp.md]: 0 },
    transitionProperty: transitionProperty.opacity,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
    gridColumn: { default: null, [mediaUp.md]: "span 3 / span 3" },
    height: { default: null, [mediaUp.md]: "100vh" },
    paddingInline: { default: null, [mediaUp.md]: spacing[20] },
  },
  active: { opacity: 1 },
  inactive: { pointerEvents: "none", opacity: "30%" },
  eyebrow: {
    paddingInline: { default: spacing[3], [mediaUp.md]: 0 },
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate400,
  },
  totalRow: {
    marginTop: spacing[1],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: { default: spacing[3], [mediaUp.md]: 0 },
  },
  total: {
    fontSize: fontSizes["3xl"],
    lineHeight: leading["3xl"],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
  },
  perYear: {
    marginLeft: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    color: colors.slate400,
  },
  chartSize: { marginTop: spacing[10] },
  tableWrap: {
    position: "relative",
    marginTop: `calc(-1 * ${spacing[8]})`,
    width: "100%",
    overflowX: "auto",
  },
  badge: { position: "fixed", right: spacing[5], bottom: spacing[5] },
});

export default function Index() {
  const comp = useCompHooks();
  const totalTc = comp.data.reduce<number>(
    (acc, curr) => acc + curr.base + curr.bonus + curr.stock,
    0,
  );
  const avgTc = totalTc / comp.data.length;

  return (
    <>
      <Navigation />
      <main {...stylex.props(styles.main)}>
        <section {...stylex.props(styles.formCol)}>
          <div className="title-section">
            <h1 {...stylex.props(styles.title)}>A layman's Total Compensation Calculator</h1>
            <p {...stylex.props(styles.subtitle)}>
              Understand your total compensation under current market conditions.
            </p>
          </div>
          <div {...stylex.props(styles.formWrap)}>
            <CompForm comp={comp} />
          </div>
        </section>
        <section {...stylex.props(styles.chartCol, avgTc ? styles.active : styles.inactive)}>
          <p {...stylex.props(styles.eyebrow)}>Estimated Total Compensation</p>
          <div {...stylex.props(styles.totalRow)}>
            <div>
              <NumericFormat
                {...stylex.props(styles.total)}
                value={avgTc}
                {...currencyTextFormatProps}
              />
              {!!avgTc && <span {...stylex.props(styles.perYear)}>(per year)</span>}
            </div>
          </div>
          <ParentSize
            className={stylex.props(styles.chartSize).className}
            parentSizeStyles={{ height: "auto", width: "100%" }}
          >
            {({ width }) => <Chart width={width} height={400} data={comp.data} />}
          </ParentSize>
          <div {...stylex.props(styles.tableWrap)}>
            <CompTable data={comp.data} />
          </div>
        </section>
      </main>
      <a
        {...stylex.props(styles.badge)}
        href="https://www.producthunt.com/posts/total-compensation-calculator?utm_source=badge-featured&utm_medium=badge&utm_source=badge-total&#0045;compensation&#0045;calculator"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=347810&theme=dark"
          alt="Total Compensation Calculator - Your total compensation under current market conditions | Product Hunt"
          width={250}
          height={54}
        />
      </a>
    </>
  );
}
