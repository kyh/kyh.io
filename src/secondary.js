import tippy from "tippy.js";
import AnimatedShape from "./services/shapes";
import { isLargeScreen } from "./services/util";
import amazonImage from "./assets/screenshots/amazon.png";
import amazonImageW from "./assets/screenshots/amazon.webp";
import slyceImage from "./assets/screenshots/slyce.png";
import slyceImageW from "./assets/screenshots/slyce.webp";
import tinyrxImage from "./assets/screenshots/tinyrx.png";
import tinyrxImageW from "./assets/screenshots/tinyrx.webp";
import cardiogramImage from "./assets/screenshots/cardiogram.png";
import cardiogramImageW from "./assets/screenshots/cardiogram.webp";
import atriumImage from "./assets/screenshots/atrium.png";
import atriumImageW from "./assets/screenshots/atrium.webp";
import tedxuoftImage from "./assets/screenshots/tedxuoft.png";
import tedxuoftImageW from "./assets/screenshots/tedxuoft.webp";
import tedxtorontoImage from "./assets/screenshots/tedxtoronto.png";
import tedxtorontoImageW from "./assets/screenshots/tedxtoronto.webp";
import vwImage from "./assets/screenshots/vw.png";
import vwImageW from "./assets/screenshots/vw.webp";
import ingImage from "./assets/screenshots/ing.png";
import ingImageW from "./assets/screenshots/ing.webp";
import fbImage from "./assets/screenshots/fb.png";
import fbImageW from "./assets/screenshots/fb.webp";
import bootstrapImage from "./assets/screenshots/bootstrap.png";
import bootstrapImageW from "./assets/screenshots/bootstrap.webp";
import keikoImage from "./assets/screenshots/keiko.png";
import keikoImageW from "./assets/screenshots/keiko.webp";
import ysImage from "./assets/screenshots/ys.png";
import ysImageW from "./assets/screenshots/ys.webp";
import covid19Image from "./assets/screenshots/covid19.png";
import covid19ImageW from "./assets/screenshots/covid19.webp";
import playhouseImage from "./assets/screenshots/playhouse.png";
import playhouseImageW from "./assets/screenshots/playhouse.webp";

const tooltipImageMap = {
  amazon: {
    image: amazonImage,
    imageW: amazonImageW,
  },
  slyce: {
    image: slyceImage,
    imageW: slyceImageW,
  },
  tinyrx: {
    image: tinyrxImage,
    imageW: tinyrxImageW,
  },
  cardiogram: {
    image: cardiogramImage,
    imageW: cardiogramImageW,
  },
  atrium: {
    image: atriumImage,
    imageW: atriumImageW,
  },
  tedxuoft: {
    image: tedxuoftImage,
    imageW: tedxuoftImageW,
  },
  tedxtoronto: {
    image: tedxtorontoImage,
    imageW: tedxtorontoImageW,
  },
  vw: {
    image: vwImage,
    imageW: vwImageW,
  },
  ing: {
    image: ingImage,
    imageW: ingImageW,
  },
  fb: {
    image: fbImage,
    imageW: fbImageW,
  },
  bootstrap: {
    image: bootstrapImage,
    imageW: bootstrapImageW,
  },
  keiko: {
    image: keikoImage,
    imageW: keikoImageW,
  },
  apps: {
    ys: {
      href: "https://yourssincerely.org",
      image: ysImage,
      imageW: ysImageW,
    },
    covid19: {
      href: "https://covid-19.kyh.io",
      image: covid19Image,
      imageW: covid19ImageW,
    },
  },
  playhouse: {
    image: playhouseImage,
    imageW: playhouseImageW,
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
