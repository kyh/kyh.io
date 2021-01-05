import anime from "animejs";

export function createDOMEl(type, className, content) {
  const el = document.createElement(type);
  el.className = className || "";
  el.innerHTML = content || "";
  return el;
}

export function createRevealConfig(delay = 0) {
  return {
    revealSettings: {
      bgcolor: "#a1aeb7",
      easing: "easeOutExpo",
      direction: "lr",
      delay,
      onStart($el) {
        anime.remove($el);
        $el.classList.add("opacity-0");
      },
      onCover($el) {
        anime({
          targets: $el,
          duration: 800,
          delay: 80,
          easing: "easeOutExpo",
          translateX: [-40, 0],
          opacity: [0, 1],
        });
      },
    },
  };
}

export function $(qs) {
  const elements = document.querySelectorAll(qs);
  if (elements.length === 1) return elements[0];
  return elements;
}

let fadedContent = null;
export function getFadedContent() {
  if (!fadedContent) {
    fadedContent = $(".faded-content");
  }
  return fadedContent;
}

export function isLargeScreen() {
  return window.innerWidth >= 750;
}
