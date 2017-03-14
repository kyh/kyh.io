<template>
  <transition-group name="blur" tag="div">
    <div v-show="currentSrc === null" class="placeholder blur-transition" key="placeholder" />
    <img v-show="currentSrc" :src="currentSrc" key="image" class="blur-transition" />
  </transition-group>
</template>

<style scoped>
  img, .placeholder {
    height: 300px;
    width: 400px;
    position: absolute;
  }
  .placeholder {
    background-color: rgba(0,0,0,.02);
  }
  .blur-transition {
    transition: opacity linear .4s 0s;
    opacity: 1;
  }
  .blur-enter, .blur-leave {
    opacity: 0;
  }
</style>

<script>
  export default {
    props: ['url'],
    data: () => ({ currentSrc: null }),
    mounted() {
      const image = new Image();
      image.src = this.url;

      image.onload = () => {
        this.currentSrc = this.url;
      };
    },
  };
</script>
