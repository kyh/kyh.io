<template>
  <a
    class="link"
    :data-letters="title"
    v-on:click.prevent="onClick(title)"
    v-bind:class="{ active: currentView === title }"
  >{{title}}</a>
</template>

<script>
export default {
  name: 'ViewButton',
  props: ['title', 'onClick', 'currentView'],
};
</script>

<style scoped>
.link {
  cursor: pointer;
  font-weight: 500;
  outline: none;
  text-decoration: none;
  position: relative;
  line-height: 1;
  display: inline-flex;
  overflow: hidden;
  line-height: 1;
  border-bottom: 1px dotted #6b74e6;
  color: #6b74e6;
  transition: border-color 0.4s ease;
}

.link:hover {
  color: #6b74e6;
  border-color: #424242;
}

.link::after {
  content: '';
  position: absolute;
  height: 3px;
  width: 100%;
  top: 50%;
  margin-top: -1px;
  right: 0;
  background: #F9F9F9;
  transform: translate3d(-100%,0,0);
  transition: transform 0.4s;
  transition-timing-function: cubic-bezier(0.7,0,0.3,1);
}

.link:hover::after {
  transform: translate3d(100%,0,0);
}

.link::before {
  content: attr(data-letters);
  position: absolute;
  z-index: 2;
  overflow: hidden;
  color: #424242;
  white-space: nowrap;
  width: 0%;
  transition: width 0.4s 0.3s;
}

.link:hover::before {
  width: 100%;
}

.link.active {
  overflow: visible;
}

.link.active:hover::after,
.link.active::after {
  width: 110%;
  height: 21px;
  top: -2px;
  background-color: #6b74e6;
  transform: translate3d(0,0,0);
}
</style>
