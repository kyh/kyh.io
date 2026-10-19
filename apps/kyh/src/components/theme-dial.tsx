"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { DialSlider } from "@/components/dial-slider";
import { SeasonSelect } from "@/components/season-select";
import { themeOf } from "@/lib/dial";
import { dialState, setLight, subscribeDial, UNMOVED } from "@/lib/dial-state";

/** Brightness (0 dark … 100 light), null until moved; it lasts until reload. */
const useThemeDial = () => useSyncExternalStore(subscribeDial, dialState, () => UNMOVED);

interface ThemeDialProps {
  onClose: () => void;
}

/** What the toggle turns into, brightness and the season; Escape or a press anywhere else turns it back. */
export const ThemeDial = ({ onClose }: ThemeDialProps) => {
  const { light } = useThemeDial();
  const { resolvedTheme, setTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  // While the season list is open, Escape and outside presses close the list,
  // not the dial: heard in the capture phase, ahead of the list closing.
  const picking = useRef(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !picking.current) {
        onClose();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (
        !picking.current &&
        !(event.target instanceof Node && root.current?.contains(event.target))
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose]);

  return (
    <div ref={root} className="flex gap-2">
      <div className="dial-slot">
        <DialSlider
          label="Brightness"
          min={0}
          max={100}
          step={1}
          value={light ?? (resolvedTheme === "light" ? 100 : 0)}
          focusOnMount
          onChange={(next) => {
            setLight(next);
            if (themeOf(next) !== resolvedTheme) {
              setTheme(themeOf(next));
            }
          }}
        />
      </div>
      <div className="dial-slot">
        <SeasonSelect
          onOpenChange={(open) => {
            picking.current = open;
          }}
        />
      </div>
    </div>
  );
};
