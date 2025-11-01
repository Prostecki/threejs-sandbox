import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

//================================================================//
// ===== CORE SETUP =====
//================================================================//

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-10, 30, 30);

// Controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update(); // Must be called after any manual camera position changes

//================================================================//
// ===== LIGHTING =====
//================================================================//

// Ambient Light (for overall scene illumination)
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

// SpotLight (main light source)
const spotLight = new THREE.SpotLight(0xffffff, 10);
scene.add(spotLight);
spotLight.position.set(-30, 50, 0);
spotLight.castShadow = true;
spotLight.angle = 0.2;
spotLight.decay = 0;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

//================================================================//
// ===== MESHES & OBJECTS =====
//================================================================//

// Plane (ground)
const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshStandardMaterial({
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);
plane.rotation.x = -0.5 * Math.PI; // Rotate to be horizontal
plane.receiveShadow = true;

// Sphere
const sphereGeometry = new THREE.SphereGeometry(4, 50, 50);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x0000ff,
  wireframe: false,
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);
sphere.position.set(-10, 10, 0);
sphere.castShadow = true;

// TorusKnot (interactive object)
const torusKnotGeometry = new THREE.TorusKnotGeometry(2, 0.5, 100, 16);
const torusKnotMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
torusKnot.position.set(10, 5, 0);
torusKnot.castShadow = true;
scene.add(torusKnot);

// Helpers
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);
const gridHelper = new THREE.GridHelper(30);
scene.add(gridHelper);
const sLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(sLightHelper); // Uncomment to debug spotlight

//================================================================//
// ===== PARTICLES =====
//================================================================//

const particleGeometry = new THREE.BufferGeometry();
const particleCount = 10000;
const posArray = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 200;
}
particleGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
const particleMaterial = new THREE.PointsMaterial({
  size: 0.05,
  color: 0xffffff,
  transparent: true,
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

//================================================================//
// ===== POST-PROCESSING =====
//================================================================//

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // strength
  0.4, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);

//================================================================//
// ===== BACKGROUND & FOG =====
//================================================================//

scene.fog = new THREE.Fog(0x5500af, 0, 70);
const textureLoader = new THREE.TextureLoader();
const backgroundImage = textureLoader.load(
  new URL("../stars.jpeg", import.meta.url).href
);
backgroundImage.colorSpace = THREE.SRGBColorSpace;
scene.background = backgroundImage;

//================================================================//
// ===== DAT.GUI CONTROLS =====
//================================================================//

const gui = new dat.GUI();

const options = {
  sphereColor: "#ffea00",
  wireframe: false,
  speed: 0.005,
  angle: 0.2,
  penumbra: 0,
  intensity: 10,
  bloomThreshold: 0.85,
  bloomStrength: 1.5,
  bloomRadius: 0.4,
};

// Sphere and animation controls
gui.addColor(options, "sphereColor").onChange((e) => sphere.material.color.set(e));
gui.add(options, "wireframe").onChange((e) => (sphere.material.wireframe = e));
gui.add(options, "speed", 0, 0.1);

// Spotlight controls
const lightFolder = gui.addFolder("Spotlight");
lightFolder.add(options, "angle", 0, 1).onChange((e) => (spotLight.angle = e));
lightFolder.add(options, "penumbra", 0, 1).onChange((e) => (spotLight.penumbra = e));
lightFolder.add(options, "intensity", 0, 20).onChange((e) => (spotLight.intensity = e));

// Bloom controls
const bloomFolder = gui.addFolder("Bloom");
bloomFolder.add(options, "bloomThreshold", 0, 1).onChange((value) => (bloomPass.threshold = Number(value)));
bloomFolder.add(options, "bloomStrength", 0, 3).onChange((value) => (bloomPass.strength = Number(value)));
bloomFolder.add(options, "bloomRadius", 0, 1).onChange((value) => (bloomPass.radius = Number(value)));

//================================================================//
// ===== INTERACTIVITY (RAYCASTING) =====
//================================================================//

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const modal = document.getElementById("modal");

function onMouseMove(event) {
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

//================================================================//
// ===== ANIMATION LOOP =====
//================================================================//

let step = 0;

function animate(time) {
  // Animate sphere
  step += options.speed;
  sphere.position.y = 5 * Math.abs(Math.sin(step));

  // Animate particles
  particles.rotation.y = (-0.1 * time) / 1000;

  // Update helpers
  sLightHelper.update();

  // Raycasting logic for modal
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(torusKnot);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    const screenPosition = object.position.clone().project(camera);
    const x = (screenPosition.x + 1) * (window.innerWidth / 2);
    const y = (-screenPosition.y + 1) * (window.innerHeight / 2);

    modal.style.display = "block";
    modal.style.opacity = 1;
    modal.style.left = `${x}px`;
    modal.style.top = `${y}px`;
  } else {
    modal.style.opacity = 0;
    setTimeout(() => {
      if (modal.style.opacity == 0) {
        modal.style.display = "none";
      }
    }, 300); // Match the CSS transition time
  }

  // Render the scene with post-processing
  composer.render();
}

renderer.setAnimationLoop(animate);

//================================================================//
// ===== EVENT LISTENERS =====
//================================================================//

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("mousemove", onMouseMove);
