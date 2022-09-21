import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Cube from './geometry/Cube';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import * as THREE from 'three';
import audioSrc from "/src/sounds/burnAudio.mp3";

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,

  'Play music': playMusic,

  fireInner: [1.0*255.0, 0.4*255.0, 0.0*255.0],
  fireMiddle: [0.9*255.0, 0.1*255.0, 0.0*255.0],
  fireOuter: [0.1*255.0, 0.0*255.0, 0.3*255.0],
  smokeInner: [103.0, 20.0, 255.0],
  smokeMiddle: [50.0, 0.0, 229.0],
  smokeOuter: [0.0, 0.15, 255.0],

  burnSpeed: 1.5,
  fireDensity: 1.0,

  'Reset': reset, // A function pointer, essentially. Defined under shader

  'Load Scene': loadScene, // A function pointer, essentially
};

let icosphere: Icosphere;
let cube: Cube;
let square: Square;
let prevTesselations: number = 5;
let prevSmokeInner: number[] = [0, 0, 0];
let prevSmokeMiddle: number[] = [0, 0, 0];
let prevSmokeOuter: number[] = [0, 0, 0];
let prevFireInner: number[] = [0, 0, 0];
let prevFireMiddle: number[] = [0, 0, 0];
let prevFireOuter: number[] = [0, 0, 0];
let prevBurnSpeed: number = 0.0;
let prevFireDensity: number = 0.0;

let pastHighFreqData: number[] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]; // less smoothing 
let highFreqDataCurr: number = 0.0;
let highFreqDataOut: number = 0.0;

let pastLowFreqData: number[] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]; // more smoothing
let lowFreqDataCurr: number = 0.0;
let lowFreqDataOut: number = 0.0;

let audioIsPlaying: number = 0.0;
let prevAudioIsPlaying: number = 1.0;

let unifTime: number;
function reset() {
  controls.fireInner = [1.0*255.0, 0.4*255.0, 0.0*255.0];
  controls.fireMiddle = [0.9*255.0, 0.1*255.0, 0.0*255.0];
  controls.fireOuter = [0.1*255.0, 0.0*255.0, 0.3*255.0];
  controls.smokeInner = [103.0, 20.0, 255.0];
  controls.smokeMiddle = [50.0, 0.0, 229.0];
  controls.smokeOuter = [0.0, 0.15, 255.0];

  controls.burnSpeed = 1.5;
  controls.fireDensity = 1.0;
}

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  cube = new Cube(vec3.fromValues(0, 0, 0));
  cube.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
}

//////////////////////////// SOUND ////////////////////////////
const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
const analyser = new THREE.AudioAnalyser(sound, 128);

function playMusic() {
  if(audioIsPlaying == 0.0) {
    audioLoader.load(audioSrc, function( buffer ) {
      sound.setBuffer( buffer );
      sound.setLoop( true );
      sound.setVolume( 0.5 );
      sound.play();
    });
    audioIsPlaying = 1.0;
  } else {
    sound.pause();
    audioIsPlaying = 0.0;
  }
}

//////////////////////////// MAIN ////////////////////////////

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // initialize values time
  unifTime = 0;

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);

  gui.add(controls, 'Play music');

  gui.add(controls, 'burnSpeed', 0.5, 3.0).step(0.1);
  gui.add(controls, 'fireDensity', 0.8, 1.2).step(0.01);
  gui.addColor(controls, 'smokeInner');
  gui.addColor(controls, 'smokeMiddle');
  gui.addColor(controls, 'smokeOuter');
  gui.addColor(controls, 'fireInner');
  gui.addColor(controls, 'fireMiddle');
  gui.addColor(controls, 'fireOuter');
  gui.add(controls, 'Reset');

  gui.add(controls, 'Load Scene');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');

  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const shader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/fire-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/fire-frag.glsl')),
    // new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    // new Shader(gl.FRAGMENT_SHADER, require('./shaders/fbm-frag.glsl')),
  ]);

  function reset() {
    shader.setBurnSpeed(1.0);
    shader.setFireDensity(1.0);
  }
  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    unifTime++;

    // tessalations updates
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }
    // set whether music is playing
    if(audioIsPlaying != prevAudioIsPlaying) {
      prevAudioIsPlaying = audioIsPlaying;
      shader.setIsMusicPlaying(audioIsPlaying);
    }
    // pass sound data to shader (low freq)
    // add new element to the end of the array and gets rid of first element
    lowFreqDataCurr = (analyser.getFrequencyData()[0] + analyser.getFrequencyData()[1] + analyser.getFrequencyData()[2]) / 3.0;
    pastLowFreqData.push(lowFreqDataCurr);
    pastLowFreqData.shift();
    // average data and pass to shader (temporally smooths data)
    lowFreqDataOut = pastLowFreqData.reduce((a, b) => a + b) / pastLowFreqData.length; // average freq data
    shader.setAudioLowFreq(lowFreqDataOut);

    // sound high freq data (same thing but only looking at the very low freq values)
    highFreqDataCurr = (analyser.getFrequencyData()[30] + analyser.getFrequencyData()[35] + analyser.getFrequencyData()[40]) / 3.0;
    pastHighFreqData.push(highFreqDataCurr);
    pastHighFreqData.shift();
    // average data and pass to shader (temporally smooths data)
    highFreqDataOut = pastHighFreqData.reduce((a, b) => a + b) / pastHighFreqData.length; // average freq data
    shader.setAudioHighFreq(highFreqDataOut);

    // color updates
    if(controls.smokeInner != prevSmokeInner) {
      prevSmokeInner = controls.smokeInner;
      shader.setSmokeInnerColor(vec4.fromValues(controls.smokeInner[0]/255.0, 
                                                controls.smokeInner[1]/255.0, 
                                                controls.smokeInner[2]/255.0, 
                                                0.5));
      gui.updateDisplay();
    }
    if(controls.smokeMiddle != prevSmokeMiddle) {
      prevSmokeMiddle = controls.smokeMiddle;
      shader.setSmokeMiddleColor(vec4.fromValues(controls.smokeMiddle[0]/255.0, 
                                                controls.smokeMiddle[1]/255.0, 
                                                controls.smokeMiddle[2]/255.0, 
                                                0.2));
      gui.updateDisplay();
    }
    if(controls.smokeOuter != prevSmokeOuter) {
      prevSmokeOuter = controls.smokeOuter;
      shader.setSmokeOuterColor(vec4.fromValues(controls.smokeOuter[0]/255.0, 
                                                controls.smokeOuter[1]/255.0, 
                                                controls.smokeOuter[2]/255.0, 
                                                0.8));
      gui.updateDisplay();
    }
    if(controls.fireInner != prevFireInner) {
      prevFireInner = controls.fireInner;
      shader.setFireInnerColor(vec4.fromValues(controls.fireInner[0]/255.0, 
                                                controls.fireInner[1]/255.0, 
                                                controls.fireInner[2]/255.0, 
                                                0.8));
      gui.updateDisplay();
    }
    if(controls.fireMiddle != prevFireMiddle) {
      prevFireMiddle = controls.fireMiddle;
      shader.setFireMiddleColor(vec4.fromValues(controls.fireMiddle[0]/255.0, 
                                                controls.fireMiddle[1]/255.0, 
                                                controls.fireMiddle[2]/255.0, 
                                                0.4));
      gui.updateDisplay();
    }
    if(controls.fireOuter != prevFireOuter) {
      prevFireOuter = controls.fireOuter;
      shader.setFireOuterColor(vec4.fromValues(controls.fireOuter[0]/255.0, 
                                                controls.fireOuter[1]/255.0, 
                                                controls.fireOuter[2]/255.0, 
                                                0.1));
      gui.updateDisplay();
    }
    // other controls
    if(controls.burnSpeed != prevBurnSpeed) {
      prevBurnSpeed = controls.burnSpeed;
      shader.setBurnSpeed(controls.burnSpeed);
      gui.updateDisplay();
    }
    if(controls.fireDensity != prevFireDensity) {
      prevFireDensity = controls.fireDensity;
      shader.setFireDensity(controls.fireDensity);
      gui.updateDisplay();
    }

    renderer.render(camera, shader, [
      icosphere,
      // cube,
      // square,
    ], unifTime, camera.position);

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
