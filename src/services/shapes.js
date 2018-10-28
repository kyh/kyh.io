const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);

THREE.OrbitControls = OrbitControls;

const Detector = {
  canvas: !! window.CanvasRenderingContext2D,
  webgl: (() => {
    try {
      const canvas = document.createElement('canvas'); return !! (window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })(),
  workers: !!window.Worker,
  fileapi: window.File && window.FileReader && window.FileList && window.Blob,
  getWebGLErrorMessage: () => {
    const element = document.createElement('div');
    element.id = 'webgl-error-message';
    element.style.fontFamily = 'monospace';
    element.style.fontSize = '13px';
    element.style.fontWeight = 'normal';
    element.style.textAlign = 'center';
    element.style.background = '#fff';
    element.style.color = '#000';
    element.style.padding = '1.5em';
    element.style.width = '400px';
    element.style.margin = '5em auto 0';

    if (!this.webgl) {
      element.innerHTML = window.WebGLRenderingContext ? [
        'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
        'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.',
      ].join('\n') : [
        'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
        'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.',
      ].join('\n');
    }
    return element;
  },

  addGetWebGLMessage: (parameters = {}) => {
    const parent = parameters.parent !== undefined ? parameters.parent : document.body;
    const id = parameters.id !== undefined ? parameters.id : 'oldie';
    const element = Detector.getWebGLErrorMessage();
    element.id = id;
    parent.appendChild(element);
  },
};

export default function AnimatedShape(container, shape) {
  container = typeof container === 'string' ?
    document.getElementById(container) : console.info('An ID container is here required');

  let scene;
  let camera;
  let renderer;
  let mesh;
  let delta;
  let controls;
  let lightGroup;
  let time;
  let mouseX;
  let mouseY;
  let renderHalfX;
  let renderHalfY;
  let Controls;

  let targetRotationX = 0;
  let targetRotationY = 0;
  let targetRotationOnMouseDownX = 0;
  let targetRotationOnMouseDownY = 0;
  let mouseXOnMouseDown = 0;
  let mouseYOnMouseDown = 0;
  const dragConst = 0.15;

  const sizes = {
    HEIGHT: container.offsetHeight,
    WIDTH: container.offsetWidth,
  };

  let isDragging = false;
  let previousMousePosition = {
    x: 0,
    y: 0,
  };

  let targets;

  function createScene() {
    scene = new THREE.Scene();

    const HEIGHT = sizes.HEIGHT;
    const WIDTH = sizes.WIDTH;

    camera = new THREE.PerspectiveCamera(100, WIDTH / HEIGHT, 1, 100);
    camera.position.z = 30;
    camera.position.y = 0;

    if (Detector.webgl) {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
      });
    } else {
      renderer = new THREE.CanvasRenderer();
    }

    renderHalfX = container.clientWidth / 2;
    renderHalfY = container.clientHeight / 2;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;

    renderer.shadowCameraNear = 3;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = 75;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.shadowMapBias = 0.0039;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = 1024;
    renderer.shadowMapHeight = 1024;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    container.appendChild(renderer.domElement);

    scene.add(camera);
  }

  function createLight() {
    lightGroup = [];

    lightGroup[0] = new THREE.SpotLight(0xFFFFFF);
    lightGroup[0].position.set(0, 25, 69);
    lightGroup[0].castShadow = true;
    lightGroup[0].angle = 0.2;
    lightGroup[0].intensity = 0.1;
    lightGroup[0].shadowMapDarkness = 0.9;
    lightGroup[0].lookAt(scene);

    camera.add(lightGroup[0]);

    lightGroup[1] = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    lightGroup[1].position.set(camera.position.x, camera.position.y, camera.position.z);
    lightGroup[1].castShadow = true;
    lightGroup[1].shadowMapDarkness = 0.9;

    camera.add(lightGroup[1]);
  }

  function getIcosahedron() {
    return new THREE.IcosahedronGeometry(15);
  }

  function getCube() {
    return new THREE.BoxGeometry(15, 15, 15);
  }

  function getTetrahedron() {
    return new THREE.TetrahedronGeometry(15);
  }

  function getOctahedron() {
    return new THREE.OctahedronGeometry(15);
  }

  function createShape() {
    let geometry;

    const material = new THREE.MeshPhongMaterial({
      color: 0x949494,
      emissive: 0xa8a8a8,
      shading: THREE.FlatShading,
      shininess: 75,
    });

    switch (shape) {
      case 'icosahedron':
        geometry = getIcosahedron();
        break;
      case 'cube':
        geometry = getCube();
        break;
      case 'tetrahedron':
        geometry = getTetrahedron();
        break;
      case 'octahedron':
        geometry = getOctahedron();
        break;
    }


    mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = 0;
    mesh.position.z = 0;
    mesh.castShadow = true;

    scene.add(mesh);
  }

  function getAmountAway() {
    return fullRotation - mesh.rotation.y;
  }

  function getAmountPossible() {
    return time * velocity;
  }

  function toRadians(angle) {
    return angle * (Math.PI / 180);
  }

  function toDegrees(angle) {
    return angle * (180 / Math.PI);
  }

  function move(delta) {
    if (typeof delta === 'boolean') {
      return velocity;
    } else {
      if (velocity < 0 && mesh.rotation.y == 0) {
        return false;
      }

      mesh.rotation.y = (mesh.rotation.y + delta * velocity) % fullRotation;
      time -= delta;

      if (endVelocity) {
        velocity = endVelocity * (getAmountAway() / endRotation);
      } else if (getAmountAway() >= getAmountPossible()) {
        endVelocity = velocity;
        endRotation = getAmountAway();
      } else {
        velocity = parseFloat(speedUp * time);
      }
    }
  }

  let realVelocity;
  let wait = 0;

  function spinning(velocity, delta) {
    if (!isDragging) {
      mesh.rotation.y = (mesh.rotation.y + delta * velocity / 2) % fullRotation;
      if (wait >= delta * 2) {
        mesh.rotation.x = (mesh.rotation.x + delta * velocity / 4) % fullRotation;
      } else {
        wait += delta;
      }
    }
  }

  function onMouseDown(event) {
    event.preventDefault();

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mouseout', onMouseOut, false);

    isDragging = true;
  }

  function onMouseMove(event) {

    previousMousePosition = {
      x: event.offsetX,
      y: event.offsetY,
    };

    return targets = {
      targetRotationX,
      targetRotationY,
    };
  }

  function onTouchStart(event) {
    if (event.touches.length === 1) {
      event.preventDefault();

      mouseXOnMouseDown = event.touches[0].pageX - renderHalfX;
      targetRotationOnMouseDownX = targetRotationX;

      mouseYOnMouseDown = event.touches[0].pageY - renderHalfY;
      targetRotationOnMouseDownY = targetRotationY;
    }
  }

  function onTouchMove(event) {
    if (event.touches.length == 1) {
      event.preventDefault();

      mouseX = event.touches[0].pageX - renderHalfX;
      targetRotationX = targetRotationOnMouseDownX + (mouseX - mouseXOnMouseDown) * 0.05;

      mouseY = event.touches[0].pageY - renderHalfY;
      targetRotationY = targetRotationOnMouseDownY + (mouseY - mouseYOnMouseDown) * 0.05;
    }
  }

  function onMouseUp(event) {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    document.removeEventListener('mouseout', onMouseOut, false);
  }


  function onMouseOut(event) {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    document.removeEventListener('mouseout', onMouseOut, false);
  }

  function loop(time) {
    if (!loop.lastTime) {
      loop.lastTime = time;
    }

    const delta = time - loop.lastTime;
    loop.lastTime = time;

    requestAnimationFrame(loop);

    controls.update();

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    sizes.HEIGHT = container.offsetHeight;
    sizes.WIDTH = container.offsetWidth;

    const HEIGHT = sizes.HEIGHT;
    const WIDTH = sizes.WIDTH;

    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;

    camera.updateProjectionMatrix();
  }

  return {
    init: () => {
      createScene();
      createLight();
      createShape();
      loop();

      window.addEventListener('resize', onWindowResize, false);

      container.addEventListener('mousedown', onMouseDown, false);
      container.addEventListener('touchstart', onTouchStart, false);
      container.addEventListener('touchmove', onTouchMove, false);
    },
  };
}
