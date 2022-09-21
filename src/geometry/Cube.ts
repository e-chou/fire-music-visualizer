import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Cube extends Drawable {
    indices: Uint32Array;
    positions: Float32Array;
    normals: Float32Array;
    center: vec4;
  
    constructor(center: vec3) {
      super(); // Call the constructor of the super class. This is required.
      this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    }
  
    create() {
  
        this.indices = new Uint32Array([0, 1, 2,
                                        0, 2, 3,
                                        4, 5, 6,
                                        4, 6, 7,
                                        8, 9, 10,
                                        8, 10, 11,
                                        12, 13, 14,
                                        12, 14, 15,
                                        16, 17, 18,
                                        16, 18, 19,
                                        22, 23, 20,
                                        22, 20, 21]);

        this.positions = new Float32Array([-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1, -1, 1, 
                                            1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 
                                            1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 
                                            -1, -1, 1, 1, -1, -1, -1, 1, -1, 1, -1, 1, -1, 1, 1, 1, 
                                            -1, 1, -1, 1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 
                                            1, -1, 1, 1, -1, -1, 1, 1, -1, -1, -1, 1, 1, -1, -1, 1]);
        
        // explanation of the nasty mass of 1s and -1s above:
        // v0pos, v1pos, v2pos, v3pos (F1 vert->idx: 0->0, 1->1, 2->2, 3->3)
        // v1pos, v5pos, v6pos, v2pos (F2 vert->idx: 1->4, 5->5, 6-6, 2->7)
        // v5pos, v4pos, v7pos, v6pos (F3 vert->idx: 5->8, 4->9, 7->10, 6->11)
        // v4pos, v0pos, v3pos, v7pos (F4 vert->idx: 4->12, 0->13, 3->14, 7-> 15)
        // v3pos, v2pos, v6pos, v7pos (F5 vert->idx: 3->16, 2->17, 6->18, 7->19)
        // v5pos, v4pos, v0pos, v1pos (F6 vert->idx: 5->20, 4->21, 0->22, 1->23)
        // v0pos is (-1, -1, -1, 1);
        // v1pos is (1, -1, -1, 1);
        // v2pos is (1, 1, -1, 1);
        // v3pos is (-1, 1, -1, 1);
        // v4pos is (-1, -1, 1, 1);
        // v5pos is (1, -1, 1, 1);
        // v6pos is (1, 1, 1, 1);
        // v7pos is (-1, 1, 1, 1);

        this.normals = this.positions;

        this.generateIdx();
        this.generatePos();
        this.generateNor();

        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        console.log(`Created cube`);
    }
  };
  
  export default Cube;
  