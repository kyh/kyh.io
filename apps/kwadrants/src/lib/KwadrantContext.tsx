import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Tag, CanvasImage, QuadrantColors, GridType, LayoutType, ThemeType, KwadrantState, LayoutLabels } from "./types";
import {
  DEFAULT_LAYOUT_LABELS,
  DEFAULT_QUADRANT_COLORS,
  STORAGE_KEY,
} from "./constants";
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

// Migrate old localStorage format (axisLabels/edgeLabels) to new (layoutLabels)
const migrateState = (stored: Record<string, unknown>): Partial<KwadrantState> => {
  if (stored.layoutLabels) {
    return stored as Partial<KwadrantState>;
  }

  // Old format detected - migrate
  const layoutLabels: LayoutLabels = { ...DEFAULT_LAYOUT_LABELS };

  if (stored.axisLabels && typeof stored.axisLabels === "object") {
    layoutLabels.axis = { ...DEFAULT_LAYOUT_LABELS.axis, ...(stored.axisLabels as Record<string, string>) };
  }
  if (stored.edgeLabels && typeof stored.edgeLabels === "object") {
    layoutLabels.edge = { ...DEFAULT_LAYOUT_LABELS.edge, ...(stored.edgeLabels as Record<string, string>) };
  }

  const { axisLabels, edgeLabels, ...rest } = stored;
  return { ...rest, layoutLabels } as Partial<KwadrantState>;
};

const getInitialState = (): KwadrantState => {
  const defaultState: KwadrantState = {
    tags: [],
    images: [],
    layoutLabels: DEFAULT_LAYOUT_LABELS,
    quadrantColors: DEFAULT_QUADRANT_COLORS,
    gridType: "none",
    layoutType: "axis",
    theme: "light",
  };

  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = migrateState(JSON.parse(stored));
      return {
        tags: (parsed.tags as Tag[]) || [],
        images: (parsed.images as CanvasImage[]) || [],
        layoutLabels: parsed.layoutLabels || DEFAULT_LAYOUT_LABELS,
        quadrantColors: parsed.quadrantColors || DEFAULT_QUADRANT_COLORS,
        gridType: parsed.gridType || "none",
        layoutType: parsed.layoutType || "axis",
        theme: parsed.theme || "light",
      };
    }
  } catch {
    // Ignore parse errors
  }

  return defaultState;
};

export const KwadrantProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<KwadrantState>(getInitialState);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 300);
    return () => clearTimeout(timeoutId);
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
      images: prev.images.map((img) => (img.id === id ? { ...img, width, height } : img)),
    }));
  }, []);

  const removeImage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id),
    }));
  }, []);

  const updateLabel = useCallback(
    (layoutId: string, key: string, value: string) => {
      setState((prev) => ({
        ...prev,
        layoutLabels: {
          ...prev.layoutLabels,
          [layoutId]: {
            ...(prev.layoutLabels[layoutId] || {}),
            [key]: value,
          },
        },
      }));
    },
    []
  );

  const setQuadrantColor = useCallback(
    (quadrant: keyof QuadrantColors, color: string) => {
      setState((prev) => ({
        ...prev,
        quadrantColors: { ...prev.quadrantColors, [quadrant]: color },
      }));
    },
    []
  );

  const setGridType = useCallback((gridType: GridType) => {
    setState((prev) => ({ ...prev, gridType }));
  }, []);

  const setLayoutType = useCallback((layoutType: LayoutType) => {
    setState((prev) => ({ ...prev, layoutType }));
  }, []);

  const setTheme = useCallback((theme: ThemeType) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  return (
    <KwadrantContext.Provider
      value={{
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
      }}
    >
      {children}
    </KwadrantContext.Provider>
  );
};

export const useKwadrant = () => {
  const context = useContext(KwadrantContext);
  if (!context) {
    throw new Error("useKwadrant must be used within a KwadrantProvider");
  }
  return context;
};
