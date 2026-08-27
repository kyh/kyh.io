"use client";

import { boxShadow } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import { easings, fontSizes, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import type { PlayerMap } from "@/lib/player";
import { getRandomColor } from "@/lib/color";
import { useIsHydrated } from "@/lib/use-hydrated";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const styles = stylex.create({
  list: {
    marginRight: spacing[2],
    display: "flex",
    transitionProperty: transitionProperty.opacity,
    transitionTimingFunction: easings.out,
    transitionDuration: "230ms",
  },
  item: {
    marginRight: `calc(-1 * ${spacing[2]})`,
    borderRadius: radii.full,
    boxShadow: boxShadow.md,
  },
  trigger: { display: "flex", height: spacing[7], width: spacing[7] },
  tooltip: {
    paddingInline: spacing[2],
    paddingBlock: spacing[0.5],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
  },
});

type AvatarGroupProps = {
  others: PlayerMap;
};

export const AvatarGroup = ({ others }: AvatarGroupProps) => {
  const pathname = usePathname();
  // Held back until hydration — a session-random color would mismatch SSR.
  const [randomColor] = useState(getRandomColor);
  const color = useIsHydrated() ? randomColor : null;
  const players = Object.entries(others).toSorted(([, p]) =>
    p.state.pathname === pathname ? -1 : 1,
  );
  const onlyMe = players.length < 1;

  return (
    <ul {...stylex.props(styles.list)}>
      <AnimatePresence mode="popLayout">
        <motion.li
          {...stylex.props(styles.item)}
          style={{
            zIndex: players.length,
            background: color ? `linear-gradient(${color.hue}, ${color.color})` : undefined,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: onlyMe ? 0.2 : 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ ease: "easeOut", duration: 0.2 }}
          layout
        >
          <Tooltip placement="bottom-end">
            <TooltipTrigger
              className={stylex.props(styles.trigger).className}
              aria-label={onlyMe ? "You're the only one here" : "You"}
            >
              <span aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className={stylex.props(styles.tooltip).className}>
              {onlyMe ? "You're the only one here 🥺" : "You"}
            </TooltipContent>
          </Tooltip>
        </motion.li>
        {players.map(([id, player], index) => {
          const anotherPage = player.state.pathname && player.state.pathname !== pathname;

          let label = "Visitor";
          if (anotherPage) {
            label += " (on another page)";
          }

          return (
            <motion.li
              key={id}
              {...stylex.props(styles.item)}
              style={{
                zIndex: players.length - index,
                background: `linear-gradient(${player.hue}, ${player.color})`,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: anotherPage ? 0.2 : 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              layout
            >
              <Tooltip placement="bottom-end">
                <TooltipTrigger
                  className={stylex.props(styles.trigger).className}
                  aria-label={label}
                >
                  <span aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent className={stylex.props(styles.tooltip).className}>
                  {label}
                </TooltipContent>
              </Tooltip>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
