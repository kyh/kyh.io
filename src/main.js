import "lazysizes";
import anime from "animejs";
import RevealFx from "./services/reveal";
import SentenceFx from "./services/sentence-mask";
import { $, createRevealConfig } from "./services/util";

const $links = $(".link");

$links.forEach(($link) => {
  $link.setAttribute("rel", "noreferrer noopener");
  $link.setAttribute("target", "_blank");
  $link.setAttribute("data-letters", $link.textContent);
});

const $content = $(".content-wrapper");
$content.style.width = 0;

// Animate content in
anime({
  targets: $content,
  width: 640,
  duration: 1300,
  easing: "easeInOutQuart",
});

const titleClass = "h3";
const contentClass = ".content-line";

const animationDelays = {
  ".content-title": 1000,
  ".content-subtitle": 1100,
  ".intro": {
    content: 1300,
  },
  ".history": {
    title: 2000,
    content: 2300,
  },
  ".highlights": {
    content: 3000,
  },
  ".before": {
    content: 3700,
  },
  ".details": {
    content: 4400,
  },
};

// Create reveal elements
Object.keys(animationDelays).forEach((animationKey) => {
  const animationDelay = animationDelays[animationKey];
  if (typeof animationDelay === "number") {
    const $el = $(animationKey);
    new RevealFx($el, createRevealConfig(animationDelay)).reveal();
  } else {
    const { title, content } = animationDelay;
    if (title) {
      const $el = $(`${animationKey} ${titleClass}`);
      new RevealFx($el, createRevealConfig(title)).reveal();
    }
    if (content) {
      const $el = $(`${animationKey} ${contentClass}`);
      new SentenceFx($el, "content-section", content).reveal();
    }
  }
});
