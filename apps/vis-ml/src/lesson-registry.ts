import type { ComponentType } from "react";

import type { AvailableLessonSlug } from "./curriculum";
import { PredictionLesson } from "./lessons/prediction/lesson";

export const lessonPages = {
  prediction: PredictionLesson,
} satisfies Record<AvailableLessonSlug, ComponentType>;
