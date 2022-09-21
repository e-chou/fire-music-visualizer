#version 300 es

// technique to raymarch to fake volume partially referenced from https://www.shadertoy.com/view/4ssGzn 

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
uniform int u_TimeFs; 
uniform vec3 u_CameraPos;
uniform mat4 u_ViewProj;

uniform vec4 u_SmokeInnerColor;
uniform vec4 u_SmokeMiddleColor;
uniform vec4 u_SmokeOuterColor;
uniform vec4 u_FireInnerColor;
uniform vec4 u_FireMiddleColor;
uniform vec4 u_FireOuterColor;

uniform float u_BurnSpeed;
uniform float u_FireDensity;

uniform float u_IsMusicPlaying;
uniform float u_AudioHighFreq;
uniform float u_AudioLowFreq;

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

////////////////////-------------- UTILITIES --------------////////////////////
vec4 vec3ToVec4(vec3 vec, float f) {
    return vec4(vec[0], vec[1], vec[2], f);
}

vec3 vec4ToVec3(vec4 vec) {
    return vec3(vec[0], vec[1], vec[2]);
}

float remap(float val, float oldmin, float oldmax, float newmin, float newmax) {
    float normalized = (val - oldmin)/(oldmax - oldmin);
    return (normalized * (newmax - newmin)) + newmin;
}

////////////////////-------------- TOOLBOX FUNCTIONS --------------////////////////////
float getBias(float x, float bias)
{
  return (x / ((((1.0/bias) - 2.0)*(1.0 - x))+1.0));
}

float getGain(float x, float gain)
{
  if(x < 0.5)
    return getBias(x * 2.0,gain)/2.0;
  else
    return getBias(x * 2.0 - 1.0,1.0 - gain)/2.0 + 0.5;
}

float easeInOutQuad(float x) {
    return x < 0.5 ? 2.0 * x * x : 1.0 - pow(-2.0 * x + 2.0, 2.0) / 2.0;
}

float easeInQuad(float x) {
    return x * x;
}

float easeOutQuad(float x){
    return 1.0 - (1.0 - x) * (1.0 - x);
}

float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
}
////////////////////-------------- NOISE FUNCTIONS --------------////////////////////

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
    
    float i1 = mix(v1, v2, easeInOutQuad(fractX));
    float i2 = mix(v3, v4, easeInOutQuad(fractX));
    float i3 = mix(v5, v6, easeInOutQuad(fractX));
    float i4 = mix(v7, v8, easeInOutQuad(fractX));

    float m1 = mix(i1, i2, easeInOutQuad(fractY));
    float m2 = mix(i3, i4, easeInOutQuad(fractY));

    return mix(m1, m2, easeInOutQuad(fractZ));
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

// takes in a position and calculates distance from fire cloud (+ means )
// (distance from fire cloud = position dist from sphere + fbm(position)), fbm is what results in "cloud" look
float distanceFromCloud(vec3 pos){
    // 1 is sphere radius, a smaller fakeRadius gives less of an obvious sphere shape to the fire by essentially treating the sphere as smaller
    float pct = 1.0-easeInOutCubic(remap(pos.y, -0.5, 0.5, 0.0, 1.0));
    float fakeRadius = remap(pct, 0.0, 1.0, 0.45, 0.8) * remap(u_FireDensity, 0.8, 1.2, 0.6, 1.0);
    // use audio to drive fake radius (higher levels = larger fake radius)
    if(u_IsMusicPlaying == 1.0) {
        fakeRadius *= remap(u_AudioLowFreq, 0.0, 255.0, 0.5, 1.0);
    }
    float distFromSphere = length(pos) - fakeRadius; 

    // offset input pos based on time so fire moves
    float timeOffset = -float(u_TimeFs)/300.0 * u_BurnSpeed;
    vec3 fbmInputPos = pos + vec3(0.0, timeOffset, 0.0);

    // note the fbm needs to have the same  inputs as the vertex shader so the color can be driven by the displacement
    // can't pass disp directly because need it as a function so many positions can be tested for the ray march
    float distFromCloud = distFromSphere + fbm(fbmInputPos[0], fbmInputPos[1], fbmInputPos[2], 5.0, 0.5, 6, 0.5); 
    return distFromCloud;
}

// calculates color based on distance
vec4 convertDistToColor(float dist, vec3 pos){
    vec4 bottomColor = vec4(0.0);
    vec4 topColor = vec4(0.0);
    vec4 backgroundColor = vec4(0.0, 0.0, 0.0, 1.0);
    float step = 0.1;

    vec4 color1b = u_FireInnerColor;
    vec4 color2b = u_FireMiddleColor;
    vec4 color3b = u_FireOuterColor;
    if (dist < step*1.0) {
        bottomColor = mix(color1b, color2b, easeInQuad(remap(dist, 0.0, step*1.0, 0.0, 1.0)));
    } else if (dist < step*2.0) {
        bottomColor = mix(color2b, color3b, easeInQuad(remap(dist, step*1.0, step*2.0, 0.0, 1.0)));
    } else if (dist < step*3.0) {
        bottomColor = mix(color3b, backgroundColor, easeOutQuad(remap(dist, step*2.0, step*3.0, 0.0, 1.0)));
    } else {
        bottomColor = backgroundColor;
    }

    vec4 color1t = u_SmokeInnerColor;
    vec4 color2t = u_SmokeMiddleColor;
    vec4 color3t = u_SmokeOuterColor;
    if (dist < step*1.0) {
        topColor = mix(color1t, color2t, easeInQuad(remap(dist, 0.0, step*1.0, 0.0, 1.0)));
    } else if (dist < step*2.0) {
        topColor = mix(color2t, color3t, easeInQuad(remap(dist, step*1.0, step*2.0, 0.0, 1.0)));
    } else if (dist < step*3.0) {
        topColor = mix(color3t, backgroundColor, easeOutQuad(remap(dist, step*2.0, step*3.0, 0.0, 1.0)));
    } else {
        topColor = backgroundColor;
    }

    float pct = remap(pos.y, -0.5, 0.5, 0.0, 1.0);
    pct = getBias(pct, 0.6); // makes sure theres enough blue
    pct = getGain(pct, 0.25); // gets rid of some of the nasty pink
    // bias based on sound (higher levels = redder)
    if(u_IsMusicPlaying == 1.0) {
        pct = getBias(pct, 1.0-remap(u_AudioHighFreq, 0.0, 255.0, 0.4, 0.8));
    }
    return mix(bottomColor, topColor, pct);
}

// calculates color from position, warps actual position to give spiral-y effect
vec4 convertPosToColor(vec3 pos){
    vec3 warpedPos = pos;

    // tbh the warping is ugly so disabling it for now
    /*
    // add noise
    //warpedPos = warpedPos + fbm(warpedPos[0], warpedPos[1], warpedPos[2], 1.0, 0.5);
    // rotate
    float theta = warpedPos[1]*3.0 + 2.0*3.1415*sin(float(u_TimeFs)/1000.0);
    warpedPos = vec3(cos(theta)*warpedPos[0] + sin(theta)*warpedPos[2], warpedPos[1], -sin(theta)*warpedPos[1]+cos(theta)*warpedPos[2]);
    */

    float dist = distanceFromCloud(warpedPos);
    vec4 color = convertDistToColor(dist, pos);
    return color;
}

// ray marches throuhg fire accumulating color
// ray march starts from position behind fragment a set number of setps
vec4 rayMarchForColor(vec3 rayStartPos, int numSteps, vec3 rayIncrDir){
    vec3 currPos = rayStartPos;
    vec4 accumColor = vec4(0.2, 0.2, 0.2, 0.0); // starts as color of background

    float pct = 1.0-easeInOutCubic(remap(rayStartPos.y, -0.6, 0.6, 0.0, 1.0));
    float transparencyScale = remap(pct, 0.0, 1.0, 0.2, 0.5) * u_FireDensity;

	for(int i=0; i<numSteps; i++) {
		vec4 currCol = convertPosToColor(currPos);

		accumColor += currCol * transparencyScale;	
		currPos += rayIncrDir;
	}
	return accumColor;
}

void main()
{
    // drxn from camera to fragment
    vec3 lookDrxn = normalize(vec4ToVec3(vec4(0.0, 0.0, 1.0, 1.0) * u_ViewProj));
    
    // ray march to get color
    vec3 rayMarchStartPos = vec3(fs_Nor[0],fs_Nor[1],fs_Nor[2]) - lookDrxn;
    out_Col =  rayMarchForColor(rayMarchStartPos, 20, lookDrxn*0.1);
}
