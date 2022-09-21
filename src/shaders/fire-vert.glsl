#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform int u_TimeVs; 

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_LightVec;       // The direction in which our virtual light lies, relative to each vertex. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

const vec4 lightPos = vec4(5, 5, 3, 1); //The position of our virtual light, which is used to compute the shading of
                                        //the geometry in the fragment shader.

float remap(float val, float oldmin, float oldmax, float newmin, float newmax) {
    float normalized = (val - oldmin)/(oldmax - oldmin);
    return (normalized * (newmax - newmin)) + newmin;
}

float noise3D( vec3 p ) {
    return fract(sin(dot(p, vec3(127.1f, 311.7f, 213.f)))
                 * 43758.5453f);
}
float interpNoise3D(float x, float y, float z) {
    int intX = int(floor(x));
    float fractX = fract(x);
    int intY = int(floor(y));
    float fractY = fract(y);
    int intZ = int(floor(z));
    float fractZ = fract(z);

    float v1 = noise3D(vec3(intX, intY, intZ));
    float v2 = noise3D(vec3(intX+1, intY, intZ));
    float v3 = noise3D(vec3(intX, intY+1, intZ));
    float v4 = noise3D(vec3(intX+1, intY+1, intZ));
    float v5 = noise3D(vec3(intX, intY, intZ+1));
    float v6 = noise3D(vec3(intX+1, intY, intZ+1));
    float v7 = noise3D(vec3(intX, intY+1, intZ+1));
    float v8 = noise3D(vec3(intX+1, intY+1, intZ+1));
    
    float i1 = mix(v1, v2, fractX);
    float i2 = mix(v3, v4, fractX);
    float i3 = mix(v5, v6, fractX);
    float i4 = mix(v7, v8, fractX);

    float m1 = mix(i1, i2, fractY);
    float m2 = mix(i3, i4, fractY);

    return mix(m1, m2, fractZ);
}

float fbm(float x, float y, float z, float freq, float amp, int octaves, float persistence) {
    float total = 0.0;

    for(int i = 1; i <= octaves; i++) {
        total += interpNoise3D(x * freq,
                               y * freq,
                               z * freq) * amp;

        freq *= 2.0;
        amp *= persistence;
    }
    return total;
}

void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.


    vec4 modelposition = u_Model * vs_Pos;   // Temporarily store the transformed vertex positions for use below

    fs_LightVec = lightPos - modelposition;  // Compute the direction in which the light source lies

    vec4 deformedModelPos = modelposition;

    float time = float(u_TimeVs) + 1000.0; // offset of 1000 so it starts at a shape i like lol
    vec4 posInput = modelposition + vec4(time)/1000.0;

    // deform overall shape for non spherical appearance
    float freq1 = 1.0;
    float amp1 = 0.8; 
    int octaves1 = 6;
    float persistence1 = 0.5;
    deformedModelPos[0] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq1, amp1, octaves1, persistence1); 
    deformedModelPos[1] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq1, amp1, octaves1, persistence1); 
    deformedModelPos[2] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq1, amp1, octaves1, persistence1); 

    //add some finer noise to make the surface rough
    float freq2 = 8.0;
    float amp2 = 0.05; 
    int octaves2 = 10;
    float persistence2 = 0.7;
    deformedModelPos[0] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq2, amp2, octaves2, persistence2); 
    deformedModelPos[1] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq2, amp2, octaves2, persistence2); 
    deformedModelPos[2] *= 1.0 + fbm(posInput[0], posInput[1], posInput[2], freq2, amp2, octaves2, persistence2); 

    gl_Position = u_ViewProj * deformedModelPos;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
}
