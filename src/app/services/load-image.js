/**
 * Fetchs the image for the given URL
 * @param {string} url
 */
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.onload = resolve;
    image.onerror = reject;
  });
}

/**
 * Apply the image
 * @param {object} img
 * @param {string} src
 */
function applyImage(img, src) {
  // Prevent this from being lazy loaded a second time.
  img.classList.add('js-lazy-image--handled');
  img.src = src;
  img.classList.add('fade-in');
}

/**
 * Preloads the image
 * @param {object} image
 */
export function preloadImage(image) {
  const src = image.dataset.src;
  if (!src) return;
  return fetchImage(src).then(() => applyImage(image, src));
}
