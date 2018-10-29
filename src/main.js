import anime from 'animejs';
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
    title: 2000,
    content: 2300,
  },
  other: {
    title: 3000,
    content: 3300,
  },
  details: {
    content: 4300,
  },
  contact: {
    content: 5000,
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
  createRevealConfig(animationDelays.intro.title),
).reveal();
new SentenceFx(
  $('.intro .content-line'),
  animationDelays.intro.content,
).reveal();

new RevealFx(
  $('.cardiogram h3'),
  createRevealConfig(animationDelays.cardiogram.title),
).reveal();
new SentenceFx(
  $('.cardiogram .content-line'),
  animationDelays.cardiogram.content,
).reveal();

new RevealFx(
  $('.other h3'),
  createRevealConfig(animationDelays.other.title),
).reveal();
new SentenceFx(
  $('.other .content-line'),
  animationDelays.other.content,
).reveal();
new SentenceFx(
  $('.details .content-line'),
  animationDelays.details.content,
).reveal();
new SentenceFx(
  $('.contact .content-line'),
  animationDelays.contact.content,
).reveal();
