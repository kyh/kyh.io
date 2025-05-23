"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Bodies,
  Common,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
  World,
} from "matter-js";
import { useTheme } from "next-themes";

import { useViewport } from "@/components/viewport";
import styles from "./scene.module.css";

export const percentX = (percent: number) => {
  return Math.round((percent / 100) * window.innerWidth);
};

export const percentY = (percent: number) => {
  return Math.round((percent / 100) * window.innerHeight);
};

const getRenderProps = (isLight: boolean) => {
  return {
    fillStyle: "transparent",
    strokeStyle: isLight ? "black" : "white",
    lineWidth: 2,
  };
};

const createMulti = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  const y = -30;
  const x = Common.random(percentX(30), percentX(70));
  const sides = Math.round(Common.random(1, 8));

  let chamfer;
  if (sides > 2 && Common.random() > 0.7) {
    chamfer = {
      radius: 10,
    };
  }

  switch (Math.round(Common.random(0, 1))) {
    case 0:
      if (Common.random() < 0.8) {
        return Bodies.rectangle(
          x,
          y,
          Common.random(25, 50),
          Common.random(25, 50),
          { chamfer, render },
        );
      } else {
        return Bodies.rectangle(
          x,
          y,
          Common.random(80, 120),
          Common.random(25, 30),
          { chamfer, render },
        );
      }
    default:
      return Bodies.polygon(x, y, sides, Common.random(25, 50), {
        chamfer,
        render,
      });
  }
};

const createSquare = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  return Bodies.rectangle(
    Common.random(percentX(30), percentX(70)),
    -30,
    25,
    25,
    { render },
  );
};

const createCircle = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  return Bodies.circle(Common.random(percentX(30), percentX(70)), -30, 25, {
    render,
  });
};

const createTriangle = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  return Bodies.polygon(Common.random(percentX(30), percentX(70)), -30, 3, 25, {
    render,
  });
};

const createHexagon = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  return Bodies.polygon(Common.random(percentX(30), percentX(70)), -30, 6, 25, {
    render,
  });
};

const shapeToCreate = {
  multi: createMulti,
  square: createSquare,
  hexagon: createHexagon,
  triangle: createTriangle,
  circle: createCircle,
};

const createPlatform = () => {
  const x = percentX(50);
  const y = percentY(80);
  const width =
    window.innerWidth < 768 ? percentX(90) : Math.min(percentX(60), 768);

  const platformBase = Bodies.rectangle(x, y, width, 20, {
    isStatic: true,
    render: {
      fillStyle: "transparent",
    },
  });

  const platform = Bodies.rectangle(x, y - 10, width, 2, { isStatic: true });

  return { platform, platformBase };
};

const createBoundaries = () => {
  const bottomBoundary = Bodies.rectangle(
    percentX(50),
    percentY(130),
    percentX(100),
    50,
    {
      isSensor: true,
      isStatic: true,
    },
  );

  const leftBoundary = Bodies.rectangle(
    percentX(-30),
    percentY(50),
    50,
    percentY(100),
    {
      isStatic: true,
    },
  );

  const rightBoundary = Bodies.rectangle(
    percentX(130),
    percentY(50),
    50,
    percentY(100),
    {
      isStatic: true,
    },
  );

  return { bottomBoundary, leftBoundary, rightBoundary };
};

export type SceneRef = {
  trigger: (shape?: keyof typeof shapeToCreate) => void;
};

type SceneProps = {
  sceneRef?: RefObject<SceneRef | undefined>;
};

const SPAWN = 30;

export const Scene = ({ sceneRef: parentRef }: SceneProps) => {
  const { resolvedTheme } = useTheme();
  const size = useViewport();

  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Engine.create());
  const runnerRef = useRef(Runner.create());

  const platformRef = useRef<Record<number, Matter.Body>>({});
  const bodiesRef = useRef<Record<number, Matter.Body>>({});

  const spawnInterval = useRef<ReturnType<typeof setInterval>>(undefined);
  const spawnCount = useRef(0);

  useEffect(() => {
    const engine = engineRef.current;
    const runner = runnerRef.current;
    const world = engine.world;

    const render = Render.create({
      element: sceneRef.current!,
      engine: engine,
      options: {
        width: percentX(100),
        height: percentY(100),
        wireframes: false,
        background: "transparent",
      },
    });

    const mouse = Mouse.create(render.canvas),
      mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false,
          },
        },
      });

    Composite.add(world, mouseConstraint);

    render.mouse = mouse;

    Render.lookAt(render, {
      min: { x: 0, y: 0 },
      max: { x: percentX(100), y: percentY(100) },
    });

    Render.run(render);
    Runner.run(runner, engine);

    const { platform, platformBase } = createPlatform();
    Composite.add(world, [platform, platformBase]);
    platformRef.current = { ...platformRef.current, [platform.id]: platform };

    const { bottomBoundary, leftBoundary, rightBoundary } = createBoundaries();
    Composite.add(world, [bottomBoundary, leftBoundary, rightBoundary]);

    Events.on(engine, "collisionStart", ({ pairs }) => {
      pairs.forEach(({ bodyA, bodyB }) => {
        if (bodyA === bottomBoundary) {
          World.remove(world, bodyB);
          delete bodiesRef.current[bodyB.id];
        }

        if (bodyB === bottomBoundary) {
          World.remove(world, bodyA);
          delete bodiesRef.current[bodyA.id];
        }
      });
    });

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
      platformRef.current = {};
      bodiesRef.current = {};
    };
  }, [size.width, size.height]);

  const trigger = (shape?: keyof typeof shapeToCreate) => {
    const isLight = resolvedTheme === "light";
    const engine = engineRef.current;
    const world = engine.world;
    const create = shape ? shapeToCreate[shape] : shapeToCreate.multi;

    clearInterval(spawnInterval.current);
    spawnCount.current = 0;

    spawnInterval.current = setInterval(() => {
      if (!create) {
        clearInterval(spawnInterval.current);
        return;
      }

      const body = create(isLight);
      Composite.add(world, body);
      bodiesRef.current = { ...bodiesRef.current, [body.id]: body };
      spawnCount.current++;

      if (spawnCount.current >= SPAWN) {
        clearInterval(spawnInterval.current);
        spawnCount.current = 0;
      }
    }, 100);
  };

  useEffect(() => {
    trigger();
  }, [size.width, size.height]);

  useEffect(() => {
    const isLight = resolvedTheme === "light";

    Object.values(platformRef.current).forEach((b) => {
      if (b.render.fillStyle !== "transparent") {
        b.render.fillStyle = isLight ? "black" : "white";
      }
    });

    Object.values(bodiesRef.current).forEach((b) => {
      b.render.strokeStyle = isLight ? "black" : "white";
    });
  }, [resolvedTheme]);

  useEffect(() => {
    if (!parentRef) return;
    parentRef.current = {
      trigger,
    };
  }, []);

  return <div className={styles.container} ref={sceneRef} />;
};
