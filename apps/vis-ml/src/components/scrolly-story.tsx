import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

export interface StoryStep<Scene> {
  id: string;
  body: ReactNode;
  scene: Scene;
}

export type StorySteps<Scene> = readonly [StoryStep<Scene>, ...StoryStep<Scene>[]];

interface ScrollyStoryProps<Scene> {
  steps: StorySteps<Scene>;
  renderGraphic: (scene: Scene) => ReactNode;
}

const useActiveStep = (firstStepId: string, container: RefObject<HTMLElement | null>) => {
  const [activeStepId, setActiveStepId] = useState(firstStepId);

  useEffect(() => {
    const elements = container.current?.querySelectorAll<HTMLElement>("[data-story-step]");
    let cleanup: (() => void) | undefined;

    if (elements !== undefined) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id =
              entry.isIntersecting && entry.target instanceof HTMLElement
                ? entry.target.dataset.storyStep
                : undefined;

            if (id !== undefined) {
              setActiveStepId(id);
            }
          }
        },
        { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
      );

      for (const element of elements) {
        observer.observe(element);
      }

      cleanup = () => {
        observer.disconnect();
      };
    }

    return cleanup;
  }, [container]);

  return activeStepId;
};

export const ScrollyStory = <Scene,>({ steps, renderGraphic }: ScrollyStoryProps<Scene>) => {
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
};
