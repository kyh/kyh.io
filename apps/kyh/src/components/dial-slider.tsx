"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@base-ui/react/slider";
import { GeistMono } from "geist/font/mono";
import { motion, useSpring, useTransform } from "motion/react";

import { percentOf, roundToStep, rubberStretch, snapToDecile } from "@/lib/dial-slider";
import type { Range } from "@/lib/dial-slider";

// After DialKit's slider (github.com/joshpuckett/dialkit, MIT), on Base UI's,
// which does the dragging, keys and labelling. The label and value sit in the
// track, the fill is the value, and a handle bar shows on hover (all in
// global.css). On top: a press on the track lands on a tenth when it's close,
// and the track gives a little when dragged past either end.

const HANDLE_BUFFER = 8;
const LABEL_LEFT = 10;
const VALUE_RIGHT = 12;
const hashMarks = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);

// How far the pointer is past either end of the track, signed.
const overshootOf = (clientX: number, { left, right }: DOMRect) =>
  Math.min(0, clientX - left) + Math.max(0, clientX - right);

interface DialSliderProps extends Range {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format?: Intl.NumberFormatOptions;
  focusOnMount?: boolean;
}

export const DialSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  focusOnMount = false,
}: DialSliderProps) => {
  const range = { max, min, step };
  const input = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLOutputElement>(null);
  // Where along the track (0–100) the handle would cross the label or the value.
  const [dodgeAt, setDodgeAt] = useState({ left: 30, right: 78 });
  const stretch = useSpring(0, { damping: 40, stiffness: 500 });
  const width = useTransform(stretch, (px) => `calc(100% + ${Math.abs(px)}px)`);
  const x = useTransform(stretch, (px) => Math.min(px, 0));

  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus({ preventScroll: true });
    }
  }, [focusOnMount]);

  const measure = (track: HTMLElement) => {
    const trackWidth = track.offsetWidth;
    if (trackWidth && labelRef.current && valueRef.current) {
      setDodgeAt({
        left: ((LABEL_LEFT + labelRef.current.offsetWidth + HANDLE_BUFFER) / trackWidth) * 100,
        right:
          ((trackWidth - VALUE_RIGHT - valueRef.current.offsetWidth - HANDLE_BUFFER) / trackWidth) *
          100,
      });
    }
  };

  // While held, the track stretches toward a pointer dragged past either end.
  const holdStretch = (rect: DOMRect) => {
    const move = (event: PointerEvent) =>
      stretch.jump(rubberStretch(overshootOf(event.clientX, rect)));
    const release = () => {
      stretch.set(0);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };

  const percent = percentOf(value, range);
  // SAFETY: CSS custom properties are valid inline styles, but
  // React.CSSProperties has no index signature for `--*` keys; the object
  // holds nothing else.
  const percentStyle = { "--dial-percent": percent } as React.CSSProperties;

  return (
    <motion.div style={{ width, x }}>
      <Slider.Root
        value={value}
        min={min}
        max={max}
        step={step}
        format={format}
        onValueChange={(next, { reason }) =>
          onChange(reason === "track-press" ? roundToStep(snapToDecile(next, range), range) : next)
        }
        data-dodge={percent < dodgeAt.left || percent > dodgeAt.right || undefined}
        className="dial-slider dock-item"
        style={percentStyle}
        onPointerEnter={(event) => measure(event.currentTarget)}
        onPointerDown={(event) => holdStretch(event.currentTarget.getBoundingClientRect())}
      >
        <Slider.Control className="absolute inset-0">
          <Slider.Track className="dial-slider-track">
            {hashMarks.map((left) => (
              <div key={left} className="dial-slider-hashmark" style={{ left: `${left}%` }} />
            ))}
            <Slider.Indicator className="dial-slider-fill" />
            <Slider.Thumb className="dial-slider-thumb" inputRef={input}>
              <span className="dial-slider-handle" />
            </Slider.Thumb>
          </Slider.Track>
          <Slider.Label ref={labelRef} className="dial-slider-label">
            {label}
          </Slider.Label>
          <Slider.Value ref={valueRef} className={`dial-slider-value ${GeistMono.className}`} />
        </Slider.Control>
      </Slider.Root>
    </motion.div>
  );
};
