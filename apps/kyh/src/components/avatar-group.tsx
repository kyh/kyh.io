"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { EggCatcher, EggProgress, useEggsAwake } from "@/easter-eggs/provider";
import { gradientOf, ownColor, subscribeToOwnColor } from "@/lib/color";
import { useRoster } from "./multiplayer/provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export const AvatarGroup = () => {
  const pathname = usePathname();
  // None on the server: a color picked per page load would mismatch SSR.
  const color = useSyncExternalStore(subscribeToOwnColor, ownColor, () => null);
  const awake = useEggsAwake();
  const players = useRoster().toSorted(
    (a, b) => Number(b.pathname === pathname) - Number(a.pathname === pathname),
  );
  const onlyMe = players.length < 1;

  return (
    <ul className="mr-2 flex transition-opacity duration-[230ms] ease-out">
      <AnimatePresence mode="popLayout">
        <motion.li
          className="relative -mr-2 rounded-full shadow-md"
          data-hat-perch="me"
          style={{ zIndex: players.length }}
          initial={{ opacity: 0, scale: 0.8 }}
          // Alone it fades back, unless it's catching easter eggs or gone gold.
          animate={{ opacity: onlyMe && !awake ? 0.2 : 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          layout
        >
          <Tooltip placement="bottom-end">
            <TooltipTrigger
              className="flex h-7 w-7"
              aria-label={onlyMe ? "You're the only one here" : "You"}
            >
              <EggCatcher>
                <span
                  className="size-full rounded-full"
                  style={{ background: color ? gradientOf(color) : undefined }}
                  aria-hidden="true"
                />
              </EggCatcher>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-0.5 text-xs">
              {onlyMe ? "You're the only one here 🥺" : "You"}
              <EggProgress />
            </TooltipContent>
          </Tooltip>
        </motion.li>
        {players.map((player, index) => {
          const anotherPage = player.pathname !== pathname;

          let label = "Visitor";
          if (anotherPage) {
            label += " (on another page)";
          }

          return (
            <motion.li
              key={player.id}
              className="-mr-2 rounded-full shadow-md"
              style={{
                background: gradientOf(player),
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
