import tippy from "tippy.js";
import AnimatedShape from "./services/shapes";
import { isLargeScreen } from "./services/util";

const tooltipImageMap = {
  amazon: {
    image: require("url:./assets/screenshots/amazon.png"),
    imageW: require("url:./assets/screenshots/amazon.webp"),
  },
  slyce: {
    image: require("url:./assets/screenshots/slyce.png"),
    imageW: require("url:./assets/screenshots/slyce.webp"),
  },
  tinyrx: {
    image: require("url:./assets/screenshots/tinyrx.png"),
    imageW: require("url:./assets/screenshots/tinyrx.webp"),
  },
  cardiogram: {
    image: require("url:./assets/screenshots/cardiogram.png"),
    imageW: require("url:./assets/screenshots/cardiogram.webp"),
  },
  atrium: {
    image: require("url:./assets/screenshots/atrium.png"),
    imageW: require("url:./assets/screenshots/atrium.webp"),
  },
  tedxuoft: {
    image: require("url:./assets/screenshots/tedxuoft.png"),
    imageW: require("url:./assets/screenshots/tedxuoft.webp"),
  },
  tedxtoronto: {
    image: require("url:./assets/screenshots/tedxtoronto.png"),
    imageW: require("url:./assets/screenshots/tedxtoronto.webp"),
  },
  vw: {
    image: require("url:./assets/screenshots/vw.png"),
    imageW: require("url:./assets/screenshots/vw.webp"),
  },
  ing: {
    image: require("url:./assets/screenshots/ing.png"),
    imageW: require("url:./assets/screenshots/ing.webp"),
  },
  fb: {
    image: require("url:./assets/screenshots/fb.png"),
    imageW: require("url:./assets/screenshots/fb.webp"),
  },
  bootstrap: {
    image: require("url:./assets/screenshots/bootstrap.png"),
    imageW: require("url:./assets/screenshots/bootstrap.webp"),
  },
  keiko: {
    image: require("url:./assets/screenshots/keiko.png"),
    imageW: require("url:./assets/screenshots/keiko.webp"),
  },
  apps: {
    uicapsule: {
      href: "https://uicapsule.com",
      image: require("url:./assets/screenshots/uicapsule.png"),
      imageW: require("url:./assets/screenshots/uicapsule.webp"),
    },
    yourssincerely: {
      href: "https://yourssincerely.org",
      image: require("url:./assets/screenshots/ys.png"),
      imageW: require("url:./assets/screenshots/ys.webp"),
    },
    covid19: {
      href: "https://covid-19.kyh.io",
      image: require("url:./assets/screenshots/covid19.png"),
      imageW: require("url:./assets/screenshots/covid19.webp"),
    },
    art: {
      href: "https://artnotart.art",
      image: require("url:./assets/screenshots/art.png"),
      imageW: require("url:./assets/screenshots/art.webp"),
    },
  },
  playhouse: {
    image: require("url:./assets/screenshots/playhouse.png"),
    imageW: require("url:./assets/screenshots/playhouse.webp"),
  },
};

function createTooltip(name, href, { image, imageW }) {
  return `<a href="${href}" target="_blank" rel="noreferrer noopener"><picture><source srcset="${imageW}" type="image/webp"><source srcset="${image}" type="image/png"><img src="${image}" alt="${name}" width="320" height="240"></picture></a>`;
}

function ready(fn) {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

const icosahedron = new AnimatedShape("shape-icosahedron");

ready(() => {
  const target = isLargeScreen() ? ".reveal-content" : ".faded-content";
  tippy(`${target} [data-tooltip]`, {
    appendTo: () => document.body,
    content: (reference) => {
      const name = reference.getAttribute("data-tooltip");
      const href = reference.getAttribute("href");
      const map = tooltipImageMap[name];

      if (map.image) {
        return createTooltip(name, href, map);
      } else {
        const names = Object.keys(map);
        const html = names.map((name) =>
          createTooltip(name, map[name].href, map[name])
        );
        return `<div class="tooltip-multi">${html.join("")}</div>`;
      }
    },
    animation: "shift-away-subtle",
    maxWidth: "none",
    allowHTML: true,
    arrow: false,
    interactive: true,
    delay: 200,
  });

  icosahedron.init();
});
