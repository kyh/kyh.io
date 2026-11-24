"use client";

import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { Mover } from "./fireworks";
import { PALETTE } from "@/app/showcase/_components/city/palette";
import { COLORS, createShow, glowOf, stepShow } from "./fireworks";
import { themeOf } from "./index";
import { useTheme } from "./store";

const COLOR_TOKENS = [
  "festiveRed",
  "gold",
  "accentOrange",
  "lamp",
] as const satisfies readonly (keyof typeof PALETTE)[];

const DAY = COLOR_TOKENS.map((token) => PALETTE[token].day);
const NIGHT = COLOR_TOKENS.map((token) => PALETTE[token].night);
const TRAIL = 0.07;
const MAX_DPR = 2;
const MAX_PIXELS = 4_000_000;
const FADES = 4;
const DRAWS_ITS_OWN = new Set(["/showcase"]);

const ratioFor = (width: number, height: number) =>
  Math.min(
    window.devicePixelRatio || 1,
    MAX_DPR,
    Math.sqrt(MAX_PIXELS / Math.max(1, width * height)),
  );

const trail = (context: CanvasRenderingContext2D, { vx, vy, x, y }: Mover) => {
  context.moveTo(x - vx * TRAIL, y - vy * TRAIL);
  context.lineTo(x, y);
};

const useFireworks = (canvas: React.RefObject<HTMLCanvasElement | null>, running: boolean) => {
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");

    if (!running || !element || !context) {
      return;
    }

    const show = createShow(Math.floor(Math.random() * 1_000_000));
    let width = 0;
    let height = 0;
    let ratio = 0;
    let frame = 0;
    let last = performance.now();
    let blank = true;

    const fit = () => {
      const next = ratioFor(element.clientWidth, element.clientHeight);

      if (element.clientWidth === width && element.clientHeight === height && next === ratio) {
        return;
      }

      width = element.clientWidth;
      height = element.clientHeight;
      ratio = next;
      element.setAttribute("width", `${Math.round(width * ratio)}`);
      element.setAttribute("height", `${Math.round(height * ratio)}`);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineWidth = 2.5;
      blank = true;
    };

    const draw = () => {
      if (show.rockets.length === 0 && show.sparks.length === 0) {
        if (!blank) {
          context.clearRect(0, 0, width, height);
          blank = true;
        }

        return;
      }

      blank = false;
      const colors = document.documentElement.dataset.theme === "dark" ? NIGHT : DAY;
      context.clearRect(0, 0, width, height);

      for (let color = 0; color < COLORS; color += 1) {
        context.strokeStyle = colors[color] ?? "white";
        context.globalAlpha = 0.9;
        context.beginPath();

        for (const rocket of show.rockets) {
          if (rocket.color === color) {
            trail(context, rocket);
          }
        }

        context.stroke();

        for (let fade = 0; fade < FADES; fade += 1) {
          context.globalAlpha = (fade + 1) / FADES;
          context.beginPath();

          for (const spark of show.sparks) {
            if (
              spark.color === color &&
              Math.min(FADES - 1, Math.floor(glowOf(spark) * FADES)) === fade
            ) {
              trail(context, spark);
            }
          }

          context.stroke();
        }
      }

      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      stepShow(show, (now - last) / 1000, width, height);
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      cancelAnimationFrame(frame);
      frame = 0;

      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", pause);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fit);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [canvas, running]);
};

export const ThemeSky = () => {
  const { sky } = themeOf(useTheme());
  const still = useReducedMotion();
  const pathname = usePathname();
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = sky !== null && !still && !DRAWS_ITS_OWN.has(pathname);
  useFireworks(ref, shown);

  if (!shown) {
    return null;
  }

  return <canvas ref={ref} className="theme-sky" data-sky={sky} aria-hidden="true" />;
};
