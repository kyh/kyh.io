type LessonCore = {
  number: number;
  unit: "Foundations" | "Models" | "Generalization" | "Practice";
  title: string;
  summary: string;
};

export type AvailableLesson = LessonCore & {
  status: "available";
  href: string;
  duration: string;
};

export type PlannedLesson = LessonCore & {
  status: "planned";
  release: "Next" | "Planned";
};

export type CurriculumLesson = AvailableLesson | PlannedLesson;

export const curriculum: readonly CurriculumLesson[] = [
  {
    number: 1,
    unit: "Foundations",
    title: "Make a prediction",
    summary: "Turn one input into an output, then measure how wrong your first rule is.",
    status: "available",
    href: "/lessons/prediction/",
    duration: "8 min",
  },
  {
    number: 2,
    unit: "Foundations",
    title: "Learn from the miss",
    summary: "Follow the error downhill and see how gradient descent tunes a model.",
    status: "planned",
    release: "Next",
  },
  {
    number: 3,
    unit: "Models",
    title: "Draw a boundary",
    summary: "Move from predicting numbers to separating classes with one feature, then two.",
    status: "planned",
    release: "Planned",
  },
  {
    number: 4,
    unit: "Models",
    title: "Grow a decision tree",
    summary: "Split a dataset, route each example, and watch a tree assemble one rule at a time.",
    status: "planned",
    release: "Planned",
  },
  {
    number: 5,
    unit: "Generalization",
    title: "Test what it learned",
    summary: "Separate training from testing and catch a model that memorizes instead of learning.",
    status: "planned",
    release: "Planned",
  },
  {
    number: 6,
    unit: "Generalization",
    title: "Balance bias and variance",
    summary: "Change the data, compare the models, and make the tradeoff visible before naming it.",
    status: "planned",
    release: "Planned",
  },
  {
    number: 7,
    unit: "Models",
    title: "Let models vote",
    summary: "Combine unstable trees into a steadier random forest through sampling and voting.",
    status: "planned",
    release: "Planned",
  },
  {
    number: 8,
    unit: "Practice",
    title: "Evaluate the whole system",
    summary: "Work with thresholds, class imbalance, confusion matrices, and biased data.",
    status: "planned",
    release: "Planned",
  },
];
