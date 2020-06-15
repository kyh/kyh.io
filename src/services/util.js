// Helper vars and functions.
export function extend(a, b) {
  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      a[key] = b[key];
    }
  }
  return a;
}

export function createDOMEl(type, className, content) {
  const el = document.createElement(type);
  el.className = className || '';
  el.innerHTML = content || '';
  return el;
}
