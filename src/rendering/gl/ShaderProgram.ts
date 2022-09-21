import {vec4, vec3, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifTimeFs: WebGLUniformLocation;
  unifTimeVs: WebGLUniformLocation;
  unifCameraPos: WebGLUniformLocation;

  unifSmokeInnerColor: WebGLUniformLocation;
  unifSmokeMiddleColor: WebGLUniformLocation;
  unifSmokeOuterColor: WebGLUniformLocation;
  unifFireInnerColor: WebGLUniformLocation;
  unifFireMiddleColor: WebGLUniformLocation;
  unifFireOuterColor: WebGLUniformLocation;

  unifBurnSpeed: WebGLUniformLocation;
  unifFireDensity: WebGLUniformLocation;

  unifIsMusicPlaying: WebGLUniformLocation;
  unifAudioHighFreq: WebGLUniformLocation;
  unifAudioLowFreq: WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.unifTimeFs = gl.getUniformLocation(this.prog, "u_TimeFs");
    this.unifTimeVs = gl.getUniformLocation(this.prog, "u_TimeVs");
    this.unifCameraPos = gl.getUniformLocation(this.prog, "u_CameraPos");
    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");

    this.unifSmokeInnerColor      = gl.getUniformLocation(this.prog, "u_SmokeInnerColor");
    this.unifSmokeMiddleColor      = gl.getUniformLocation(this.prog, "u_SmokeMiddleColor");
    this.unifSmokeOuterColor      = gl.getUniformLocation(this.prog, "u_SmokeOuterColor");
    this.unifFireInnerColor      = gl.getUniformLocation(this.prog, "u_FireInnerColor");
    this.unifFireMiddleColor      = gl.getUniformLocation(this.prog, "u_FireMiddleColor");
    this.unifFireOuterColor      = gl.getUniformLocation(this.prog, "u_FireOuterColor");

    this.unifBurnSpeed      = gl.getUniformLocation(this.prog, "u_BurnSpeed");
    this.unifFireDensity      = gl.getUniformLocation(this.prog, "u_FireDensity");

    this.unifIsMusicPlaying      = gl.getUniformLocation(this.prog, "u_IsMusicPlaying");
    this.unifAudioHighFreq      = gl.getUniformLocation(this.prog, "u_AudioHighFreq");
    this.unifAudioLowFreq      = gl.getUniformLocation(this.prog, "u_AudioLowFreq");

  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setTime(time: number) {
    this.use();
    if (this.unifTimeFs !== -1) {
      gl.uniform1i(this.unifTimeFs, time);
    }
    if (this.unifTimeVs !== -1) {
      gl.uniform1i(this.unifTimeVs, time);
    }
  }

  setCameraPos(cameraPos: vec3) {
    this.use();
    if (this.unifCameraPos !== -1) {
      gl.uniform3fv(this.unifCameraPos, cameraPos);
    }
  }
  
  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setSmokeInnerColor(color: vec4) {
    this.use();
    if (this.unifSmokeInnerColor !== -1) {
      gl.uniform4fv(this.unifSmokeInnerColor, color);
    }
  }
  setSmokeMiddleColor(color: vec4) {
    this.use();
    if (this.unifSmokeMiddleColor !== -1) {
      gl.uniform4fv(this.unifSmokeMiddleColor, color);
    }
  }
  setSmokeOuterColor(color: vec4) {
    this.use();
    if (this.unifSmokeOuterColor !== -1) {
      gl.uniform4fv(this.unifSmokeOuterColor, color);
    }
  }
  setFireInnerColor(color: vec4) {
    this.use();
    if (this.unifFireInnerColor !== -1) {
      gl.uniform4fv(this.unifFireInnerColor, color);
    }
  }
  setFireMiddleColor(color: vec4) {
    this.use();
    if (this.unifFireMiddleColor !== -1) {
      gl.uniform4fv(this.unifFireMiddleColor, color);
    }
  }
  setFireOuterColor(color: vec4) {
    this.use();
    if (this.unifFireOuterColor !== -1) {
      gl.uniform4fv(this.unifFireOuterColor, color);
    }
  }

  setBurnSpeed(burnSpeed: number) {
    this.use();
    if (this.unifBurnSpeed !== -1) {
      gl.uniform1f(this.unifBurnSpeed, burnSpeed);
    }
  }
  setFireDensity(fireDensity: number) {
    this.use();
    if (this.unifFireDensity !== -1) {
      gl.uniform1f(this.unifFireDensity, fireDensity);
    }
  }

  setIsMusicPlaying(isMusicPlaying: number) {
    this.use();
    if (this.unifIsMusicPlaying !== -1) {
      gl.uniform1f(this.unifIsMusicPlaying, isMusicPlaying);
    }
  }
  setAudioHighFreq(audioHighFreq: number) {
    this.use();
    if (this.unifAudioHighFreq !== -1) {
      gl.uniform1f(this.unifAudioHighFreq, audioHighFreq);
    }
  }
  setAudioLowFreq(audioLowFreq: number) {
    this.use();
    if (this.unifAudioLowFreq !== -1) {
      gl.uniform1f(this.unifAudioLowFreq, audioLowFreq);
    }
  }

  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
  }
};

export default ShaderProgram;
