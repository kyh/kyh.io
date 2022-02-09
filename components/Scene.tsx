import { useEffect, useRef } from "react";
import {
  Engine,
  Render,
  Runner,
  Common,
  Mouse,
  MouseConstraint,
  Composite,
  Composites,
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

export const Scene = () => {
  const { theme } = useTheme();
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Engine.create());
  const runnerRef = useRef(Runner.create());

  const floorRef = useRef<Composite | null>(null);
  const stacksRef = useRef<Composite | null>(null);

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

    const stack = Composites.stack(
      percentX(50) / 2,
      20,
      10,
      5,
      0,
      0,
      (x: number, y: number) => {
        const sides = Math.round(Common.random(1, 8));

        const render = {
          fillStyle: "transparent",
          strokeStyle: "white",
          lineWidth: 2,
        };

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
          case 1:
            return Bodies.polygon(x, y, sides, Common.random(25, 50), {
              chamfer,
              render,
            });
        }
      }
    );

    Composite.add(world, stack);
    stacksRef.current = stack;

    const floor = Bodies.rectangle(
      percentX(50),
      percentY(80),
      percentX(60),
      2,
      {
        isStatic: true,
        render: {
          fillStyle: "white",
        },
      }
    );

    floorRef.current = Composite.add(world, floor);

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

    const toggleColors = () => {
      floorRef.current &&
        floorRef.current.bodies.map((b) => {
          b.render.fillStyle = isLight ? "black" : "white";
        });
      stacksRef.current &&
        stacksRef.current.bodies.map((b) => {
          b.render.strokeStyle = isLight ? "black" : "white";
        });
    };

    toggleColors();
  }, [theme]);

  return <div className={styles.container} ref={sceneRef} />;
};
