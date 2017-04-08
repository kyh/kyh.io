<template>
  <div id="shape-icosahedron"></div>
</template>

<style scoped>
#shape-icosahedron {
  position: absolute;
  background: url('/static/images/shadow.png');
  background-size: auto 60%;
  background-repeat: no-repeat;
  background-position: center center;
  width: 450px;
  height: 450px;
  z-index: 1;
  right: 20%;
  top: -205px;
  pointer-events: all;
}
</style>

<script>
import AnimatedShape from '../services/shapes';

export default {
  mounted() {
    const icosahedron = new AnimatedShape('shape-icosahedron', 'icosahedron', 3000);
    icosahedron.init();
  },
};
</script>
