"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { DialSlider } from "@/components/dial-slider";
import { SLATE_HUE, themeOf } from "@/lib/dial";

// Sets a custom property on <html>, or clears it for null.
const setRootVar = (name: string, value: string | null) => {
  const { style } = document.documentElement;
  if (value === null) {
    style.removeProperty(name);
  } else {
    style.setProperty(name, value);
  }
};

/** Brightness (0 dark … 100 light) and hue, each null until moved; they last until reload. */
export const useThemeDial = () => {
  const [light, setLight] = useState<number | null>(null);
  const [hue, setHue] = useState<number | null>(null);

  useEffect(() => setRootVar("--light", light === null ? null : `${light}%`), [light]);
  useEffect(() => {
    setRootVar("--hue", hue === null ? null : String(hue));
    document.documentElement.toggleAttribute("data-hue", hue !== null);
  }, [hue]);

  return { hue, light, setHue, setLight };
};

interface ThemeDialProps extends ReturnType<typeof useThemeDial> {
  onClose: () => void;
}

/** The sliders the toggle turns into; Escape or a press anywhere else turns them back. */
export const ThemeDial = ({ light, hue, setLight, setHue, onClose }: ThemeDialProps) => {
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
