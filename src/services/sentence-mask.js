import anime from 'animejs';
import { createDOMEl } from './util';

/**
 * SentenceFx obj.
 */
function SentenceFx(sentencesElement) {
  this.sentencesElement = [...sentencesElement];
  this.sentencesContainer = sentencesElement[0].parentNode;
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
};

SentenceFx.prototype.reveal = function(delay) {
  const totalDelay = 500 + delay;
  anime({
    targets: this.sentencesContainer,
    translateX: 0,
    opacity: 1,
    duration: 500,
    delay,
    easing: 'linear',
  });
  anime({
    targets: this.targets,
    width: '100%',
    delay: (el, i, l) => totalDelay + (i * 300),
    easing: 'easeInOutQuart',
  });
};

export default SentenceFx;
