<template>
<transition name="fade">
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
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s
}
.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0
}

#slyce {
  position: fixed;
  display: flex;
  transform-style: preserve-3d;
  transform: rotateX(55deg) rotateZ(35deg);
  /*z-index: -1;*/
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
