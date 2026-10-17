"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { DialSlider } from "@/components/dial-slider";
import { SLATE_HUE, themeOf } from "@/lib/dial";
import { dialState, setHue, setLight, subscribeDial, UNMOVED } from "@/lib/dial-state";

/** Brightness (0 dark … 100 light) and hue, each null until moved; they last until reload. */
const useThemeDial = () => useSyncExternalStore(subscribeDial, dialState, () => UNMOVED);

interface ThemeDialProps {
  onClose: () => void;
}

/** The sliders the toggle turns into; Escape or a press anywhere else turns them back. */
export const ThemeDial = ({ onClose }: ThemeDialProps) => {
  const { light, hue } = useThemeDial();
  const { resolvedTheme, setTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
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
        <DialSlider
          label="Hue"
          min={0}
          max={360}
          step={1}
          value={hue ?? SLATE_HUE}
          spectrum
          format={{ style: "unit", unit: "degree", unitDisplay: "narrow" }}
          onChange={setHue}
        />
      </div>
    </div>
  );
};
