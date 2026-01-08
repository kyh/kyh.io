import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Tag, CanvasImage, AxisLabels, QuadrantColors, GridType, LayoutType, ThemeType, KwadrantState } from "./types";
import {
  DEFAULT_AXIS_LABELS,
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
  updateAxisLabel: (key: keyof AxisLabels, value: string) => void;
  setQuadrantColor: (quadrant: keyof QuadrantColors, color: string) => void;
  setGridType: (gridType: GridType) => void;
  setLayoutType: (layoutType: LayoutType) => void;
  setTheme: (theme: ThemeType) => void;
}

const KwadrantContext = createContext<KwadrantContextValue | null>(null);

const getInitialState = (): KwadrantState => {
  if (typeof window === "undefined") {
    return {
      tags: [],
      images: [],
      axisLabels: DEFAULT_AXIS_LABELS,
      quadrantColors: DEFAULT_QUADRANT_COLORS,
      gridType: "none",
      layoutType: "axis",
      theme: "light",
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old layout values
      let layoutType = parsed.layoutType || "axis";
      if (layoutType === "fullscreen") layoutType = "axis";
      if (layoutType === "centered") layoutType = "edge";
      return {
        tags: parsed.tags || [],
        images: parsed.images || [],
        axisLabels: parsed.axisLabels || DEFAULT_AXIS_LABELS,
        quadrantColors: parsed.quadrantColors || DEFAULT_QUADRANT_COLORS,
        gridType: parsed.gridType || "none",
        layoutType,
        theme: parsed.theme || "light",
      };
    }
  } catch {
    // Ignore parse errors
  }

  return {
    tags: [],
    images: [],
    axisLabels: DEFAULT_AXIS_LABELS,
    quadrantColors: DEFAULT_QUADRANT_COLORS,
    gridType: "none",
    layoutType: "axis",
    theme: "light",
  };
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

  const updateAxisLabel = useCallback(
    (key: keyof AxisLabels, value: string) => {
      setState((prev) => ({
        ...prev,
        axisLabels: { ...prev.axisLabels, [key]: value },
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
        updateAxisLabel,
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
