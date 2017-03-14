<template>
  <section id="slyce">
    <div class="isolayer isolayer--deco1 isolayer--shadow">
      <ul class="grid">
        <li class="grid__item" v-for="(product, index) in products" :key="product.url">
          <ImageLoader
            class="grid__img layer"
            :url="product.url"
            :loResSrc="product.lowRes"
          />
        </li>
      </ul>
    </div>
  </section>
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
#slyce {
  position: fixed;
  right: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.isolayer {
  width: 1200px;
  height: 900px;
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 50% 100%;
  transform-style: preserve-3d;
  transform: translateX(40%) translateY(-50%) rotateX(55deg) rotateZ(35deg);
}

.grid {
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.grid__item {
  width: 400px;
  height: 300px;
  padding: 15px;
  display: inline-block;
  margin: 10px;
}

.grid__img {
  display: block;
  max-width: 100%;
}

.grid__title {
  font-size: 0.65em;
  font-weight: 600;
  position: absolute;
  z-index: -1;
  bottom: 0;
  width: 100%;
  text-align: center;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0;
  color: #fff;
  -webkit-transform: translate3d(0,-20px,0);
  transform: translate3d(0,-20px,0);
  -webkit-transition: -webkit-transform 0.3s, opacity 0.3s;
  transition: transform 0.3s, opacity 0.3s;
}

.grid__item:hover .grid__title {
  opacity: 1;
  -webkit-transform: translate3d(0,0,0);
  transform: translate3d(0,0,0);
}

.layer {
  position: relative;
  display: block;
}

.layer:not(:first-child) {
  position: absolute;
  top: 0;
  left: 0;
}

/* Shadow effect */
.isolayer--shadow .grid__link::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: 5px;
  right: 5px;
  bottom: 5px;
  left: 5px;
  opacity: 0.6;
  background: rgba(0,0,0,0.8);
  box-shadow: 0 0 0 0 rgba(0,0,0,0.8);
  -webkit-transform: translateZ(-1px) scale(0.95);
  transform: translateZ(-1px) scale(0.95);
  -webkit-transition: transform 0.3s, opacity 0.3s, box-shadow 0.3s;
  transition: transform 0.3s, opacity 0.3s, box-shadow 0.3s;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.isolayer--shadow .grid__item:hover .grid__link::before {
  opacity: 0.2;
  box-shadow: 0 0 20px 10px rgba(0,0,0,0.8);
  -webkit-transform: translateZ(-1px) scale(1);
  transform: translateZ(-1px) scale(1);
}

</style>
