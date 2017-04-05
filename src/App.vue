<template>
<main id="app" class="scene">
  <section class="content-wrapper">
    <section class="content">
      <Logo />

      <h1 class="content-title">Hello there,</h1>
      <section class="content-section">
        My name is Kaiyu (you can call me Kai) and I type things to make
        programs go. I hold a B.Sc. from the University of Toronto
        where I studied design and cognitive psychology, but on a day to
        day basis, I’m a Design Engineer at Cardiogram.
      </section>

      <section class="content-section">
        <header class="content-header">
          <h3>Cardiogram</h3>
        </header>
        We're an AI <ViewButton link="https://techcrunch.com/2016/10/20/cardiogram-raises-2-million-to-predict-heart-health-issues-using-wearbles/" title="startup" /> that uses heart rate data to <ViewButton link="https://blog.cardiogr.am/what-do-normal-and-abnormal-heart-rhythms-look-like-on-apple-watch-7b33b4a8ecfa" title="predict" /> and <ViewButton link="https://itunes.apple.com/us/app/cardiogram/id1000017994?ls=1&mt=8" title="prevent" /> heart disease. My time is split between building out new features, designing user-driven experiences, and debating healthcare reform.
      </section>

      <section class="content-section">
        <header class="content-header">
          <h3>Slyce</h3>
        </header>
        Before that I was the third engineer hire at Slyce. The team grew
        to over 100 employees and eventually went public. I led the front
        end team there and worked on a wide variety of projects ranging
        from <ViewButton link="http://craves.io/" title="product" />, <ViewButton link="https://dribbble.com/shots/2763799-Slyce-Developer-Portal" title="SDKs" />, internal tools, to powerful data analysis apps.
      </section>

      <section class="content-section">
        <header class="content-header">
          <h3>Once upon a time</h3>
        </header>
        I helped start <ViewButton link="http://kyh.io/TEDxUofT/" title="TEDxUofT" /> as their Creative Director and eventually
        went on to join the <ViewButton link="http://www.tedxtoronto.com/" title="TEDxToronto" /> team. I also had a short lived
        career in advertising as an Art Director for brands such as <ViewButton link="http://www.nissan.ca" title="Nissan" />
        and <ViewButton link="https://www.bloomberg.com/news/articles/2013-11-05/scotiabank-rebrands-ing-direct-as-tangerine" title="ING Direct" />.
      </section>

      <section class="content-section">
        You'll occasionally find me dabbling in the open source world,
        contributing to <ViewButton link="https://github.com/facebook/react" title="Facebook" /> projects, <ViewButton link="https://github.com/angular-ui/bootstrap" title="Bootstrap" />, and <ViewButton link="https://en.wikipedia.org/wiki/User:Tehkaiyu" title="Wikipedia" />.
        I sometimes <ViewButton link="https://itunes.apple.com/US/app/id1209391711" title="draw things" /> when I’m bored, but spend most
        of my days <ViewButton link="http://itsbananas.club/" title="procrastinating" />.
      </section>

      <section class="content-section">
        I’d love to see your beautiful face, so feel free to reach out if you’re
        in the Bay Area. If you're elsewhere, I'd still love to hear from you!
        Shoot me a message on LinkedIn or just tweet at me.
      </section>

      <Social />
    </section>
  </section>

  <ImageLoader
    class="fg"
    url="/static/images/fg.png"
  />
</main>
</template>

<script>
import anime from 'animejs';
import Logo from './components/Logo';
import ViewButton from './components/ViewButton';
import Social from './components/Social';
import ImageLoader from './components/ImageLoader';
import RevealFx from './services/reveal';

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

function $(qs) {
  return document.querySelector(qs);
}

export default {
  name: 'app',
  data: () => ({ currentView: null }),
  components: {
    ViewButton,
    Social,
    Logo,
    ImageLoader,
    // Projects
    // Cardiogram:
    // Slyce:
    // product: () => import('./projects/slyce/product'),
    // sdks: () => import('./projects/slyce/sdks'),
    // Other:
    // TEDxUofT: () => import('./projects/other/TEDxUofT'),
  },
  mounted: () => {
    // Create reveal elements
    const $title = new RevealFx($('.content-title'), createRevealConfig());

    // Animate content in
    anime({
      targets: $('.content-wrapper'),
      width: 640,
      duration: 1300,
      easing: 'easeInOutQuart',
      complete: () => {
        $title.reveal();
      },
    });
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
  width: 0;
  overflow: hidden;
}

.content {
  padding: 120px 60px 70px 100px;
  /* box-shadow: 0 3px 10px rgba(50,50,93,.11), 0 1px 2px rgba(0,0,0,.08); */
}

.content-title {
  display: inline-block;
  padding-right: 20px;
}

.content-section {
  margin-bottom: 3rem;
  line-height: 2;
  /*opacity: 0;*/
}

.content-header > h3 {
  display: inline-block;
  margin-bottom: 1rem;
}

.content-section span {
  display: inline-block;
  white-space: nowrap;
  margin-bottom: 5px;
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

.fg {
  pointer-events: none;
  position: absolute;
  bottom: 0;
  left: -50px;
  right: -50px;
}

@media (max-width: 500px) {
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
