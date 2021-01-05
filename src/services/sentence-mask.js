import anime from "animejs";
import { createDOMEl, isLargeScreen } from "./util";

function hideElements(elements) {
  elements.forEach((el) => {
    el.style.visibility = "hidden";
    el.setAttribute("aria-hidden", "true");
  });
}

class SentenceFx {
  constructor(sentencesElement, parentClassName, delay = 0) {
    this.sentencesElement = [...sentencesElement];
    this.sentencesContainer = this.findParent(
      parentClassName,
      sentencesElement[0].parentNode
    );
    this.delay = delay;
    this.init();
  }

  findParent(className, $el) {
    if (!$el || $el.classList.contains(className)) return $el;
    return this.findParent(className, $el.parentNode);
  }

  init() {
    this.sentencesContainer.style.opacity = 0;
    this.sentencesContainer.style.transform = "translateX(-30px)";
    this.layout();
  }

  /**
   * Build the necessary structure.
   */
  layout() {
    this.sentencesElement = this.sentencesElement.map((sEl) => {
      const revealer = createDOMEl("span", "reveal-content", sEl.innerHTML);
      const contentCopy = createDOMEl("span", "faded-content", sEl.innerHTML);
      sEl.innerHTML = "";
      sEl.appendChild(contentCopy);
      sEl.appendChild(revealer);
      return { container: sEl, revealer, contentCopy };
    });

    this.targets = this.sentencesElement.map((sEl) => sEl.revealer);
    this.content = this.sentencesElement.map((sEl) => sEl.contentCopy);
  }

  reveal(delay) {
    const wait = delay || this.delay;
    const totalWait = 500 + wait;
    anime({
      targets: this.sentencesContainer,
      translateX: 0,
      opacity: 1,
      duration: 500,
      delay: wait,
      easing: "linear",
    });
    if (isLargeScreen()) {
      anime({
        targets: this.targets,
        width: "100%",
        delay: (el, i) => totalWait + i * 300,
        easing: "easeInOutQuart",
        complete: () => hideElements(this.content),
      });
    } else {
      anime({
        targets: this.content,
        color: window.isDarkMode() ? "#d1d5db" : "#596677", // Why cant we use css variables here?
        delay: (el, i) => totalWait + i * 300,
        easing: "easeInOutQuart",
        complete: () => hideElements(this.targets),
      });
    }
  }
}

export default SentenceFx;
