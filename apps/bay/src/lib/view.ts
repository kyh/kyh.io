// Where the viewer looks: the canvas point at the middle of the screen and how many screen
// pixels a canvas pixel takes. Pure, so panning, zooming and the address can be tested.

export interface View {
  x: number;
  y: number;
  zoom: number;
}
export interface Size {
  w: number;
  h: number;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_ZOOM = 2;

// the zoom that shows the whole painted map
export const fitZoom = (bounds: Rect, screen: Size) =>
  Math.min(screen.w / bounds.w, screen.h / bounds.h);

// zoomed out no further than the whole map, in no closer than MAX_ZOOM, and the middle kept
// over the map
export const clampView = (view: View, bounds: Rect, screen: Size): View => {
  const zoom = Math.min(MAX_ZOOM, Math.max(fitZoom(bounds, screen) * 0.9, view.zoom));
  return {
    x: Math.min(bounds.x + bounds.w, Math.max(bounds.x, view.x)),
    y: Math.min(bounds.y + bounds.h, Math.max(bounds.y, view.y)),
    zoom,
  };
};

export const toScreen = (view: View, screen: Size, x: number, y: number) => ({
  x: (x - view.x) * view.zoom + screen.w / 2,
  y: (y - view.y) * view.zoom + screen.h / 2,
});

export const toWorld = (view: View, screen: Size, sx: number, sy: number) => ({
  x: (sx - screen.w / 2) / view.zoom + view.x,
  y: (sy - screen.h / 2) / view.zoom + view.y,
});

// zoom by a factor about a screen point, which stays over the same place
export const zoomAt = (view: View, screen: Size, factor: number, sx: number, sy: number): View => {
  const zoom = view.zoom * factor;
  const at = toWorld(view, screen, sx, sy);
  return {
    x: at.x - (sx - screen.w / 2) / zoom,
    y: at.y - (sy - screen.h / 2) / zoom,
    zoom,
  };
};

// the canvas rectangle on screen
export const visibleRect = (view: View, screen: Size) => ({
  h: screen.h / view.zoom,
  w: screen.w / view.zoom,
  x: view.x - screen.w / 2 / view.zoom,
  y: view.y - screen.h / 2 / view.zoom,
});

// a shareable spot: #x,y,zoom
export const formatHash = (view: View) =>
  `#${Math.round(view.x)},${Math.round(view.y)},${view.zoom.toFixed(3)}`;

export const parseHash = (hash: string): View | null => {
  const parts = hash.replace(/^#/u, "").split(",").map(Number);
  const [x, y, zoom] = parts;
  if (parts.length !== 3 || x === undefined || y === undefined || zoom === undefined) {
    return null;
  }
  return [x, y, zoom].every(Number.isFinite) && zoom > 0 ? { x, y, zoom } : null;
};
