"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import type { PlayerMap } from "@/lib/player";
import { GOLD, ownColor } from "@/lib/color";
import { useIsHydrated } from "@/lib/use-hydrated";
import { useEasterEggs } from "./easter-eggs";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface AvatarGroupProps {
  others: PlayerMap;
}

export const AvatarGroup = ({ others }: AvatarGroupProps) => {
  const pathname = usePathname();
  // Held back until hydration: a color picked per page load would mismatch SSR.
  const hydrated = useIsHydrated();
  const { catching, complete, found, total } = useEasterEggs();
  let color = null;
  if (hydrated) {
    color = complete ? GOLD : ownColor();
  }
  const players = Object.entries(others).toSorted(([, p]) =>
    p.state.pathname === pathname ? -1 : 1,
  );
  const onlyMe = players.length < 1;

  return (
    <ul className="mr-2 flex transition-opacity duration-[230ms] ease-out">
      <AnimatePresence mode="popLayout">
        <motion.li
          className="-mr-2 rounded-full shadow-md"
          style={{ zIndex: players.length }}
          initial={{ opacity: 0, scale: 0.8 }}
          // Alone it fades back, unless it's catching eggs or gone gold.
          animate={{ opacity: onlyMe && !catching && !complete ? 0.2 : 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          layout
        >
          <Tooltip placement="bottom-end">
            <TooltipTrigger
              className="flex h-7 w-7 items-center justify-center text-xs text-[#111]"
              aria-label={onlyMe ? "You're the only one here" : "You"}
            >
              {/* Its own element, so the eggs can pop it without fighting the list's animation. */}
              <span
                data-own-avatar
                className="flex size-full items-center justify-center rounded-full"
                style={{
                  background: color ? `linear-gradient(${color.hue}, ${color.color})` : undefined,
                  // A gold halo once every easter egg is found.
                  boxShadow: complete
                    ? `0 0 0 2px var(--bg-color), 0 0 0 3.5px ${GOLD.color}, 0 0 12px ${GOLD.hue}`
                    : undefined,
                }}
                aria-hidden="true"
              >
                {complete ? "✦" : null}
              </span>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-0.5 text-xs">
              {onlyMe ? "You're the only one here 🥺" : "You"}
              {found.length > 0 && hydrated && (
                <span className="block text-[var(--body-color-faded)]">
                  {complete ? "Every easter egg found" : `${found.length}/${total} easter eggs`}
                </span>
              )}
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
              className="-mr-2 rounded-full shadow-md"
              style={{
                background: `linear-gradient(${player.hue}, ${player.color})`,
                zIndex: players.length - index,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: anotherPage ? 0.2 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              layout
            >
              <Tooltip placement="bottom-end">
                <TooltipTrigger className="flex h-7 w-7" aria-label={label}>
                  <span aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent className="px-2 py-0.5 text-xs">{label}</TooltipContent>
              </Tooltip>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
