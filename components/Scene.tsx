import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Events,
  Engine,
  Render,
  Runner,
  Common,
  Mouse,
  MouseConstraint,
  Composite,
  Bodies,
  World,
} from "matter-js";
import { useTheme } from "next-themes";
import styles from "./Scene.module.css";

const percentX = (percent: number) => {
  return Math.round((percent / 100) * window.innerWidth);
};

const percentY = (percent: number) => {
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
          { chamfer, render }
        );
      } else {
        return Bodies.rectangle(
          x,
          y,
          Common.random(80, 120),
          Common.random(25, 30),
          { chamfer, render }
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
    { render }
  );
};

const createCircle = () => {};

const createTriangle = (isLight: boolean) => {
  const render = getRenderProps(isLight);
  return Bodies.rectangle(
    Common.random(percentX(30), percentX(70)),
    -30,
    25,
    25,
    { render }
  );
};

const createRing = () => {};

export const Scene = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Engine.create());
  const runnerRef = useRef(Runner.create());

  const floorRef = useRef<Matter.Body[]>([]);
  const bodiesRef = useRef<Matter.Body[]>([]);

  const spawnInterval = useRef<ReturnType<typeof setInterval>>();

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
        // @ts-expect-error
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

    const floorBase = Bodies.rectangle(
      percentX(50),
      percentY(80),
      percentX(60),
      20,
      {
        isStatic: true,
        render: {
          fillStyle: "transparent",
        },
      }
    );

    const floor = Bodies.rectangle(
      percentX(50),
      percentY(80) - 9,
      percentX(60),
      1,
      { isStatic: true }
    );

    Composite.add(world, [floor, floorBase]);
    floorRef.current.push(floor);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  useEffect(() => {
    const isLight = theme === "light";
    const engine = engineRef.current;
    const world = engine.world;

    clearInterval(spawnInterval.current!);

    spawnInterval.current = setInterval(() => {
      const body = createMulti(isLight);
      Composite.add(world, body);
      bodiesRef.current.push(body);

      if (bodiesRef.current.length > 30) {
        clearInterval(spawnInterval.current!);
      }
    }, 200);
  }, [router.asPath]);

  useEffect(() => {
    const isLight = theme === "light";

    floorRef.current.forEach((b) => {
      if (b.render.fillStyle !== "transparent") {
        b.render.fillStyle = isLight ? "black" : "white";
      }
    });

    bodiesRef.current.forEach((b) => {
      b.render.strokeStyle = isLight ? "black" : "white";
    });
  }, [theme]);

  return <div className={styles.container} ref={sceneRef} />;
};
