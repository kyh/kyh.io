"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { PALETTE } from "@/app/showcase/_components/city/palette";
import { COLORS, createSky, glowOf, stepSky } from "./fireworks";
import { themeOf } from "./index";
import { useTheme } from "./store";

const COLOR_TOKENS = [
  "festiveRed",
  "gold",
  "accentOrange",
  "lamp",
] as const satisfies readonly (keyof typeof PALETTE)[];

const TRAIL = 0.07;
const MAX_DPR = 2;

const colorsFor = (dark: boolean) =>
  COLOR_TOKENS.slice(0, COLORS).map((token) => PALETTE[token][dark ? "night" : "day"]);

const useFireworks = (canvas: React.RefObject<HTMLCanvasElement | null>, running: boolean) => {
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");

    if (!running || !element || !context) {
      return;
    }

    const sky = createSky(Math.floor(Math.random() * 1_000_000));
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();

    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = element.clientWidth;
      height = element.clientHeight;
      element.setAttribute("width", `${Math.round(width * ratio)}`);
      element.setAttribute("height", `${Math.round(height * ratio)}`);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
    };

    const draw = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      const colors = colorsFor(dark);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 2.5;

      for (const rocket of sky.rockets) {
        context.globalAlpha = 0.9;
        context.strokeStyle = colors[rocket.color] ?? "white";
        context.beginPath();
        context.moveTo(rocket.x - rocket.vx * TRAIL, rocket.y - rocket.vy * TRAIL);
        context.lineTo(rocket.x, rocket.y);
        context.stroke();
      }

      for (const spark of sky.sparks) {
        context.globalAlpha = glowOf(spark);
        context.strokeStyle = colors[spark.color] ?? "white";
        context.beginPath();
        context.moveTo(spark.x - spark.vx * TRAIL, spark.y - spark.vy * TRAIL);
        context.lineTo(spark.x, spark.y);
        context.stroke();
      }

      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      stepSky(sky, (now - last) / 1000, width, height);
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
    document.addEventListener("visibilitychange", pause);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", pause);
    };
  }, [canvas, running]);
};

export const ThemeSky = () => {
  const { sky } = themeOf(useTheme());
  const still = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = sky !== null && !still;
  useFireworks(ref, shown);

  if (!shown) {
    return null;
  }

  return <canvas ref={ref} className="theme-sky" data-sky={sky} aria-hidden="true" />;
};
