import { useId } from "react";

/** An id for an <svg>'s defs, one per instance: useId's punctuation isn't safe inside url(#…). */
export const useSvgId = (prefix: string) => `${prefix}-${useId().replaceAll(/[^\w-]/gu, "")}`;
