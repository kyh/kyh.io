<template>
<main id="app" class="scene">
  <section class="content">
    <Logo />

    <h1>Hello there,</h1>
    <section class="content-section">
      <span>My name is Kaiyu (you can call me Kai) and I type things to make</span>
      <span>programs go. I hold a B.Sc. from the University of Toronto</span>
      <span>where I studied design and cognitive psychology, but on a day to</span>
      <span>day basis, I’m a Design Engineer at Cardiogram.</span>
    </section>

    <section class="content-section">
      <header class="content-header">
        <h3>Cardiogram</h3>
      </header>
      <span>We're an AI <ViewButton :currentView="currentView" :onClick="toggleView" title="startup" /> that uses heart rate data to <ViewButton :currentView="currentView" :onClick="toggleView" title="predict" /> and</span>
      <span><ViewButton :currentView="currentView" :onClick="toggleView" title="prevent" /> heart disease. My time is split between building out new</span>
      <span>features, designing user-driven experiences, and debating</span>
      <span>healthcare reform.</span>
    </section>

    <section class="content-section">
      <header class="content-header">
        <h3>Slyce</h3>
      </header>
      <span>Before that I was the third engineer hire at Slyce. The team grew</span>
      <span>to over 100 employees and eventually went public. I led the front</span>
      <span>end team there and worked on a wide variety of projects ranging</span>
      <span>from <ViewButton :currentView="currentView" :onClick="toggleView" title="product" />, <ViewButton :currentView="currentView" :onClick="toggleView" title="SDKs" />, <ViewButton :currentView="currentView" :onClick="toggleView" title="internal tools" />, to powerful <ViewButton :currentView="currentView" :onClick="toggleView" title="data analysis" /> apps.</span>
    </section>

    <section class="content-section">
      <header class="content-header">
        <h3>Once upon a time</h3>
      </header>
      <span>I helped start <ViewButton :currentView="currentView" :onClick="toggleView" title="TEDxUofT" /> as their Creative Director and eventually</span>
      <span>went on to join the <ViewButton :currentView="currentView" :onClick="toggleView" title="TEDxToronto" /> team. I also had a short lived</span>
      <span>career in advertising as an Art Director for brands such as <ViewButton :currentView="currentView" :onClick="toggleView" title="Nissan" /></span>
      <span>and <ViewButton :currentView="currentView" :onClick="toggleView" title="ING Direct" />.</span>
    </section>

    <section class="content-section">
      <span>You'll occasionally find me dabbling in the open source world,</span>
      <span>contributing to <ViewButton :currentView="currentView" :onClick="toggleView" title="Facebook" /> projects, <ViewButton :currentView="currentView" :onClick="toggleView" title="Bootstrap" />, and <ViewButton :currentView="currentView" :onClick="toggleView" title="Wikipedia" />.</span>
      <span>I sometimes <ViewButton :currentView="currentView" :onClick="toggleView" title="draw things" /> when I’m bored, but spend most</span>
      <span>of my days <ViewButton :currentView="currentView" :onClick="toggleView" title="procrastinating" />.</span>
    </section>

    <section class="content-section">
      <span>I’d love to see your beautiful face, so feel free to reach out if you’re</span>
      <span>in the Bay Area. If you're elsewhere, I'd still love to hear from you!</span>
      <span>Shoot me a message on LinkedIn or just tweet at me.</span>
    </section>

    <Social />
  </section>
  <keep-alive>
    <component v-bind:is="currentView" />
  </keep-alive>
</main>
</template>

<script>
import Logo from './components/Logo';
import ViewButton from './components/ViewButton';
import Social from './components/Social';

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
  padding: 30px 5%;
}

.content {
  position: relative;
  background: #fff;
  padding: 11% 30px 10% 10%;
  width: 56%;
  /* box-shadow: 0 3px 10px rgba(50,50,93,.11), 0 1px 2px rgba(0,0,0,.08); */
}

.content-section {
  margin-bottom: 2rem;
}

.content-header > h3 {
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
