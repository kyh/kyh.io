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
  World,
} from "matter-js";
import { useTheme } from "next-themes";

const getRenderProps = (isLight: boolean) => ({
  fillStyle: "transparent",
  strokeStyle: isLight ? "black" : "white",
  lineWidth: 2,
});

const INITIAL_SHAPE_COUNT = 20;
const CLICK_SPAWN_COUNT = 6;

const createStaticShape = (isLight: boolean, x: number, y: number) => {
  const render = getRenderProps(isLight);
  const shapeType = Math.floor(Common.random(0, 4));

  switch (shapeType) {
    case 0:
      return Bodies.circle(x, y, Common.random(15, 25), { render });
    case 1:
      return Bodies.rectangle(
        x,
        y,
        Common.random(20, 35),
        Common.random(20, 35),
        { render },
      );
    case 2:
      return Bodies.polygon(x, y, 3, Common.random(18, 28), { render });
    default:
      return Bodies.polygon(x, y, 6, Common.random(15, 22), { render });
  }
};

const createClickShape = (isLight: boolean, clickX: number, clickY: number) => {
  const render = getRenderProps(isLight);

  // Random angle for radial scatter (bias upward)
  const angle = Common.random(-Math.PI * 0.9, -Math.PI * 0.1);
  const speed = Common.random(2, 5);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  const shapeType = Math.floor(Common.random(0, 4));
  let body: Matter.Body;

  // Small initial size for pop animation
  switch (shapeType) {
    case 0:
      body = Bodies.circle(clickX, clickY, 5, { render });
      break;
    case 1:
      body = Bodies.rectangle(clickX, clickY, 8, 8, { render });
      break;
    case 2:
      body = Bodies.polygon(clickX, clickY, 3, 6, { render });
      break;
    default:
      body = Bodies.polygon(clickX, clickY, 6, 5, { render });
  }

  Body.setVelocity(body, { x: vx, y: vy });
  return { body, targetScale: Common.random(2.5, 4) };
};

// Easing function for pop animation
const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

type AnimatingShape = {
  body: Matter.Body;
  startTime: number;
  targetScale: number;
  currentScale: number;
};

export const ShapesCanvas = () => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const renderRef = useRef<Render | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const animatingRef = useRef<AnimatingShape[]>([]);
  const isVisibleRef = useRef(true);

  // Pause/resume physics based on visibility
  const pausePhysics = useCallback(() => {
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
    }
  }, []);

  const resumePhysics = useCallback(() => {
    if (runnerRef.current && engineRef.current) {
      Runner.run(runnerRef.current, engineRef.current);
    }
  }, []);

  // IntersectionObserver to pause when not visible
  useEffect(() => {
    if (!containerRef.current) return;

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

    return () => observer.disconnect();
  }, [pausePhysics, resumePhysics]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.offsetWidth;
    const height = 480;
    const isLight = resolvedTheme === "light";

    const engine = Engine.create();
    engineRef.current = engine;

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    // Mouse interaction for dragging
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Allow page scrolling by removing matter-js wheel listener
    const canvas = render.canvas;
    canvas.onwheel = null;
    // @ts-expect-error - mousewheel is internal to matter-js
    if (mouse.mousewheel) {
      // @ts-expect-error
      canvas.removeEventListener("wheel", mouse.mousewheel);
      // @ts-expect-error
      canvas.removeEventListener("mousewheel", mouse.mousewheel);
      // @ts-expect-error
      canvas.removeEventListener("DOMMouseScroll", mouse.mousewheel);
    }

    // Invisible ground and boundary to remove fallen shapes
    const ground = Bodies.rectangle(width / 2, height + 25, width * 3, 50, {
      isStatic: true,
      render: { visible: false },
    });
    const bottomSensor = Bodies.rectangle(
      width / 2,
      height + 100,
      width * 3,
      50,
      {
        isSensor: true,
        isStatic: true,
        render: { visible: false },
      },
    );

    Composite.add(engine.world, [ground, bottomSensor]);

    // Remove shapes that fall off screen
    Events.on(engine, "collisionStart", ({ pairs }) => {
      pairs.forEach(({ bodyA, bodyB }) => {
        if (bodyA === bottomSensor) {
          World.remove(engine.world, bodyB);
          bodiesRef.current = bodiesRef.current.filter((b) => b !== bodyB);
        }
        if (bodyB === bottomSensor) {
          World.remove(engine.world, bodyA);
          bodiesRef.current = bodiesRef.current.filter((b) => b !== bodyA);
        }
      });
    });

    // Initial shapes placed mostly in the middle
    const centerX = width / 2;
    for (let i = 0; i < INITIAL_SHAPE_COUNT; i++) {
      const x = centerX + Common.random(-120, 120);
      const y = Common.random(height - 150, height - 50);
      const shape = createStaticShape(isLight, x, y);
      bodiesRef.current.push(shape);
      Composite.add(engine.world, shape);
    }

    // Spawn shapes at position
    const spawnShapesAt = (x: number, y: number) => {
      if (!engineRef.current) return;

      // Check if click is on an existing body
      const bodies = Composite.allBodies(engineRef.current.world).filter(
        (b) => !b.isStatic,
      );
      const clickedBodies = Query.point(bodies, { x, y });

      // Only spawn if clicking empty space
      if (clickedBodies.length > 0) return;

      const count = Math.floor(
        Common.random(CLICK_SPAWN_COUNT, CLICK_SPAWN_COUNT + 2),
      );
      for (let i = 0; i < count; i++) {
        const { body, targetScale } = createClickShape(isLight, x, y);
        bodiesRef.current.push(body);
        animatingRef.current.push({
          body,
          startTime: Date.now(),
          targetScale,
          currentScale: 1,
        });
        Composite.add(engineRef.current.world, body);
      }
    };

    // Click handler for desktop
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      spawnShapesAt(e.clientX - rect.left, e.clientY - rect.top);
    };

    // Touch handler for mobile
    const handleTouch = (e: TouchEvent) => {
      // Only handle single taps, not drags
      if (e.touches.length > 1) return;

      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      spawnShapesAt(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchend", handleTouch);

    // Device orientation for tilt-based gravity
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!engineRef.current || e.gamma === null || e.beta === null) return;

      // gamma: left/right tilt (-90 to 90)
      // beta: front/back tilt (-180 to 180)
      const gravityX = (e.gamma / 90) * 2; // Map to -2 to 2
      const gravityY = Math.max(0.5, Math.min(2, (e.beta / 90) * 2)); // Map to 0.5 to 2, always some downward

      engine.gravity.x = gravityX;
      engine.gravity.y = gravityY;
    };

    // Request permission on iOS 13+
    const requestOrientationPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        // @ts-expect-error - requestPermission is iOS specific
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        try {
          // @ts-expect-error - requestPermission is iOS specific
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        } catch {
          // Permission denied or error
        }
      } else {
        // Non-iOS or older browsers
        window.addEventListener("deviceorientation", handleOrientation);
      }
    };

    requestOrientationPermission();

    // Animate scale for newly spawned shapes
    Events.on(engine, "afterUpdate", () => {
      animatingRef.current = animatingRef.current.filter(
        ({ body, startTime, targetScale, currentScale }) => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / 150, 1);

          if (progress < 1) {
            const newScale = 1 + (targetScale - 1) * easeOutBack(progress);
            const scaleFactor = newScale / currentScale;
            Body.scale(body, scaleFactor, scaleFactor);
            // Update current scale for next iteration
            const idx = animatingRef.current.findIndex((a) => a.body === body);
            if (idx !== -1) {
              animatingRef.current[idx].currentScale = newScale;
            }
            return true;
          }
          return false;
        },
      );
    });

    const runner = Runner.create();
    runnerRef.current = runner;

    // Fade shapes as they approach top of canvas
    const FADE_START = 180; // Start fading at this y
    const FADE_END = 50; // Fully transparent at this y
    Events.on(engine, "afterUpdate", () => {
      bodiesRef.current.forEach((body) => {
        const y = body.position.y;
        if (y < FADE_START) {
          const opacity = Math.max(0, (y - FADE_END) / (FADE_START - FADE_END));
          const baseColor = isLight ? "0, 0, 0" : "255, 255, 255";
          body.render.strokeStyle = `rgba(${baseColor}, ${opacity})`;
        } else {
          body.render.strokeStyle = isLight ? "black" : "white";
        }
      });
    });

    Render.run(render);
    Runner.run(runner, engine);

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchend", handleTouch);
      window.removeEventListener("deviceorientation", handleOrientation);
      if (renderRef.current) {
        Render.stop(renderRef.current);
        renderRef.current.canvas.remove();
      }
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
      }
      if (engineRef.current) {
        Engine.clear(engineRef.current);
      }
      bodiesRef.current = [];
      animatingRef.current = [];
    };
  }, [resolvedTheme]);

  // Update colors on theme change
  useEffect(() => {
    const isLight = resolvedTheme === "light";
    bodiesRef.current.forEach((body) => {
      body.render.strokeStyle = isLight ? "black" : "white";
    });
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full touch-pan-y"
      style={{ touchAction: "pan-y" }}
      aria-hidden="true"
    />
  );
};
