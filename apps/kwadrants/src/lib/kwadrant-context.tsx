import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { z } from "zod";

import type {
  CanvasImage,
  GridType,
  KwadrantState,
  LabelValues,
  LayoutLabels,
  LayoutType,
  QuadrantColors,
  Tag,
  ThemeType,
} from "./types";
import { DEFAULT_LAYOUT_LABELS, DEFAULT_QUADRANT_COLORS, STORAGE_KEY } from "./constants";
import { generateId } from "./utils";

interface KwadrantContextValue {
  state: KwadrantState;
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTagPosition: (id: string, x: number, y: number) => void;
  removeTag: (id: string) => void;
  addImage: (image: Omit<CanvasImage, "id">) => void;
  updateImagePosition: (id: string, x: number, y: number) => void;
  updateImageSize: (id: string, width: number, height: number) => void;
  removeImage: (id: string) => void;
  updateLabel: (layoutId: string, key: string, value: string) => void;
  setQuadrantColor: (quadrant: keyof QuadrantColors, color: string) => void;
  setGridType: (gridType: GridType) => void;
  setLayoutType: (layoutType: LayoutType) => void;
  setTheme: (theme: ThemeType) => void;
}

const KwadrantContext = createContext<KwadrantContextValue | null>(null);

const labelsSchema = z.record(z.string(), z.string());

const storedSchema = z.object({
  axisLabels: labelsSchema.optional().catch(undefined),
  edgeLabels: labelsSchema.optional().catch(undefined),
  gridType: z.enum(["none", "squares", "dots"]).catch("none"),
  images: z
    .array(
      z.object({
        height: z.number(),
        id: z.string(),
        src: z.string(),
        width: z.number(),
        x: z.number(),
        y: z.number(),
      }),
    )
    .catch([]),
  layoutLabels: z.record(z.string(), labelsSchema).optional().catch(undefined),
  layoutType: z.enum(["axis", "edge"]).catch("axis"),
  quadrantColors: z
    .object({
      bottomLeft: z.string(),
      bottomRight: z.string(),
      topLeft: z.string(),
      topRight: z.string(),
    })
    .catch(DEFAULT_QUADRANT_COLORS),
  tags: z
    .array(
      z.object({
        color: z.string(),
        id: z.string(),
        text: z.string(),
        x: z.number(),
        y: z.number(),
      }),
    )
    .catch([]),
  theme: z.enum(["light", "dark"]).catch("light"),
});

const migrateLabels = (
  axisLabels: LabelValues | undefined,
  edgeLabels: LabelValues | undefined,
) => {
  const layoutLabels: LayoutLabels = { ...DEFAULT_LAYOUT_LABELS };

  if (axisLabels !== undefined && Object.keys(axisLabels).length > 0) {
    layoutLabels.axis = { ...DEFAULT_LAYOUT_LABELS.axis, ...axisLabels };
  }

  if (edgeLabels !== undefined && Object.keys(edgeLabels).length > 0) {
    layoutLabels.edge = { ...DEFAULT_LAYOUT_LABELS.edge, ...edgeLabels };
  }

  return layoutLabels;
};

const getInitialState = () => {
  const defaultState: KwadrantState = {
    gridType: "none",
    images: [],
    layoutLabels: DEFAULT_LAYOUT_LABELS,
    layoutType: "axis",
    quadrantColors: DEFAULT_QUADRANT_COLORS,
    tags: [],
    theme: "light",
  };

  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === null || stored === "") {
      return defaultState;
    }

    const parsed = storedSchema.safeParse(JSON.parse(stored));

    if (!parsed.success) {
      return defaultState;
    }

    const { axisLabels, edgeLabels, layoutLabels, ...rest } = parsed.data;

    return {
      ...rest,
      layoutLabels: layoutLabels ?? migrateLabels(axisLabels, edgeLabels),
    } satisfies KwadrantState;
  } catch {
    return defaultState;
  }
};

export const KwadrantProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<KwadrantState>(getInitialState);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [state]);

  const addTag = useCallback((tag: Omit<Tag, "id">) => {
    setState((prev) => ({
      ...prev,
      tags: [...prev.tags, { ...tag, id: generateId() }],
    }));
  }, []);

  const updateTagPosition = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) => (tag.id === id ? { ...tag, x, y } : tag)),
    }));
  }, []);

  const removeTag = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.id !== id),
    }));
  }, []);

  const addImage = useCallback((image: Omit<CanvasImage, "id">) => {
    setState((prev) => ({
      ...prev,
      images: [...prev.images, { ...image, id: generateId() }],
    }));
  }, []);

  const updateImagePosition = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
    }));
  }, []);

  const updateImageSize = useCallback((id: string, width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === id ? { ...img, height, width } : img)),
    }));
  }, []);

  const removeImage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id),
    }));
  }, []);

  const updateLabel = useCallback((layoutId: string, key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      layoutLabels: {
        ...prev.layoutLabels,
        [layoutId]: {
          ...prev.layoutLabels[layoutId],
          [key]: value,
        },
      },
    }));
  }, []);

  const setQuadrantColor = useCallback((quadrant: keyof QuadrantColors, color: string) => {
    setState((prev) => ({
      ...prev,
      quadrantColors: { ...prev.quadrantColors, [quadrant]: color },
    }));
  }, []);

  const setGridType = useCallback((gridType: GridType) => {
    setState((prev) => ({ ...prev, gridType }));
  }, []);

  const setLayoutType = useCallback((layoutType: LayoutType) => {
    setState((prev) => ({ ...prev, layoutType }));
  }, []);

  const setTheme = useCallback((theme: ThemeType) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const value = useMemo<KwadrantContextValue>(
    () => ({
      addImage,
      addTag,
      removeImage,
      removeTag,
      setGridType,
      setLayoutType,
      setQuadrantColor,
      setTheme,
      state,
      updateImagePosition,
      updateImageSize,
      updateLabel,
      updateTagPosition,
    }),
    [
      state,
      addTag,
      updateTagPosition,
      removeTag,
      addImage,
      updateImagePosition,
      updateImageSize,
      removeImage,
      updateLabel,
      setQuadrantColor,
      setGridType,
      setLayoutType,
      setTheme,
    ],
  );

  return <KwadrantContext.Provider value={value}>{children}</KwadrantContext.Provider>;
};

export const useKwadrant = () => {
  const context = useContext(KwadrantContext);

  if (!context) {
    throw new Error("useKwadrant must be used within a KwadrantProvider");
  }

  return context;
};
