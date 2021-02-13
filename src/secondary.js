import tippy from "tippy.js";
import AnimatedShape from "./services/shapes";
import { isLargeScreen } from "./services/util";

const tooltipImageMap = {
  amazon: {
    image: require("./assets/screenshots/amazon.png"),
    imageW: require("./assets/screenshots/amazon.webp"),
  },
  slyce: {
    image: require("./assets/screenshots/slyce.png"),
    imageW: require("./assets/screenshots/slyce.webp"),
  },
  tinyrx: {
    image: require("./assets/screenshots/tinyrx.png"),
    imageW: require("./assets/screenshots/tinyrx.webp"),
  },
  cardiogram: {
    image: require("./assets/screenshots/cardiogram.png"),
    imageW: require("./assets/screenshots/cardiogram.webp"),
  },
  atrium: {
    image: require("./assets/screenshots/atrium.png"),
    imageW: require("./assets/screenshots/atrium.webp"),
  },
  tedxuoft: {
    image: require("./assets/screenshots/tedxuoft.png"),
    imageW: require("./assets/screenshots/tedxuoft.webp"),
  },
  tedxtoronto: {
    image: require("./assets/screenshots/tedxtoronto.png"),
    imageW: require("./assets/screenshots/tedxtoronto.webp"),
  },
  vw: {
    image: require("./assets/screenshots/vw.png"),
    imageW: require("./assets/screenshots/vw.webp"),
  },
  ing: {
    image: require("./assets/screenshots/ing.png"),
    imageW: require("./assets/screenshots/ing.webp"),
  },
  fb: {
    image: require("./assets/screenshots/fb.png"),
    imageW: require("./assets/screenshots/fb.webp"),
  },
  bootstrap: {
    image: require("./assets/screenshots/bootstrap.png"),
    imageW: require("./assets/screenshots/bootstrap.webp"),
  },
  keiko: {
    image: require("./assets/screenshots/keiko.png"),
    imageW: require("./assets/screenshots/keiko.webp"),
  },
  apps: {
    uicapsule: {
      href: "https://uicapsule.com",
      image: require("./assets/screenshots/uicapsule.png"),
      imageW: require("./assets/screenshots/uicapsule.webp"),
    },
    yourssincerely: {
      href: "https://yourssincerely.org",
      image: require("./assets/screenshots/ys.png"),
      imageW: require("./assets/screenshots/ys.webp"),
    },
    covid19: {
      href: "https://covid-19.kyh.io",
      image: require("./assets/screenshots/covid19.png"),
      imageW: require("./assets/screenshots/covid19.webp"),
    },
    stonks: {
      href: "https://stonks.shop",
      image: require("./assets/screenshots/stonks.png"),
      imageW: require("./assets/screenshots/stonks.webp"),
    },
  },
  playhouse: {
    image: require("./assets/screenshots/playhouse.png"),
    imageW: require("./assets/screenshots/playhouse.webp"),
  },
};

function createTooltip(name, href, { image, imageW }) {
  return `<a href="${href}" target="_blank" rel="noreferrer noopener"><picture><source srcset="${imageW}" type="image/webp"><source srcset="${image}" type="image/png"><img src="${image}" alt="${name}" width="320" height="240"></picture></a>`;
}

setTimeout(() => {
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
}, 50);

const icosahedron = new AnimatedShape("shape-icosahedron");
icosahedron.init();
