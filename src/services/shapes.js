import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  CanvasRenderer,
  PCFSoftShadowMap,
  SpotLight,
  DirectionalLight,
  IcosahedronGeometry,
  MeshPhongMaterial,
  FlatShading,
  Mesh,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const Detector = {
  canvas: !!window.CanvasRenderingContext2D,
  webgl: (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  })(),
};

export default function AnimatedShape(id) {
  const container = document.getElementById(id);
  const sizes = {
    HEIGHT: container.offsetHeight,
    WIDTH: container.offsetWidth,
  };

  let scene;
  let camera;
  let renderer;
  let mesh;
  let controls;
  let lightGroup;

  function createScene() {
    scene = new Scene();

    const { HEIGHT, WIDTH } = sizes;

    camera = new PerspectiveCamera(100, WIDTH / HEIGHT, 1, 100);
    camera.position.z = 30;
    camera.position.y = 5;

    if (Detector.webgl) {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
      });
    } else {
      renderer = new CanvasRenderer();
    }

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;

    renderer.shadowCameraNear = 3;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = 75;
    renderer.shadowMap.type = PCFSoftShadowMap;

    renderer.shadowMapBias = 0.0039;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = 1024;
    renderer.shadowMapHeight = 1024;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    container.appendChild(renderer.domElement);

    scene.add(camera);
  }

  function createLight() {
    lightGroup = [];

    lightGroup[0] = new SpotLight(0xffffff);
    lightGroup[0].position.set(0, 25, 69);
    lightGroup[0].castShadow = true;
    lightGroup[0].angle = 0.2;
    lightGroup[0].intensity = 0.1;
    lightGroup[0].shadowMapDarkness = 0.9;
    lightGroup[0].lookAt(scene);

    camera.add(lightGroup[0]);

    lightGroup[1] = new DirectionalLight(0xffffff, 0.5);
    lightGroup[1].position.set(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );
    lightGroup[1].castShadow = true;
    lightGroup[1].shadowMapDarkness = 0.9;

    camera.add(lightGroup[1]);
  }

  function getIcosahedron() {
    return new IcosahedronGeometry(15);
  }

  function createShape() {
    let geometry;

    const material = new MeshPhongMaterial({
      color: 0x949494,
      emissive: 0xa8a8a8,
      shading: FlatShading,
      shininess: 75,
    });

    geometry = getIcosahedron();

    mesh = new Mesh(geometry, material);

    mesh.position.y = 0;
    mesh.position.z = 0;
    mesh.castShadow = true;

    scene.add(mesh);
  }

  function loop(time) {
    if (!loop.lastTime) {
      loop.lastTime = time;
    }

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

      window.addEventListener("resize", onWindowResize, false);
    },
  };
}
