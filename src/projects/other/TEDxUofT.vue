<template>
  <section id="tedx" />
</template>

<script>
import THREE from 'three/build/three.module';
import TWEEN from 'tween.js';

let camera = null;
let scene = null;
let renderer = null;
let checker = 1;

function init() {
  const container = document.createElement('div');
  document.getElementById('tedx').appendChild(container);
  perspectiveCamera();

  scene = new THREE.Scene();

  const geometry = new THREE.CubeGeometry(10, 10, 10);

  for (let i = 0; i < 125; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF2B06,
      opacity: 0.5,
      wireframe: true
    });
    const object = new THREE.Mesh(geometry, material);

    object.position.x = Math.random() * 800 - 400;
    object.position.y = Math.random() * 800 - 400;
    object.position.z = Math.random() * 800 - 400;

    object.scale.x = Math.random() * 2 + 1;
    object.scale.y = Math.random() * 2 + 1;
    object.scale.z = Math.random() * 2 + 1;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    scene.add(object);
  }

  renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth,window.innerHeight);

  container.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/*-----------------------------------
    SHUFFLE CUBES
-----------------------------------*/
function chaos(animationTime, animationName) {
  const delayTime = animationTime / 4;
  let waitTime = animationTime * 3 + delayTime;
  if (checker === 1 && animationName !== 'mix') {
    waitTime = 0;
    checker = 0;
  }

  switch(animationName) {
    case 'line':
      setTimeout(playLine, waitTime);
    break;
    case 'circle':
      setTimeout(playCircle, waitTime);
    break;
    case 'cube':
      setTimeout(playCube, waitTime);
    break;
    case 'spiral':
      setTimeout(playSpiral, waitTime);
    break;
    case 'mix':
      checker = 1;
    break;
    default:
      break;
  }

  if (waitTime !== 0) {
    for (let i = 0; i < scene.children.length; i++) {
      new TWEEN.Tween(scene.children[i].position).to({
        x: Math.random() * 800 - 400,
        y: Math.random() * 800 - 400,
        z: Math.random() * 800 - 400,
      }, animationTime).easing( TWEEN.Easing.Elastic.Out).start();

      new TWEEN.Tween(scene.children[i].rotation).to({
        x: Math.random() * 2 * Math.PI,
        y: Math.random() * 2 * Math.PI,
        z: Math.random() * 2 * Math.PI,
      }, animationTime)
        .delay(animationTime)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();

      new TWEEN.Tween(scene.children[i].scale).to({
        x: Math.random() * 5 + 1,
        y: Math.random() * 5 + 1,
        z : Math.random() * 5 + 1,
      }, animationTime)
        .delay(animationTime * 2 + delayTime)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
    }
  }
}

/*-----------------------------------
    CREATE LINE
-----------------------------------*/
function playLine() {
  for (let i = 0; i < scene.children.length; i++) {
    new TWEEN.Tween(scene.children[i].position).to({
      x: -500 + i * 30,
      y: 0,
      z: 0
    }, 1000).easing(TWEEN.Easing.Elastic.Out).start();

    new TWEEN.Tween(scene.children[i].rotation).to({
      x: 0,
      y: 0,
      z: 0
    }, 1000)
      .delay(1000)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();

    new TWEEN.Tween(scene.children[i].scale).to({
      x : 1,
      y : 1,
      z : 1
    }, 1000)
      .delay(2250)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }
}

/*-----------------------------------
    CREATE CIRCLE
-----------------------------------*/
function playCircle() {
  const r = 300;
  const len = scene.children.length;
  const theta = 2 * Math.PI / len;
  for (let i = 0; i < len; i++) {
    new TWEEN.Tween(scene.children[i].position).to({
      x: r * Math.cos(theta * i),
      y: r * Math.sin(theta * i),
      z: 0
    }, 1000).easing(TWEEN.Easing.Elastic.Out).start();

    new TWEEN.Tween(scene.children[i].rotation).to({
      x: 0,
      y: 0,
      z: 0
    }, 1000)
      .delay(1000)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();

    new TWEEN.Tween(scene.children[i].scale).to({
      x: 0.8,
      y: 0.8,
      z: 0.8
    }, 1000)
      .delay(2250)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }
}

/*-----------------------------------
    CREATE CUBE
-----------------------------------*/
function playCube() {
  //var len = Math.pow(scene.children.length,1.0/3.0);
  const len = 5;

  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      for (let k = 0; k < len; k++) {
        new TWEEN.Tween(scene.children[i * len * len + j * len + k].position).to({
          x: -100 + i * 60,
          y: -100 + j * 60,
          z: -100 + k * 60
        }, 1000)
          .easing(TWEEN.Easing.Elastic.Out)
          .start();

        new TWEEN.Tween(scene.children[i * len * len + j * len + k].rotation).to({
          x: 0,
          y: 0,
          z: 0
        }, 1000)
          .delay(1000)
          .easing(TWEEN.Easing.Elastic.Out)
          .start();

        new TWEEN.Tween(scene.children[i * len * len + j * len + k].scale).to({
          x: 1,
          y: 1,
          z: 1
        }, 1000)
          .delay(2250)
          .easing(TWEEN.Easing.Elastic.Out)
          .start();
      }
    }
  }
}


/*-----------------------------------
    CREATE SPIRAL
-----------------------------------*/
function playSpiral() {
  const r = 30;
  const len = scene.children.length;
  let theta = 2 * Math.PI / len;
  theta *= 30;
  for (let i = 0; i < len; i++) {
    new TWEEN.Tween(scene.children[i].position).to({
      x: r * Math.cos(theta * i),
      y: r * Math.sin(theta * i),
      z: 10 * i,
    }, 1000)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();

    new TWEEN.Tween(scene.children[i].rotation).to({
      x: 0,
      y: 0,
      z: 0,
    }, 1000)
      .delay(1000)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();

    new TWEEN.Tween(scene.children[i].scale).to({
      x: 0.8,
      y: 0.8,
      z: 0.8,
    }, 1000)
      .delay(2250)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }
}
/*-----------------------------------
    CAMERA
-----------------------------------*/
function perspectiveCamera() {
  const fov = 40;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 1;
  const far = 10000;

  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 300, 500);
}


function render() {
  const radius = 600;
  let theta = 0;

  TWEEN.update();
  theta += 0.1;
  camera.position.x = radius * Math.sin(THREE.Math.degToRad(theta));
  camera.position.y = radius * Math.sin(THREE.Math.degToRad(theta));
  camera.position.z = radius * Math.cos(THREE.Math.degToRad(theta));
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

/* ignore jslint start */
export default {
  name: 'TEDxUofT',
  mounted: () => {
    const formation = ['mix', 'line', 'circle', 'cube', 'spiral'];
    let counter = 0;

    init();
    animate();
    window.setInterval(() => {
      chaos(750,formation[counter]);
      if (counter < 4) {
        counter++;
      } else {
        counter = 0;
      }
    }, 10000);
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
