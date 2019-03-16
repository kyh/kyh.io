import anime from 'animejs';
import { createDOMEl } from './util';

/**
 * SentenceFx obj.
 */
function SentenceFx(sentencesElement, delay = 0) {
  this.sentencesElement = [...sentencesElement];
  this.sentencesContainer = sentencesElement[0].parentNode;
  this.delay = delay;
  this.init();
}

/**
 * Init.
 */
SentenceFx.prototype.init = function() {
  this.sentencesContainer.style.opacity = 0;
  this.sentencesContainer.style.transform = 'translateX(-30px)';
  this.layout();
};

/**
 * Build the necessary structure.
 */
SentenceFx.prototype.layout = function() {
  this.sentencesElement = this.sentencesElement.map((sEl) => {
    const revealer = createDOMEl('span', 'reveal__content', sEl.innerHTML);
    const contentCopy = createDOMEl('span', 'faded__content', sEl.innerHTML);
    sEl.innerHTML = '';
    sEl.appendChild(contentCopy);
    sEl.appendChild(revealer);
    return { container: sEl, revealer, contentCopy };
  });

  this.targets = this.sentencesElement.map((sEl) => sEl.revealer);
  this.content = this.sentencesElement.map((sEl) => sEl.contentCopy);
};

SentenceFx.prototype.reveal = function(delay) {
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
      delay: (el, i, l) => totalWait + i * 300,
      easing: 'easeInOutQuart',
    });
  } else {
    anime({
      targets: this.content,
      color: '#68788c',
      delay: (el, i, l) => totalWait + i * 300,
      easing: 'easeInOutQuart',
    });
  }
};

export default SentenceFx;
