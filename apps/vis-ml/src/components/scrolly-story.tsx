import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

export type StoryStep<Scene> = {
  id: string;
  body: ReactNode;
  scene: Scene;
};

export type StorySteps<Scene> = readonly [StoryStep<Scene>, ...StoryStep<Scene>[]];

type ScrollyStoryProps<Scene> = {
  steps: StorySteps<Scene>;
  renderGraphic: (scene: Scene) => ReactNode;
};

function useActiveStep(firstStepId: string, container: RefObject<HTMLElement | null>) {
  const [activeStepId, setActiveStepId] = useState(firstStepId);

  useEffect(() => {
    const elements = container.current?.querySelectorAll<HTMLElement>("[data-story-step]");
    if (elements === undefined) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-story-step");
          if (id !== null) setActiveStepId(id);
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [container]);

  return activeStepId;
}

export function ScrollyStory<Scene>({ steps, renderGraphic }: ScrollyStoryProps<Scene>) {
  const container = useRef<HTMLElement>(null);
  const activeStepId = useActiveStep(steps[0].id, container);
  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];

  return (
    <section id="scrolly" aria-label="Interactive lesson" ref={container}>
      <article>
        {steps.map((step) => {
          const isActive = step.id === activeStep.id;
          return (
            <div
              className="step"
              data-story-step={step.id}
              key={step.id}
              aria-current={isActive ? "step" : undefined}
            >
              {step.body}
            </div>
          );
        })}
      </article>

      <figure aria-live="polite">{renderGraphic(activeStep.scene)}</figure>
    </section>
  );
}
