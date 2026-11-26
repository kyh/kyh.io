"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Bodies,
  Body,
  Common,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Query,
  Render,
  Runner,
  Sleeping,
  World,
} from "matter-js";
import { discoverEgg } from "@/easter-eggs/store";
import { tiltGravity } from "@/lib/tilt";
import { useAppearance } from "@/themes/store";

const getRenderProps = (isLight: boolean) => ({
  fillStyle: "transparent",
  lineWidth: 2,
  strokeStyle: isLight ? "black" : "white",
});

const hasPermissionPrompt = (
  target: typeof DeviceOrientationEvent,
): target is typeof DeviceOrientationEvent & { requestPermission: () => Promise<PermissionState> } =>
  "requestPermission" in target;

const isEventListener = (value: unknown): value is EventListener => typeof value === "function";

const INITIAL_FIGURE_COUNT = 20;
const CLICK_SPAWN_COUNT = 6;
const TILT_SMOOTHING = 0.2;
const TILT_WAKE = 0.01;

const createStaticFigure = (isLight: boolean, x: number, y: number) => {
  const render = getRenderProps(isLight);
  const figureType = Math.floor(Common.random(0, 4));

  switch (figureType) {
    case 0: {
      return Bodies.circle(x, y, Common.random(15, 25), { render });
    }

    case 1: {
      return Bodies.rectangle(x, y, Common.random(20, 35), Common.random(20, 35), { render });
    }

    case 2: {
      return Bodies.polygon(x, y, 3, Common.random(18, 28), { render });
    }

    default: {
      return Bodies.polygon(x, y, 6, Common.random(15, 22), { render });
    }
  }
};

const createClickFigure = (isLight: boolean, clickX: number, clickY: number) => {
  const render = getRenderProps(isLight);

  const angle = Common.random(-Math.PI * 0.9, -Math.PI * 0.1);
  const speed = Common.random(2, 5);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  const figureType = Math.floor(Common.random(0, 4));
  let body: Matter.Body;

  switch (figureType) {
    case 0: {
      body = Bodies.circle(clickX, clickY, 5, { render });
      break;
    }

    case 1: {
      body = Bodies.rectangle(clickX, clickY, 8, 8, { render });
      break;
    }

    case 2: {
      body = Bodies.polygon(clickX, clickY, 3, 6, { render });
      break;
    }

    default: {
      body = Bodies.polygon(clickX, clickY, 6, 5, { render });
    }
  }

  Body.setVelocity(body, { x: vx, y: vy });

  return { body, targetScale: Common.random(2.5, 4) };
};

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

interface AnimatingFigure {
  body: Matter.Body;
  startTime: number;
  targetScale: number;
  currentScale: number;
}

export const FigurePhysics = () => {
  const { mode } = useAppearance();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const animatingRef = useRef<AnimatingFigure[]>([]);
  const isVisibleRef = useRef(true);
  const isLightRef = useRef(mode === "light");
  const staleRef = useRef(true);

  const pausePhysics = useCallback(() => {
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
    }
  }, []);

  const resumePhysics = useCallback(() => {
    const runner = runnerRef.current;
    const engine = engineRef.current;

    if (runner && engine) {
      Runner.stop(runner);
      Runner.run(runner, engine);
    }
  }, []);

  const wakePhysics = useCallback(() => {
    if (isVisibleRef.current) {
      resumePhysics();
    }
  }, [resumePhysics]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          const isVisible = entries[0]?.isIntersecting ?? false;
          isVisibleRef.current = isVisible;

          if (isVisible) {
            resumePhysics();
          } else {
            pausePhysics();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(containerRef.current);

      cleanup = () => {
        observer.disconnect();
      };
    }

    return cleanup;
  }, [pausePhysics, resumePhysics]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;

      const height = 480;

      const engine = Engine.create({ enableSleeping: true });

      engineRef.current = engine;

      const surface = document.createElement("canvas");
      containerRef.current.append(surface);

      const render = Render.create({
        canvas: surface,
        engine,
        options: {
          background: "transparent",
          height,
          pixelRatio: window.devicePixelRatio || 1,
          width,
          wireframes: false,
        },
      });

      const mouse = Mouse.create(render.canvas);

      const mouseConstraint = MouseConstraint.create(engine, {
        constraint: {
          render: { visible: false },
          stiffness: 0.2,
        },
        mouse,
      });

      Composite.add(engine.world, mouseConstraint);

      render.mouse = mouse;

      const { canvas } = render;

      const mousewheel = "mousewheel" in mouse ? mouse.mousewheel : undefined;

      if (isEventListener(mousewheel)) {
        canvas.removeEventListener("wheel", mousewheel);
        canvas.removeEventListener("mousewheel", mousewheel);
        canvas.removeEventListener("DOMMouseScroll", mousewheel);
      }

      const ground = Bodies.rectangle(width / 2, height + 25, width * 3, 50, {
        isStatic: true,
        render: { visible: false },
      });

      const bottomSensor = Bodies.rectangle(width / 2, height + 100, width * 3, 50, {
        isSensor: true,
        isStatic: true,
        render: { visible: false },
      });

      Composite.add(engine.world, [ground, bottomSensor]);

      Events.on(engine, "collisionStart", ({ pairs }) => {
        for (const { bodyA, bodyB } of pairs) {
          if (bodyA === bottomSensor) {
            World.remove(engine.world, bodyB);
            bodiesRef.current = bodiesRef.current.filter((b) => b !== bodyB);
          }

          if (bodyB === bottomSensor) {
            World.remove(engine.world, bodyA);
            bodiesRef.current = bodiesRef.current.filter((b) => b !== bodyA);
          }
        }
      });

      const centerX = width / 2;

      for (let i = 0; i < INITIAL_FIGURE_COUNT; i += 1) {
        const x = centerX + Common.random(-120, 120);
        const y = Common.random(height - 150, height - 50);
        const figure = createStaticFigure(isLightRef.current, x, y);
        bodiesRef.current.push(figure);
        Composite.add(engine.world, figure);
      }

      const spawnFiguresAt = (x: number, y: number) => {
        if (!engineRef.current) {
          return;
        }

        const bodies = Composite.allBodies(engineRef.current.world).filter((b) => !b.isStatic);
        const clickedBodies = Query.point(bodies, { x, y });

        if (clickedBodies.length > 0) {
          return;
        }

        const count = Math.floor(Common.random(CLICK_SPAWN_COUNT, CLICK_SPAWN_COUNT + 2));

        for (let i = 0; i < count; i += 1) {
          const { body, targetScale } = createClickFigure(isLightRef.current, x, y);
          bodiesRef.current.push(body);
          animatingRef.current.push({
            body,
            currentScale: 1,
            startTime: Date.now(),
            targetScale,
          });
          Composite.add(engineRef.current.world, body);
        }

        wakePhysics();
        discoverEgg("shapes");
      };

      const handleClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        spawnFiguresAt(e.clientX - rect.left, e.clientY - rect.top);
      };

      const handleTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          return;
        }

        const [touch] = e.changedTouches;

        if (!touch) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        spawnFiguresAt(touch.clientX - rect.left, touch.clientY - rect.top);
      };

      canvas.addEventListener("pointerdown", wakePhysics);

      canvas.addEventListener("click", handleClick);

      canvas.addEventListener("touchend", handleTouch);

      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.beta === null || e.gamma === null) {
          return;
        }

        const target = tiltGravity(e.beta, e.gamma, screen.orientation?.angle ?? 0);
        const dx = (target.x - engine.gravity.x) * TILT_SMOOTHING;
        const dy = (target.y - engine.gravity.y) * TILT_SMOOTHING;
        engine.gravity.x += dx;
        engine.gravity.y += dy;

        if (Math.hypot(dx, dy) > TILT_WAKE) {
          for (const body of bodiesRef.current) {
            Sleeping.set(body, false);
          }

          wakePhysics();
        }
      };

      let orientationRequested = false;

      const orientation =
        typeof DeviceOrientationEvent !== "undefined" && hasPermissionPrompt(DeviceOrientationEvent)
          ? DeviceOrientationEvent
          : null;

      const requestOrientationPermission = async () => {
        if (orientationRequested || orientation === null) {
          return;
        }

        orientationRequested = true;

        try {
          const permission = await orientation.requestPermission();

          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        } catch {
          orientationRequested = false;
        }
      };

      const askOrientation = () => {
        void requestOrientationPermission();
      };

      if (orientation === null) {
        window.addEventListener("deviceorientation", handleOrientation);
      } else {
        canvas.addEventListener("touchend", askOrientation);
      }

      Events.on(engine, "afterUpdate", () => {
        animatingRef.current = animatingRef.current.filter(
          ({ body, startTime, targetScale, currentScale }) => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 150, 1);

            if (progress < 1) {
              const newScale = 1 + (targetScale - 1) * easeOutBack(progress);
              const scaleFactor = newScale / currentScale;
              Body.scale(body, scaleFactor, scaleFactor);
              const idx = animatingRef.current.findIndex((a) => a.body === body);
              const animating = animatingRef.current[idx];

              if (idx !== -1 && animating) {
                animating.currentScale = newScale;
              }

              return true;
            }

            return false;
          },
        );
      });

      const runner = Runner.create();

      runnerRef.current = runner;

      const FADE_START = 180;

      const FADE_END = 50;

      Events.on(engine, "afterUpdate", () => {
        const isLight = isLightRef.current;

        for (const body of bodiesRef.current) {
          const { y } = body.position;

          if (y < FADE_START) {
            const opacity = Math.max(0, (y - FADE_END) / (FADE_START - FADE_END));
            const baseColor = isLight ? "0, 0, 0" : "255, 255, 255";
            body.render.strokeStyle = `rgba(${baseColor}, ${opacity})`;
          } else {
            body.render.strokeStyle = isLight ? "black" : "white";
          }
        }
      });

      staleRef.current = true;

      Events.on(runner, "afterTick", () => {
        const moving =
          animatingRef.current.length > 0 ||
          mouseConstraint.body !== null ||
          bodiesRef.current.some((body) => !body.isSleeping);

        if (moving || staleRef.current) {
          Render.world(render);
          staleRef.current = false;
        }

        if (!moving) {
          Runner.stop(runner);
        }
      });

      if (isVisibleRef.current) {
        Runner.run(runner, engine);
      }

      cleanup = () => {
        canvas.removeEventListener("pointerdown", wakePhysics);
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("touchend", handleTouch);
        canvas.removeEventListener("touchend", askOrientation);
        window.removeEventListener("deviceorientation", handleOrientation);
        Mouse.clearSourceEvents(mouse);
        Events.off(engine, "collisionStart");
        Events.off(engine, "afterUpdate");
        Events.off(runner, "afterTick");
        Runner.stop(runner);
        canvas.remove();

        if (engineRef.current) {
          Engine.clear(engineRef.current);
        }

        bodiesRef.current = [];
        animatingRef.current = [];
      };
    }

    return cleanup;
  }, [wakePhysics]);

  useEffect(() => {
    isLightRef.current = mode === "light";
    staleRef.current = true;
    wakePhysics();
  }, [mode, wakePhysics]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full touch-pan-y"
      style={{ touchAction: "pan-y" }}
      aria-hidden="true"
    />
  );
};
