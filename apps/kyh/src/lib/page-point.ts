export interface PagePoint {
  /** Pixels right of the page's centre line (negative is left). */
  fromCenter: number;
  /** Pixels down from the top of the document. */
  fromTop: number;
}

export interface Viewport {
  /** The layout width, scrollbar excluded: what the column centres in. */
  width: number;
  scrollX: number;
  scrollY: number;
}

/** A spot on screen (client pixels) as a spot on the page. */
export const toPage = (x: number, y: number, view: Viewport) =>
  ({
    fromCenter: Math.round(x + view.scrollX - view.width / 2),
    fromTop: Math.round(y + view.scrollY),
  }) satisfies PagePoint;

/** A spot on the page as a spot on this screen (client pixels). */
export const toScreen = (point: PagePoint, view: Viewport) => ({
  x: view.width / 2 + point.fromCenter - view.scrollX,
  y: point.fromTop - view.scrollY,
});

/** This window's viewport, read fresh. */
export const readViewport = () =>
  ({
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    width: document.documentElement.clientWidth,
  }) satisfies Viewport;
