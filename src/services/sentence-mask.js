import anime from 'animejs';
import { createDOMEl } from './util';

function onAnimationEnd(elements) {
  elements.forEach((el) => el.classList.add('visibility-hidden'));
}

class SentenceFx {
  constructor(sentencesElement, delay = 0) {
    this.sentencesElement = [...sentencesElement];
    this.sentencesContainer = sentencesElement[0].parentNode;
    this.delay = delay;
    this.init();
  }

  init() {
    this.sentencesContainer.style.opacity = 0;
    this.sentencesContainer.style.transform = 'translateX(-30px)';
    this.layout();
  }

  /**
   * Build the necessary structure.
   */
  layout() {
    this.sentencesElement = this.sentencesElement.map((sEl) => {
      const revealer = createDOMEl('span', 'reveal-content', sEl.innerHTML);
      const contentCopy = createDOMEl('span', 'faded-content', sEl.innerHTML);
      // eslint-disable-next-line no-param-reassign
      sEl.innerHTML = '';
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
      easing: 'linear',
    });
    if (window.innerWidth >= 750) {
      anime({
        targets: this.targets,
        width: '100%',
        delay: (el, i) => totalWait + i * 300,
        easing: 'easeInOutQuart',
        complete: onAnimationEnd.bind(this, this.content),
      });
    } else {
      anime({
        targets: this.content,
        color: '#68788c',
        delay: (el, i) => totalWait + i * 300,
        easing: 'easeInOutQuart',
        complete: onAnimationEnd.bind(this, this.targets),
      });
    }
  }
}

export default SentenceFx;
