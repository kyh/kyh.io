<template>
<transition
  v-on:before-enter="beforeEnter"
  v-on:enter="enter"
  v-on:leave="leave"
  mode="out-in"
>
  <section id="slyce">
    <ul class="grid products">
      <li class="grid__item" v-for="(product, index) in products" :key="product.url">
        <ImageLoader
          class="grid__img"
          :url="product.url"
        />
      </li>
    </ul>
    <ul class="grid white">
      <li class="grid__item" v-for="(product, index) in white" :key="product.url">
        <ImageLoader
          class="grid__img"
          :url="product.url"
        />
      </li>
    </ul>
  </section>
</transition>
</template>

<script>
import ImageLoader from '../../components/ImageLoader';
import anime from 'animejs';

export default {
  name: 'SlyceProduct',
  data: () => ({
    products: [
      { url: '/static/images/1.png' },
      { url: '/static/images/2.png' },
      { url: '/static/images/3.png' },
      { url: '/static/images/4.png' },
      { url: '/static/images/5.png' },
    ],
    white: [
      { url: '/static/images/6.png' },
      { url: '/static/images/7.png' },
      { url: '/static/images/8.png' },
      { url: '/static/images/9.png' },
      { url: '/static/images/10.png' },
    ],
  }),
  components: {
    ImageLoader,
  },
  methods: {
    toggleView(view) {
      this.currentView = view;
    },
    beforeEnter(el) {
      el.firstChild.style.transform = 'translateY(500px)';
      el.lastChild.style.transform = 'translateY(-2500px)';
    },
    // the done callback is optional when
    // used in combination with CSS
    enter(el, done) {
      console.log('enter');
      anime({
        targets: [el.firstChild, el.lastChild],
        translateY: -900,
        duration: 1000,
        easing: 'easeInOutQuart',
        complete: done,
      });
    },
    leave(el, done) {
      anime({
        targets: el.lastChild,
        translateY: 400,
        duration: 1000,
        easing: 'easeInOutQuart',
      });
      anime({
        targets: el.firstChild,
        translateY: -2500,
        duration: 1000,
        easing: 'easeInOutQuart',
        complete: done,
      });
    },
  },
};
</script>

<style scoped>
#slyce {
  position: fixed;
  display: flex;
  transform-style: preserve-3d;
  transform: rotateX(55deg) rotateZ(35deg);
  z-index: -1;
}

.grid {
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.grid__item {
  margin: 10px;
}

.grid__img > img {
  box-shadow: 0 3px 10px rgba(50,50,93,.11), 0 1px 2px rgba(0,0,0,.08);
}

</style>
