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

export const Scene = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Engine.create());

  useEffect(() => {
    const cw = document.body.clientWidth;
    const ch = document.body.clientHeight;

    const engine = engineRef.current;
    const world = engine.world;

    const render = Render.create({
      element: sceneRef.current!,
      engine: engine,
      options: {
        width: cw,
        height: ch,
        wireframes: true,
        wireframeBackground: "transparent",
        background: "transparent",
      },
    });

    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    const stack = Composites.stack(
      20,
      20,
      10,
      5,
      0,
      0,
      (x: number, y: number) => {
        const sides = Math.round(Common.random(1, 8));

        // round the edges of some bodies
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
                { chamfer: chamfer }
              );
            } else {
              return Bodies.rectangle(
                x,
                y,
                Common.random(80, 120),
                Common.random(25, 30),
                { chamfer: chamfer }
              );
            }
          case 1:
            return Bodies.polygon(x, y, sides, Common.random(25, 50), {
              chamfer: chamfer,
            });
        }
      }
    );

    Composite.add(world, stack);

    Composite.add(world, [
      // walls
      // Bodies.rectangle(400, 0, 800, 50, { isStatic: true }),
      Bodies.rectangle(400, 600, 800, 50, { isStatic: true }),
      // Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
      // Bodies.rectangle(0, 300, 50, 600, { isStatic: true }),
    ]);

    // add mouse control
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

    // keep the mouse in sync with rendering
    render.mouse = mouse;

    // fit the render viewport to the scene
    Render.lookAt(render, {
      min: { x: 0, y: 0 },
      max: { x: 800, y: 600 },
    });

    return () => {
      Render.stop(render);
      World.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  return <div ref={sceneRef} style={{ width: "100%", height: "100%" }} />;
};
