// Where a pointer is on the page, in terms every visitor's screen agrees on.
// Every page is a column centred in the window, so a spot is pixels from the
// centre line and from the top of the document: the same word under it on any
// window width and any scroll. Fractions of the viewport point at different
// content as soon as two visitors scroll or size their windows differently.

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
export const toPage = (x: number, y: number, view: Viewport): PagePoint => ({
  fromCenter: Math.round(x + view.scrollX - view.width / 2),
  fromTop: Math.round(y + view.scrollY),
});

/** A spot on the page as a spot on this screen (client pixels). */
export const toScreen = (point: PagePoint, view: Viewport) => ({
  x: view.width / 2 + point.fromCenter - view.scrollX,
  y: point.fromTop - view.scrollY,
});

/** This window's viewport, read fresh. */
export const readViewport = (): Viewport => ({
  scrollX: window.scrollX,
  scrollY: window.scrollY,
  width: document.documentElement.clientWidth,
});
