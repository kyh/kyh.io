import './style.css';
import anime from 'animejs';
import scrollMonitor from 'scrollmonitor';

import RevealFx from './services/reveal';
import SentenceFx from './services/sentence-mask';
import AnimatedShape from './services/shapes';

const icosahedron = new AnimatedShape('shape-icosahedron', 'icosahedron', 3000);
icosahedron.init();

function createRevealConfig(delay = 0) {
  return {
    revealSettings: {
      bgcolor: '#a1aeb7',
      easing: 'easeOutExpo',
      direction: 'lr',
      delay,
      onStart(contentEl) {
        anime.remove(contentEl);
        contentEl.style.opacity = 0;
      },
      onCover(contentEl) {
        anime({
          targets: contentEl,
          duration: 800,
          delay: 80,
          easing: 'easeOutExpo',
          translateX: [-40, 0],
          opacity: [0, 1],
        });
      },
    },
  };
}

const animationDelays = {
  intro: {
    title: 1000,
    content: 1300,
  },
  cardiogram: {
    title: 3000,
    content: 3300,
  },
  slyce: {
    title: 5000,
    content: 5300,
  },
  other: {
    title: 7000,
    content: 7300,
  },
  details: {
    content: 8300,
  },
  contact: {
    content: 9000,
  },
};

function $(qs) {
  const elements = document.querySelectorAll(qs);
  if (elements.length === 1) {
    return elements[0];
  }
  return elements;
}

const $content = $('.content-wrapper');
$content.style.width = 0;

// Animate content in
anime({
  targets: $content,
  width: 640,
  duration: 1300,
  easing: 'easeInOutQuart',
});

// Create reveal elements
new RevealFx(
  $('.content-title'),
  createRevealConfig(animationDelays.intro.title)
).reveal();
new SentenceFx(
  $('.intro .content-line'),
  animationDelays.intro.content
).reveal();

new RevealFx(
  $('.cardiogram h3'),
  createRevealConfig(animationDelays.cardiogram.title)
).reveal();
new SentenceFx(
  $('.cardiogram .content-line'),
  animationDelays.cardiogram.content
).reveal();

new RevealFx(
  $('.slyce h3'),
  createRevealConfig(animationDelays.slyce.title)
).reveal();
new SentenceFx(
  $('.slyce .content-line'),
  animationDelays.slyce.content
).reveal();

// Other section
let isShown = false;
const $otherSectionTitle = $('.other h3');
const otherSectionMonitor = scrollMonitor.create($otherSectionTitle);
const otherSectionReveal = new RevealFx(
  $otherSectionTitle,
  createRevealConfig()
);

otherSectionMonitor.enterViewport(() => {
  if (!isShown) {
    otherSectionReveal.reveal();
    new SentenceFx($('.other .content-line')).reveal(300);
    new SentenceFx($('.details .content-line')).reveal(1300);
    new SentenceFx($('.contact .content-line')).reveal(2300);
    isShown = true;
  }
});

