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

const stretchAt = (clientX: number, { left, right }: DOMRect) => {
  if (clientX < left) {
    return rubberStretch(left - clientX, -1);
  }
  if (clientX > right) {
    return rubberStretch(clientX - right, 1);
  }
  return 0;
};

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
  const press = useRef<{ x: number; y: number; rect: DOMRect; click: boolean } | null>(null);
  const emitted = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
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

  // Follow changes made elsewhere (a reset, a reload); our own already moved the fill.
  useEffect(() => {
    if (emitted.current !== value) {
      fill.jump(percentOf(value, { max, min, step }));
    }
    emitted.current = null;
  }, [fill, value, max, min, step]);

  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus({ preventScroll: true });
    }
  }, [focusOnMount]);

  const emit = (next: number) => {
    emitted.current = next;
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
  const active = hovered || pressed;
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
          click: true,
          rect: event.currentTarget.getBoundingClientRect(),
          x: event.clientX,
          y: event.clientY,
        };
        setPressed(true);
      }}
      onPointerMove={(event) => {
        const down = press.current;
        if (!down) {
          return;
        }
        if (
          down.click &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_THRESHOLD
        ) {
          down.click = false;
          setDragging(true);
        }
        if (down.click) {
          return;
        }
        stretch.jump(stretchAt(event.clientX, down.rect));
        const next = valueAt(fractionAt(event.clientX, down.rect), range);
        fill.jump(percentOf(next, range));
        emit(roundToStep(next, range));
      }}
      onPointerUp={(event) => {
        const down = press.current;
        if (down?.click) {
          const next = roundToStep(
            snapToDecile(valueAt(fractionAt(event.clientX, down.rect), range), range),
            range,
          );
          fill.set(percentOf(next, range));
          emit(next);
        }
        stretch.set(0);
        press.current = null;
        setPressed(false);
        setDragging(false);
      }}
      onPointerCancel={() => {
        stretch.jump(0);
        press.current = null;
        setPressed(false);
        setDragging(false);
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
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          fill.jump(percentOf(next, range));
          emit(next);
        }}
      />
      {hashMarks.map((left) => (
        <div key={left} className="dial-slider-hashmark" style={{ left: `${left}%` }} />
      ))}
      <motion.div className="dial-slider-fill" style={{ width: fillWidth }} />
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
      <span ref={labelRef} className="dial-slider-label max-[440px]:hidden">
        {label}
      </span>
      <span ref={valueRef} className={`dial-slider-value ${GeistMono.className}`}>
        {format(value)}
      </span>
    </motion.div>
  );
};
