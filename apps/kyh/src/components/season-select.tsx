"use client";

import { Select } from "@base-ui/react/select";
import { GeistMono } from "geist/font/mono";

import { dateOf } from "@/seasons/calendar";
import { PieceIcon } from "@/seasons/piece";
import type { Season, SeasonId } from "@/seasons/seasons";
import { SEASONS, seasonOf, windowIn } from "@/seasons/seasons";
import { chooseSeason, useSeason } from "@/seasons/store";

const DAYS = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** When a season runs this year, "Oct 25 – 31", "Dec 30 – Jan 2"; nothing for the default, which runs when none does. */
const daysOf = (season: Season) => {
  const days = windowIn(season, new Date().getFullYear());
  if (days === null) {
    return null;
  }
  const from = dateOf(days[0]);
  const to = dateOf(days[1]);
  // Across New Year, formatRange would add both years.
  return from.getFullYear() === to.getFullYear()
    ? DAYS.formatRange(from, to)
    : `${DAYS.format(from)} – ${DAYS.format(to)}`;
};

interface SeasonSelectProps {
  /** Heard as the list opens and closes, so the dial can leave Escape and outside presses to it. */
  onOpenChange: (open: boolean) => void;
}

/** The theme dial's season picker: the season in play, opening a list of them all. */
export const SeasonSelect = ({ onOpenChange }: SeasonSelectProps) => (
  <Select.Root<SeasonId>
    value={useSeason()}
    onValueChange={(id) => {
      if (id !== null) {
        chooseSeason(id);
      }
    }}
    onOpenChange={onOpenChange}
  >
    <Select.Trigger className="dial-select dock-item" aria-label="Theme">
      <span className="dial-select-label">Theme</span>
      <Select.Value className="dial-select-value">
        {(id: SeasonId) => {
          const season = seasonOf(id);
          return (
            <>
              <PieceIcon art={season.art} className="size-4 shrink-0" />
              <span className="dial-select-name">{season.name}</span>
            </>
          );
        }}
      </Select.Value>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner
        side="top"
        sideOffset={12}
        alignItemWithTrigger={false}
        className="z-20 outline-none"
      >
        <Select.Popup className="dial-select-popup">
          <Select.List className="dial-select-list">
            {SEASONS.map((season) => (
              <Select.Item key={season.id} value={season.id} className="dial-select-item">
                <PieceIcon art={season.art} className="size-5" />
                <Select.ItemText>{season.name}</Select.ItemText>
                <span className={`dial-select-days ${GeistMono.className}`}>{daysOf(season)}</span>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
