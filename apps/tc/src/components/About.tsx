import { feature } from "@repo/tailwind-compat/media.stylex";
import { boxShadow } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import type { Step, TooltipRenderProps } from "react-joyride";
import { useState } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import { Portal } from "react-portal";
import * as stylex from "@stylexjs/stylex";
import {
  colors,
  containers,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

const styles = stylex.create({
  mt2: { marginTop: spacing[2] },
  lead: { marginTop: spacing[2], fontWeight: fontWeights.bold, color: colors.emerald500 },
  sectionLabel: {
    marginTop: spacing[4],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    color: colors.slate400,
    textTransform: "uppercase",
  },
  tooltip: {
    maxWidth: containers.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    padding: spacing[6],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate200,
    boxShadow: boxShadow.xl,
  },
  tooltipTitle: {
    marginBottom: spacing[5],
    fontSize: fontSizes["2xl"],
    lineHeight: spacing[6],
    fontWeight: fontWeights.bold,
    color: colors.slate50,
  },
  footer: {
    marginTop: spacing[5],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: { display: "flex", gap: spacing[1] },
  dot: {
    height: spacing[2],
    width: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.slate200,
    backgroundColor: "transparent",
  },
  dotActive: { backgroundColor: colors.slate200 },
  button: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radii.sm,
    paddingInline: spacing[4],
    paddingBlock: spacing[1.5],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    fontWeight: fontWeights.medium,
  },
  back: { color: colors.emerald600 },
  next: {
    backgroundColor: {
      default: colors.emerald900,
      [feature.hover]: { default: colors.emerald900, ":hover": colors.emerald700 },
    },
    color: colors.emerald100,
  },
});

const defaultStepProps = {
  disableBeacon: true,
  placement: "right" as const,
  floaterProps: {
    disableAnimation: true,
  },
};

export const defaultSteps: Step[] = [
  {
    ...defaultStepProps,
    target: ".title-section",
    content: (
      <>
        <p>
          The term <strong>Total Compensation</strong> captures all the different ways you are
          financially compensated by your employer: base salary, bonus, equity, benefits, etc.
        </p>
        <p {...stylex.props(styles.lead)}>
          This calculator normalizes all these different forms of compensation into dollar values
          (from private or public companies) so you can estimate the final amount you are paid.
        </p>
      </>
    ),
  },
  {
    ...defaultStepProps,
    target: ".cash-section",
    content: (
      <>
        <p>
          Cash compensation is the simplest category to understand because it’s what gets directly
          deposited into your bank account.
        </p>
        <p {...stylex.props(styles.sectionLabel)}>Types of cash compensation:</p>
        <ul>
          <li {...stylex.props(styles.mt2)}>
            <strong>Base Salary</strong> - amount of money you receive just for being employed
            (regardless of the performance of the company or your performance)
          </li>
          <li {...stylex.props(styles.mt2)}>
            <strong>Bonuses</strong> - a single lump sum of cash (sometimes it’s a yearly bonus,
            other times it could be a one time bonus at certain milestones)
          </li>
        </ul>
      </>
    ),
  },
  {
    ...defaultStepProps,
    target: ".equity-section",
    content: (
      <>
        <p>
          Equity compensation is more complex, you only recieve during certain periods and it’s
          difficult to get the exact dollar value of your equity.
        </p>
        <p {...stylex.props(styles.sectionLabel)}>Types of equity compensation:</p>
        <ul>
          <li {...stylex.props(styles.mt2)}>
            <strong>ISO</strong> - your typical startup equity package consists of stock options
            which translate to stocks once you buy them for a certain strike price
          </li>
          <li {...stylex.props(styles.mt2)}>
            <strong>RSU</strong> - these are just like any other shares of company stock once they
            are vested
          </li>
        </ul>
      </>
    ),
  },
  {
    ...defaultStepProps,
    target: ".equity-value-section",
    content: (
      <>
        <p>
          Estimating the value of your equity is the hard part. Investors often look at value from
          multiple dimensions. To keep things simple, we offer 2 different approaches.
        </p>
        <p {...stylex.props(styles.sectionLabel)}>Estimating equity value:</p>
        <ul>
          <li {...stylex.props(styles.mt2)}>
            <strong>Growth based</strong> - At high-growth startup companies it may be easier to
            think of your stock value as an N multiple after 4 years. Often, VCs expect a 10x return
            on their investment
          </li>
          <li {...stylex.props(styles.mt2)}>
            <strong>Revenue based</strong> - If you know the revenue of your company, you can
            estimate the value of your equity by comparing it against the revenue multiple of an
            equivalent public company
          </li>
        </ul>
      </>
    ),
  },
  {
    ...defaultStepProps,
    target: ".estimate-modal-button",
    content: (
      <>
        <p>
          If you don’t know what numbers to use, we can offer reasonable defaults for you by looking
          at competitors.
        </p>
      </>
    ),
  },
];

export const useAbout = () => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps] = useState(defaultSteps);

  const handleJoyrideCallback: import("react-joyride").EventHandler = ({
    action,
    index,
    type,
    status,
  }) => {
    if (action === ACTIONS.CLOSE || status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const stepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(stepIndex);
    }
  };

  return {
    run,
    setRun,
    stepIndex,
    setStepIndex,
    steps,
    handleJoyrideCallback,
  };
};

const Tooltip = ({
  index,
  step,
  backProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) => (
  <div {...stylex.props(styles.tooltip)} {...tooltipProps}>
    {step.title && <h1 {...stylex.props(styles.tooltipTitle)}>{step.title}</h1>}
    {step.content}
    <footer {...stylex.props(styles.footer)}>
      <div {...stylex.props(styles.dots)}>
        {defaultSteps.map((_s, i) => (
          <div
            key={i}
            {...stylex.props(styles.dot, i === index && styles.dotActive)}
            aria-hidden="true"
          />
        ))}
      </div>
      <div>
        {index > 0 && (
          <button {...stylex.props(styles.button, styles.back)} type="button" {...backProps}>
            Back
          </button>
        )}
        <button {...stylex.props(styles.button, styles.next)} type="button" {...primaryProps}>
          {isLastStep ? "Done" : "Next"}
        </button>
      </div>
    </footer>
  </div>
);

type Props = ReturnType<typeof useAbout>;

export const About = ({ run, stepIndex, steps, handleJoyrideCallback }: Props) => (
  <Portal>
    <Joyride
      continuous
      tooltipComponent={Tooltip}
      onEvent={handleJoyrideCallback}
      run={run}
      stepIndex={stepIndex}
      steps={steps}
      styles={{
        arrow: {
          color: "transparent",
        },
      }}
    />
  </Portal>
);
