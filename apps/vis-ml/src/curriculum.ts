type LessonCore = {
  number: number;
  unit: "Foundations" | "Models" | "Generalization" | "Practice";
  title: string;
  summary: string;
};

type LessonPage = {
  title: string;
  description: string;
};

export type AvailableLessonDefinition = LessonCore & {
  status: "available";
  slug: string;
  duration: string;
  page: LessonPage;
};

export type PlannedLessonDefinition = LessonCore & {
  status: "planned";
  release: "Next" | "Planned";
};

export type CurriculumLessonDefinition = AvailableLessonDefinition | PlannedLessonDefinition;

function defineCurriculum<
  const Lessons extends readonly [AvailableLessonDefinition, ...CurriculumLessonDefinition[]],
>(lessons: Lessons): Lessons {
  return lessons;
}

export const curriculum = defineCurriculum([
  {
    number: 1,
    unit: "Foundations",
    title: "Make a prediction",
    summary: "Turn one input into an output, then measure how wrong your first rule is.",
    status: "available",
    slug: "prediction",
    duration: "8 min",
    page: {
      title: "Visual ML | Linear Regression",
      description:
        "A visual introduction to linear regression, prediction error, weight, bias, and training.",
    },
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
]);

export type AvailableLesson = Extract<(typeof curriculum)[number], { status: "available" }>;
export type AvailableLessonSlug = AvailableLesson["slug"];

export const defaultLesson: AvailableLesson = curriculum[0];

function isAvailableLesson(lesson: (typeof curriculum)[number]): lesson is AvailableLesson {
  return lesson.status === "available";
}

export const availableLessons: readonly AvailableLesson[] = curriculum.filter(isAvailableLesson);

export function lessonPath(slug: AvailableLessonSlug): `/lessons/${AvailableLessonSlug}` {
  return `/lessons/${slug}`;
}
