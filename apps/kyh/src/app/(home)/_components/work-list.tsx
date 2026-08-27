import {
  defaults,
  fontSizeLineHeights,
  fontSizes,
  letterSpacing,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import type { WorkType } from "@/lib/data";
import { workHistory } from "@/lib/data";

const styles = stylex.create({
  icon: {
    display: "flex",
    height: spacing[5],
    width: spacing[5],
    alignItems: "center",
    justifyContent: "center",
  },
  year: {
    textAlign: "right",
    fontFamily: defaults.monoFontFamily,
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    letterSpacing: letterSpacing.tight,
  },
  list: { marginInline: `calc(-1 * ${spacing[2]})`, marginTop: spacing[1] },
});

const Work = ({ work }: { work: WorkType }) => {
  return (
    <a href={work.link} target="_blank" rel="noopener noreferrer" className="list-row">
      <span {...stylex.props(styles.icon)}>
        <Image alt={`${work.company} icon`} width={20} height={20} src={work.favicon} />
      </span>
      <span>{work.role}</span>
      <span>{work.company}</span>
      <span {...stylex.props(styles.year)}>{work.year}</span>
    </a>
  );
};

export const WorkList = () => (
  <div {...stylex.props(styles.list)}>
    {workHistory.map((item) => (
      <Work key={`${item.company}-${item.year}`} work={item} />
    ))}
  </div>
);
