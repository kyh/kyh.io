"use client";

import { useEffect, useRef, useState } from "react";
import { GeistMono } from "geist/font/mono";
import { motion, useMotionTemplate, useSpring, useTransform } from "motion/react";

import { percentOf, roundToStep, rubberStretch, snapToDecile, valueAt } from "@/lib/dial-slider";
import type { Range } from "@/lib/dial-slider";

// After DialKit's slider (github.com/joshpuckett/dialkit, MIT): the label and
// value sit in the track, the fill is the value, and a handle bar shows on
// hover. A click lands (snapping to tenths), a drag follows the pointer and
// the track gives a little past either end.

const CLICK_THRESHOLD = 3;
const HANDLE_BUFFER = 8;
const LABEL_LEFT = 10;
const VALUE_RIGHT = 12;
const hashMarks = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);
const spring = { damping: 40, stiffness: 500 };

const fractionAt = (clientX: number, rect: DOMRect) => (clientX - rect.left) / rect.width;

// How far the pointer is past either end of the track, signed.
const overshootOf = (clientX: number, { left, right }: DOMRect) =>
  Math.min(0, clientX - left) + Math.max(0, clientX - right);

/** How it looks in hand: idle, pressed, or dragging. Pointer handlers decide click vs drag from the press itself. */
type Hold = "idle" | "press" | "drag";

const handleOpacityOf = ({
  active,
  dodge,
  dragging,
  marker,
}: Record<"active" | "dodge" | "dragging" | "marker", boolean>) => {
  if (!active) {
    if (!marker) {
      return 0;
    }
    return dodge ? 0.25 : 0.7;
  }
  if (dodge) {
    return 0.1;
  }
  return dragging ? 0.9 : 0.5;
};

interface DialSliderProps extends Range {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  focusOnMount?: boolean;
  /** A hue slider: the track is the color wheel and a marker, not a fill, shows the value. */
  spectrum?: boolean;
}

export const DialSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format = String,
  focusOnMount = false,
  spectrum = false,
}: DialSliderProps) => {
  const range = { max, min, step };
  const track = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const press = useRef<{ x: number; y: number; rect: DOMRect; dragging: boolean } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hold, setHold] = useState<Hold>("idle");
  const [dodgeAt, setDodgeAt] = useState({ left: 30, right: 78 });

  const fill = useSpring(percentOf(value, range), spring);
  const stretch = useSpring(0, spring);
  const fillWidth = useMotionTemplate`${fill}%`;
  // The handle rides just inside the fill's edge; a hue marker sits on its value.
  const handleLeft = useTransform(fill, (percent) =>
    spectrum
      ? `clamp(5px, calc(${percent}% - 1.5px), calc(100% - 8px))`
      : `max(5px, calc(${percent}% - 9px))`,
  );
  const trackWidth = useTransform(stretch, (px) => `calc(100% + ${Math.abs(px)}px)`);
  const trackX = useTransform(stretch, (px) => Math.min(px, 0));

  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus({ preventScroll: true });
    }
  }, [focusOnMount]);

  // The fill springs to a click and follows a drag or a key at once.
  const moveTo = (next: number, animate = false) => {
    if (animate) {
      fill.set(percentOf(next, range));
    } else {
      fill.jump(percentOf(next, range));
    }
    onChange(next);
  };

  // The handle fades back where it would cross the label or the value.
  const measure = () => {
    const width = track.current?.offsetWidth;
    if (width && labelRef.current && valueRef.current) {
      setDodgeAt({
        left: ((LABEL_LEFT + labelRef.current.offsetWidth + HANDLE_BUFFER) / width) * 100,
        right: ((width - VALUE_RIGHT - valueRef.current.offsetWidth - HANDLE_BUFFER) / width) * 100,
      });
    }
  };

  const percent = percentOf(value, range);
  const active = hovered || hold !== "idle";
  const dragging = hold === "drag";
  const dodge = percent < dodgeAt.left || percent > dodgeAt.right;

  return (
    <motion.div
      ref={track}
      data-active={active || undefined}
      data-spectrum={spectrum || undefined}
      className="dial-slider dock-item"
      style={{ width: trackWidth, x: trackX }}
      onPointerEnter={() => {
        measure();
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        input.current?.focus({ preventScroll: true });
        measure();
        press.current = {
          dragging: false,
          rect: event.currentTarget.getBoundingClientRect(),
          x: event.clientX,
          y: event.clientY,
        };
        setHold("press");
      }}
      onPointerMove={(event) => {
        const down = press.current;
        if (!down) {
          return;
        }
        if (!down.dragging) {
          if (Math.hypot(event.clientX - down.x, event.clientY - down.y) <= CLICK_THRESHOLD) {
            return;
          }
          down.dragging = true;
          setHold("drag");
        }
        stretch.jump(rubberStretch(overshootOf(event.clientX, down.rect)));
        moveTo(roundToStep(valueAt(fractionAt(event.clientX, down.rect), range), range));
      }}
      onPointerUp={(event) => {
        const down = press.current;
        if (down && !down.dragging) {
          const at = valueAt(fractionAt(event.clientX, down.rect), range);
          moveTo(roundToStep(snapToDecile(at, range), range), true);
        }
        stretch.set(0);
        press.current = null;
        setHold("idle");
      }}
      onPointerCancel={() => {
        stretch.jump(0);
        press.current = null;
        setHold("idle");
      }}
    >
      <input
        ref={input}
        type="range"
        className="sr-only"
        aria-label={label}
        aria-valuetext={format(value)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => moveTo(event.currentTarget.valueAsNumber)}
      />
      {hashMarks.map((left) => (
        <div key={left} className="dial-slider-hashmark" style={{ left: `${left}%` }} />
      ))}
      {!spectrum && <motion.div className="dial-slider-fill" style={{ width: fillWidth }} />}
      <motion.div
        className="dial-slider-handle"
        style={{ left: handleLeft, y: "-50%" }}
        initial={false}
        animate={{
          opacity: handleOpacityOf({ active, dodge, dragging, marker: spectrum }),
          scaleX: active || spectrum ? 1 : 0.25,
          scaleY: active && dodge ? 0.75 : 1,
        }}
        transition={{ damping: 22, stiffness: 400, type: "spring" }}
      />
      <span ref={labelRef} className="dial-slider-label">
        {label}
      </span>
      <span ref={valueRef} className={`dial-slider-value ${GeistMono.className}`}>
        {format(value)}
      </span>
    </motion.div>
  );
};
