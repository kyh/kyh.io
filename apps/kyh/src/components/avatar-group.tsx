"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import type { PlayerMap } from "@/lib/player";
import { getRandomColor } from "@/lib/color";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type AvatarGroupProps = {
  others: PlayerMap;
};

const color = getRandomColor();

export const AvatarGroup = ({ others }: AvatarGroupProps) => {
  const pathname = usePathname();
  const players = Object.entries(others).sort(([, p]) =>
    p.position?.pathname === pathname ? -1 : 1,
  );
  const onlyMe = players.length < 1;

  return (
    <ul className="mr-2 flex transition-opacity duration-[230ms] ease-out">
      <AnimatePresence mode="popLayout">
        <motion.li
          className="-mr-2 rounded-full shadow-md"
          style={{
            zIndex: players.length,
            background: `linear-gradient(${color?.hue}, ${color?.color})`,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: onlyMe ? 0.2 : 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ ease: "easeOut", duration: 0.2 }}
          layout
        >
          <Tooltip placement="bottom-end">
            <TooltipTrigger
              className="flex h-7 w-7"
              aria-label={onlyMe ? "You're the only one here" : "You"}
            >
              <span aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className="px-2 py-0.5 text-xs">
              {onlyMe ? "You're the only one here 🥺" : "You"}
            </TooltipContent>
          </Tooltip>
        </motion.li>
        {players.map(([id, player], index) => {
          const anotherPage =
            player.position?.pathname && player.position.pathname !== pathname;

          let label = "Visitor";
          if (anotherPage) {
            label += " (on another page)";
          }

          return (
            <motion.li
              key={id}
              className="-mr-2 rounded-full shadow-md"
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
                <TooltipTrigger className="flex h-7 w-7" aria-label={label}>
                  <span aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent className="px-2 py-0.5 text-xs">
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
