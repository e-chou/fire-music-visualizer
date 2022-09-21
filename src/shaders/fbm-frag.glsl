#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;

uniform vec4 u_Color; // The color with which to render this instance of geometry.

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

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

float fbm(float x, float y, float z) {
    float total = 0.0;
    float persistence = 0.5;
    int octaves = 8;
    float freq = 2.0;
    float amp = 0.5;

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
    out_Col =  fbm(fs_Nor[0],fs_Nor[1],fs_Nor[2]) * u_Color;
}
