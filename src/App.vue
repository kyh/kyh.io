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
        We're an AI <ViewButton :currentView="currentView" :onClick="toggleView" title="startup" /> that uses heart rate data to <ViewButton :currentView="currentView" :onClick="toggleView" title="predict" /> and
        <ViewButton :currentView="currentView" :onClick="toggleView" title="prevent" /> heart disease. My time is split between building out new
        features, designing user-driven experiences, and debating
        healthcare reform.
      </section>

      <section class="content-section">
        <header class="content-header">
          <h3>Slyce</h3>
        </header>
        Before that I was the third engineer hire at Slyce. The team grew
        to over 100 employees and eventually went public. I led the front
        end team there and worked on a wide variety of projects ranging
        from <ViewButton :currentView="currentView" :onClick="toggleView" title="product" />, <ViewButton :currentView="currentView" :onClick="toggleView" title="SDKs" />, <ViewButton :currentView="currentView" :onClick="toggleView" title="internal tools" />, to powerful <ViewButton :currentView="currentView" :onClick="toggleView" title="data analysis" /> apps.
      </section>

      <section class="content-section">
        <header class="content-header">
          <h3>Once upon a time</h3>
        </header>
        I helped start <ViewButton :currentView="currentView" :onClick="toggleView" title="TEDxUofT" /> as their Creative Director and eventually
        went on to join the <ViewButton :currentView="currentView" :onClick="toggleView" title="TEDxToronto" /> team. I also had a short lived
        career in advertising as an Art Director for brands such as <ViewButton :currentView="currentView" :onClick="toggleView" title="Nissan" />
        and <ViewButton :currentView="currentView" :onClick="toggleView" title="ING Direct" />.
      </section>

      <section class="content-section">
        You'll occasionally find me dabbling in the open source world,
        contributing to <ViewButton :currentView="currentView" :onClick="toggleView" title="Facebook" /> projects, <ViewButton :currentView="currentView" :onClick="toggleView" title="Bootstrap" />, and <ViewButton :currentView="currentView" :onClick="toggleView" title="Wikipedia" />.
        I sometimes <ViewButton :currentView="currentView" :onClick="toggleView" title="draw things" /> when I’m bored, but spend most
        of my days <ViewButton :currentView="currentView" :onClick="toggleView" title="procrastinating" />.
      </section>

      <section class="content-section">
        I’d love to see your beautiful face, so feel free to reach out if you’re
        in the Bay Area. If you're elsewhere, I'd still love to hear from you!
        Shoot me a message on LinkedIn or just tweet at me.
      </section>

      <Social />
    </section>
  </section>
  <keep-alive>
    <component v-bind:is="currentView" />
  </keep-alive>
</main>
</template>

<script>
import anime from 'animejs';
import Logo from './components/Logo';
import ViewButton from './components/ViewButton';
import Social from './components/Social';
import { generateDefaultReveal } from './services/reveal';

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
    // Projects
    // Cardiogram:
    // Slyce:
    product: () => import('./projects/slyce/product'),
    sdks: () => import('./projects/slyce/sdks'),
    // Other:
    // TEDxUofT: () => import('./projects/other/TEDxUofT'),
  },
  mounted: () => {
    anime({
      targets: $('.content-wrapper'),
      width: '56%',
      duration: 1300,
      easing: 'easeInOutQuart',
      complete: () => {
        generateDefaultReveal($('.content-header h3'));
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
  background: #f9f9f9;
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

.content-section {
  margin-bottom: 3rem;
  line-height: 2;
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
</style>
