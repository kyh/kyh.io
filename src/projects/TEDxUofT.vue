<template>
  <section id="tedx">Lala</section>
</template>

<script>
import THREE from 'three';
import TWEEN from 'tween.js';

/* ignore jslint start */
export default {
  name: 'TEDxUofT',
  mounted: () => {
    console.log(THREE, TWEEN);
  },
};
</script>

<style scoped>
#tedx {
  position: fixed;
  right: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}
</style>
