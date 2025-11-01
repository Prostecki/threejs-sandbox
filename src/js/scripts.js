import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x00ea00); // This will be overridden by the background image

const gui = new dat.GUI();

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const orbit = new OrbitControls(camera, renderer.domElement);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

camera.position.set(-10, 30, 30);
orbit.update();

const boxGeometry = new THREE.BoxGeometry();
const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(box);

const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshStandardMaterial({
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);
plane.rotation.x = -0.5 * Math.PI;
plane.receiveShadow = true;

const gridHelper = new THREE.GridHelper(30);
scene.add(gridHelper);

const sphereGeometry = new THREE.SphereGeometry(4, 50, 50);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x0000ff,
  wireframe: false,
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);
sphere.position.set(-10, 10, 0);
sphere.castShadow = true;

// Add TorusKnot
const torusKnotGeometry = new THREE.TorusKnotGeometry(2, 0.5, 100, 16);
const torusKnotMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
torusKnot.position.set(5, 5, 0);
torusKnot.castShadow = true;
scene.add(torusKnot);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 10);
scene.add(spotLight);
spotLight.position.set(-30, 50, 0);
spotLight.castShadow = true;
spotLight.angle = 0.2; // Initial angle
spotLight.decay = 0; // Disable light decay
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

const sLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(sLightHelper);

// Particles
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 10000;

const posArray = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 200;
}

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(posArray, 3)
);

const particleMaterial = new THREE.PointsMaterial({
  size: 0.05,
  color: 0xffffff,
  transparent: true,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // strength
  0.4, // radius
  0.85 // threshold
);
// composer.addPass(bloomPass);

// scene.fog = new THREE.Fog(0x5500af, 0, 70);

const textureLoader = new THREE.TextureLoader();
const backgroundImage = textureLoader.load(
  new URL("../stars.jpeg", import.meta.url).href
);
backgroundImage.colorSpace = THREE.SRGBColorSpace;

scene.background = backgroundImage;

const options = {
  sphereColor: "#ffea00",
  wireframe: false,
  speed: 0.005,
  angle: 0.2,
  penumbra: 0,
  intensity: 10,
  //   bloomThreshold: 0.25,
  //   bloomStrength: 0.05,
  //   bloomRadius: 0.4,
};

gui.addColor(options, "sphereColor").onChange(function (e) {
  sphere.material.color.set(e);
});

gui.add(options, "wireframe").onChange(function (e) {
  sphere.material.wireframe = e;
});

gui.add(options, "speed", 0, 0.1);

gui.add(options, "angle", 0, 1).onChange(function (e) {
  spotLight.angle = e;
});
gui.add(options, "penumbra", 0, 1).onChange(function (e) {
  spotLight.penumbra = e;
});
gui.add(options, "intensity", 0, 20).onChange(function (e) {
  spotLight.intensity = e;
});

// const bloomFolder = gui.addFolder("Bloom");
// bloomFolder.add(options, "bloomThreshold", 0, 1).onChange(function (value) {
//   bloomPass.threshold = Number(value);
// });
// bloomFolder.add(options, "bloomStrength", 0, 3).onChange(function (value) {
//   bloomPass.strength = Number(value);
// });
// bloomFolder.add(options, "bloomRadius", 0, 1).onChange(function (value) {
//   bloomPass.radius = Number(value);
// });

// Raycasting for modal
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const modal = document.getElementById("modal");

window.addEventListener("mousemove", (event) => {
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let step = 0;
let intersects;

function animate(time) {
  step += options.speed;
  sphere.position.y = 5 * Math.abs(Math.sin(step));

  // Animate particles
  particles.rotation.y = (-0.1 * time) / 1000;

  // Raycasting
  raycaster.setFromCamera(mouse, camera);
  intersects = raycaster.intersectObject(torusKnot);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    const screenPosition = object.position.clone().project(camera);
    const x = ((screenPosition.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPosition.y + 1) * window.innerHeight) / 2;

    modal.style.display = "block";
    modal.style.opacity = 1;
    modal.style.left = `${x}px`;
    modal.style.top = `${y}px`;
  } else {
    modal.style.opacity = 0;
    // Use a timeout to set display to none after the transition
    setTimeout(() => {
      if (modal.style.opacity == 0) {
        modal.style.display = "none";
      }
    }, 300); // Match the CSS transition time
  }

  sLightHelper.update();

  composer.render();
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
