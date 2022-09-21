var CameraControls = require('3d-view-controls');
import {vec3, mat4} from 'gl-matrix';

class Camera {
  controls: any;
  projectionMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.1;
  far: number = 1000;
  position: vec3 = vec3.create();
  direction: vec3 = vec3.create();
  target: vec3 = vec3.create();
  up: vec3 = vec3.create();

  constructor(position: vec3, target: vec3) {
    this.controls = CameraControls(document.getElementById('canvas'), {
      eye: position,
      center: target,
    });
    vec3.add(this.target, this.position, this.direction);
    mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.controls.up);
  }

  setAspectRatio(aspectRatio: number) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fovy, this.aspectRatio, this.near, this.far);
  }

  update() {
    this.controls.tick();
    vec3.add(this.target, this.position, this.direction);
    
    // disabling normal view matrix updating so I can lock rotation to only around the y axis 
    // mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.controls.up);

    // lock the view matrix to only ever rotate around y axis (method 1)
    // for some reason sometimes the movement gets reversed w this way, but its better than the other way 
    let lockedEye: vec3 = this.controls.eye;
    lockedEye[1] = 0.0;
    vec3.normalize(lockedEye, lockedEye);
    vec3.multiply(lockedEye, lockedEye, vec3.fromValues(5.0, 5.0, 5.0));
    let lockedCenter: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
    let lockedUp: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
    
    mat4.lookAt(this.viewMatrix, lockedEye, lockedCenter, lockedUp);

    /*
    // lock the view matrix to only ever rotate around y axis (method 2)

    // by ensuring view orient matrix:
    // Rx Ry Rz 0 = X 0 X X @ 0  4  8  12
    // Ux Uy Uz 0 = 0 1 0 X @ 1  5  9  13
    // Fx Fy Fz 0 = X 0 X X @ 2  6  10 14
    // 0  0  0  1 = X X X X @ 3  7  11 15

    // for some reason things don't seem to be rotating around the origin
    // and if you mess w it just right you get weird artifacts as if the ray march is coming from the wrong drxn 
    // no idea why either of these happens

    mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.controls.up);

    let R: vec3 = vec3.create();
    vec3.normalize(R, vec3.fromValues(this.viewMatrix[0], 0.0, this.viewMatrix[8]));
    this.viewMatrix[0] = R[0];
    this.viewMatrix[4] = 0.0;
    this.viewMatrix[8] = R[2];

    this.viewMatrix[1] = 0.0;
    this.viewMatrix[5] = 1.0;
    this.viewMatrix[9] = 0.0;

    let F: vec3 = vec3.create();
    vec3.normalize(F, vec3.fromValues(this.viewMatrix[2], 0.0, this.viewMatrix[10]));
    this.viewMatrix[2] = F[0];
    this.viewMatrix[6] = 0.0;
    this.viewMatrix[10] = F[2];
    */
  }
};

export default Camera;
