<template>
<main id="app" class="scene">
  <section class="content-wrapper">
    <section class="content">
      <Logo />

      <h1 class="content-title">Hello there,</h1>
      <section class="content-section intro">
        <span class="content-line">My name is Kaiyu (you can call me Kai) and I type things to make </span>
        <span class="content-line">programs go. I hold a B.Sc. from the University of Toronto
        where I </span><span class="content-line">studied design and cognitive psychology, but on a day to
        day basis, </span><span class="content-line">I’m a Design Engineer at Cardiogram.</span>
      </section>

      <section class="content-section cardiogram">
        <header class="content-header">
          <h3>Cardiogram</h3>
        </header>
        <div>
          <span class="content-line">We're an AI <ViewButton link="https://techcrunch.com/2016/10/20/cardiogram-raises-2-million-to-predict-heart-health-issues-using-wearbles/" title="startup" /> that uses heart rate data to <ViewButton link="https://blog.cardiogr.am/what-do-normal-and-abnormal-heart-rhythms-look-like-on-apple-watch-7b33b4a8ecfa" title="predict" /> and <ViewButton link="https://itunes.apple.com/us/app/cardiogram/id1000017994?ls=1&mt=8" title="prevent" /> </span><span class="content-line">heart disease. My time is split between building out new features, </span><span class="content-line">designing user-driven experiences, and debating healthcare reform.</span>
        </div>
      </section>

      <section class="content-section slyce">
        <header class="content-header">
          <h3>Slyce</h3>
        </header>
        <div>
          <span class="content-line">Before that I was the third engineer hire at Slyce. The team grew
          to </span><span class="content-line">over 100 employees and eventually went public. I led the front
          end </span><span class="content-line">team there and worked on a wide variety of projects ranging
          from </span><span class="content-line"><ViewButton link="http://craves.io/" title="product" />, <ViewButton link="https://dribbble.com/shots/2763799-Slyce-Developer-Portal" title="SDKs" />, internal tools, to powerful data analysis apps.</span>
        </div>
      </section>

      <section class="content-section other">
        <header class="content-header">
          <h3>Once upon a time</h3>
        </header>
        <div>
          <span class="content-line">I helped start <ViewButton link="http://kyh.io/TEDxUofT/" title="TEDxUofT" /> as their Creative Director and eventually
          went </span><span class="content-line">on to join the <ViewButton link="http://www.tedxtoronto.com/" title="TEDxToronto" /> team. I also had a short lived
          career in </span><span class="content-line">advertising as an Art Director for brands such as <ViewButton link="http://www.nissan.ca" title="Nissan" />
          and </span><span class="content-line"><ViewButton link="https://www.bloomberg.com/news/articles/2013-11-05/scotiabank-rebrands-ing-direct-as-tangerine" title="ING Direct" />.</span>
        </div>
      </section>

      <section class="content-section details">
        <span class="content-line">You'll occasionally find me dabbling in the open source world,</span>
        <span class="content-line">contributing to <ViewButton link="https://github.com/facebook/react" title="Facebook" /> projects, <ViewButton link="https://github.com/angular-ui/bootstrap" title="Bootstrap" />, and <ViewButton link="https://en.wikipedia.org/wiki/User:Tehkaiyu" title="Wikipedia" />.
        I </span><span class="content-line">sometimes <ViewButton link="https://itunes.apple.com/US/app/id1209391711" title="draw things" /> when I’m bored, but spend most
        of my days </span><span class="content-line"><ViewButton link="http://itsbananas.club/" title="procrastinating" />.</span>
      </section>

      <section class="content-section">
        I’d love to see your beautiful face, so feel free to reach out if you’re
        in the Bay Area. If you're elsewhere, I'd still love to hear from you!
        Shoot me a message on LinkedIn or just tweet at me.
      </section>

      <Social />
    </section>
  </section>

  <footer class="footer">
    <Shape />
    <ImageLoader url="/static/images/fg.png" />
  </footer>

</main>
</template>

<script>
import anime from 'animejs';

import Logo from './components/Logo';
import ViewButton from './components/ViewButton';
import Social from './components/Social';
import ImageLoader from './components/ImageLoader';
import Shape from './components/Shape';

import RevealFx from './services/reveal';
import SentenceFx from './services/sentence-mask';

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
};

function $(qs) {
  const elements = document.querySelectorAll(qs);
  if (elements.length === 1) {
    return elements[0];
  }
  return elements;
}

export default {
  name: 'app',
  data: () => ({ currentView: null }),
  components: {
    ViewButton,
    Social,
    Logo,
    ImageLoader,
    Shape,
    // Projects
    // Cardiogram:
    // Slyce:
    // product: () => import('./projects/slyce/product'),
    // sdks: () => import('./projects/slyce/sdks'),
    // Other:
    // TEDxUofT: () => import('./projects/other/TEDxUofT'),
  },
  mounted: () => {
    // Animate content in
    anime({
      targets: $('.content-wrapper'),
      maxWidth: 640,
      duration: 1300,
      easing: 'easeInOutQuart',
    });

    // Create reveal elements
    new RevealFx(
      $('.content-title'),
      createRevealConfig(animationDelays.intro.title)
    ).reveal();
    new RevealFx(
      $('.cardiogram h3'),
      createRevealConfig(animationDelays.cardiogram.title)
    ).reveal();
    new RevealFx(
      $('.slyce h3'),
      createRevealConfig(animationDelays.slyce.title)
    ).reveal();
    new RevealFx(
      $('.other h3'),
      createRevealConfig(animationDelays.other.title)
    ).reveal();

    new SentenceFx($('.intro .content-line'))
      .reveal(animationDelays.intro.content);
    new SentenceFx($('.cardiogram .content-line'))
      .reveal(animationDelays.cardiogram.content);
    new SentenceFx($('.slyce .content-line'))
      .reveal(animationDelays.slyce.content);
    new SentenceFx($('.other .content-line'))
      .reveal(animationDelays.other.content);
    new SentenceFx($('.details .content-line'))
      .reveal(animationDelays.details.content);
  },
  methods: {
    toggleView(view) {
      this.currentView = view;
    },
  },
};
</script>

<style>
@font-face {
  font-family: 'Gilroy';
  src: url('/static/fonts/Gilroy-Regular.eot');
  src: url('/static/fonts/Gilroy-Regular.eot?#iefix') format('embedded-opentype'),
    url('/static/fonts/Gilroy-Regular.woff2') format('woff2'),
    url('/static/fonts/Gilroy-Regular.woff') format('woff'),
    url('/static/fonts/Gilroy-Regular.ttf') format('truetype'),
    url('/static/fonts/Gilroy-Regular.svg#Gilroy-Regular') format('svg');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Gilroy';
  src: url('/static/fonts/Gilroy-Medium.eot');
  src: url('/static/fonts/Gilroy-Medium.eot?#iefix') format('embedded-opentype'),
    url('/static/fonts/Gilroy-Medium.woff2') format('woff2'),
    url('/static/fonts/Gilroy-Medium.woff') format('woff'),
    url('/static/fonts/Gilroy-Medium.ttf') format('truetype'),
    url('/static/fonts/Gilroy-Medium.svg#Gilroy-Medium') format('svg');
  font-weight: 500;
  font-style: normal;
}

/*
  BASE
  ========
  html is set to 62.5% so that all the REM measurements are based on 10px sizing.
  So basically 1.5rem = 15px :)
*/
html {
  font-size: 62.5%;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

body {
  color: #68788c;
  font-family: 'Gilroy', 'Helvetica', sans-serif;
  font-size: 1.5rem;
  line-height: 1.6;
  background: linear-gradient(0deg, #fff, #f6f8fd 80%) fixed;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

*, *:before, *:after {
  box-sizing: inherit;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 2.5rem;
  white-space: nowrap;
}

h1 { line-height: 1.2; font-size: 4.0rem;  }
h2 { line-height: 1.25; font-size: 2.6rem; }
h3 { line-height: 1.3; font-size: 2.0rem;  }
h4 { line-height: 1.35; font-size: 1.6rem; }
h5 { line-height: 1.5; font-size: 1.4rem;  }
h6 { line-height: 1.6; font-size: 1.2rem;  }

p {
  margin-top: 0;
}

figure {
  margin: 0;
}

img {
  max-width: 100%;
}

/*
  PAGE
  ========
*/

.scene {
  position: relative;
  display: flex;
  padding: 30px 65px;
}

.content-wrapper {
  position: relative;
  background: #fff;
  max-width: 0;
  overflow: hidden;
}

.content {
  padding: 120px 60px 70px 100px;
}

.content-title {
  display: inline-block;
  padding-right: 20px;
}

.content-section {
  margin-bottom: 3rem;
  line-height: 2;
}

.content-header > h3 {
  display: inline-block;
  margin-bottom: 1rem;
}

.content-line {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}

.faded__content {
  color: #cdd2d6;
}

.reveal__content {
  position: absolute;
  overflow: hidden;
  left: 0;
  width: 0;
}

.block-revealer__element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  pointer-events: none;
  opacity: 0;
}

.footer {
  pointer-events: none;
  position: absolute;
  bottom: 0;
  left: -50px;
  right: -50px;
}

@media (max-width: 750px) {
  .content-line {
    display: inline;
    white-space: normal;
  }
}

@media (max-width: 500px) {
  .content-wrapper {
    max-width: 100%;
  }
  .scene {
    padding: 0 0 90px;
  }
  .content {
    padding: 120px 40px 30px;
  }
  .fg {
    left: -20px;
    right: -20px;
  }
}
</style>
