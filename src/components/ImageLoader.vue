<template>
  <transition-group name="blur" tag="div">
    <img v-show="currentSrc" :src="currentSrc" key="image" class="blur-transition" />
  </transition-group>
</template>

<style scoped>
  img {
    max-width: 100%;
  }
  .blur-transition {
    transition: opacity linear .4s;
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
