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

const tooltipMap = {
  amazon: `<picture><source srcset="${amazonImageW}" type="image/webp"><source srcset="${amazonImage}" type="image/png"><img src="${amazonImage}" alt="Amazon" width="320" height="240"></picture>`,
  slyce: `<picture><source srcset="${slyceImageW}" type="image/webp"><source srcset="${slyceImage}" type="image/png"><img src="${slyceImage}" alt="Slyce" width="320" height="240"></picture>`,
  tinyrx: `<picture><source srcset="${tinyrxImageW}" type="image/webp"><source srcset="${tinyrxImage}" type="image/png"><img src="${tinyrxImage}" alt="TinyRx" width="320" height="240"></picture>`,
  cardiogram: `<picture><source srcset="${cardiogramImageW}" type="image/webp"><source srcset="${cardiogramImage}" type="image/png"><img src="${cardiogramImage}" alt="Cardiogram" width="320" height="240"></picture>`,
  atrium: `<picture><source srcset="${atriumImageW}" type="image/webp"><source srcset="${atriumImage}" type="image/png"><img src="${atriumImage}" alt="Atrium" width="320" height="240"></picture>`,
  tedxuoft: `<picture><source srcset="${tedxuoftImageW}" type="image/webp"><source srcset="${tedxuoftImage}" type="image/png"><img src="${tedxuoftImage}" alt="TEDxUofT" width="320" height="240"></picture>`,
  tedxtoronto: `<picture><source srcset="${tedxtorontoImageW}" type="image/webp"><source srcset="${tedxtorontoImage}" type="image/png"><img src="${tedxtorontoImage}" alt="TEDxToronto" width="320" height="240"></picture>`,
  vw: `<picture><source srcset="${vwImageW}" type="image/webp"><source srcset="${vwImage}" type="image/png"><img src="${vwImage}" alt="Volkswagon" width="320" height="240"></picture>`,
  ing: `<picture><source srcset="${ingImageW}" type="image/webp"><source srcset="${ingImage}" type="image/png"><img src="${ingImage}" alt="ING" width="320" height="240"></picture>`,
  fb: `<picture><source srcset="${fbImageW}" type="image/webp"><source srcset="${fbImage}" type="image/png"><img src="${fbImage}" alt="React" width="320" height="240"></picture>`,
  bootstrap: `<picture><source srcset="${bootstrapImageW}" type="image/webp"><source srcset="${bootstrapImage}" type="image/png"><img src="${bootstrapImage}" alt="Bootstrap" width="320" height="240"></picture>`,
  keiko: `<picture><source srcset="${keikoImageW}" type="image/webp"><source srcset="${keikoImage}" type="image/png"><img src="${keikoImage}" alt="Keiko and Friends" width="320" height="240"></picture>`,
  apps: `<div class="tooltip-apps"><a href="https://yourssincerely.org"><picture><source srcset="${ysImageW}" type="image/webp"><source srcset="${ysImage}" type="image/png"><img src="${ysImage}" alt="Yours Sincerely" width="320" height="240"></picture></a><a href="https://covid-19.kyh.io"><picture><source srcset="${covid19ImageW}" type="image/webp"><source srcset="${covid19Image}" type="image/png"><img src="${covid19Image}" alt="Covid-19 Dashboard" width="320" height="240"></picture></a></div>`,
  playhouse: `<picture><source srcset="${playhouseImageW}" type="image/webp"><source srcset="${playhouseImage}" type="image/png"><img src="${playhouseImage}" alt="Playhouse" width="320" height="240"></picture>`,
};

setTimeout(() => {
  const target = isLargeScreen() ? ".reveal-content" : ".faded-content";
  tippy(`${target} [data-tooltip]`, {
    appendTo: () => document.body,
    content: (reference) => {
      const content = reference.getAttribute("data-tooltip");
      return tooltipMap[content] || "";
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
