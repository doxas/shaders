precision mediump float;
uniform vec2  resolution;
uniform vec2  mouse;
uniform float time;
uniform sampler2D backbuffer;

struct Intersect{
	float dist;
	vec3  color;
};
const float PI = 3.1415926;
const float PI2 = PI * 2.0;
const vec3 cColor = vec3(0.7, 0.4, 0.2);
const vec3 kColor = vec3(0.9, 0.9, 0.9);

float rnd(vec2 n) {
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
float noise(vec2 p){
	vec2 v = floor(p);
	vec2 u = fract(p);
	u = u * u * (3.0 - 2.0 * u);
	float r = mix(
		mix(rnd(v), rnd(v + vec2(1.0, 0.0)), u.x),
		mix(rnd(v + vec2(0.0, 1.0)), rnd(v + vec2(1.0, 1.0)), u.x),
		u.y
	);
	return r * r;
}
float snoise(vec2 p){
	float n = 0.0;
	for(float i = 0.0; i < 6.0; ++i){
		float v = pow(2.0, 2.0 + i);
		float w = pow(2.0, -1.0 - i);
		n += noise(p * v) * w;
	}
	return n;
}
float seamless(vec2 p, vec2 q, vec2 r){
	return snoise(vec2(p.x,	   p.y	  )) *		q.x  *		q.y  +
		   snoise(vec2(p.x,	   p.y + r.y)) *		q.x  * (1.0 - q.y) +
		   snoise(vec2(p.x + r.x, p.y	  )) * (1.0 - q.x) *		q.y  +
		   snoise(vec2(p.x + r.x, p.y + r.y)) * (1.0 - q.x) * (1.0 - q.y);
}
float smoothMin(float d1, float d2, float k){
	float h = exp(-k * d1) + exp(-k * d2);
	return -log(h) / k;
}
float dChoco(vec3 p, vec2 r){
	float f = sin(length((p.xz + vec2(0.5, -0.5)) * 10.0) - time * 3.0) * 0.025;
	vec2 d = abs(vec2(length(p.xz), p.y - f)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float dCylinder(vec3 p, vec2 r){
	vec2 d = abs(vec2(length(p.xz), p.y)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.1;
}
float dTorus(vec3 p){
	vec3 q = p * vec3(1.75, 1.25, 1.0) + vec3(-1.45, 0.0, 0.0);
    vec2 t = vec2(0.5, 0.1);
    vec2 r = vec2(length(q.xy) - t.x, q.z);
    return length(r) - t.y;
}
Intersect distanceHub(vec3 p){
	float choco = dChoco(p, vec2(0.5, 0.4));
	float cylin = dCylinder(p, vec2(0.6, 0.5));
	float hole = dCylinder(p, vec2(0.5, 0.6));
	float torus = dTorus(p);
	Intersect i;
	i.dist = min(torus, min(choco, max(cylin, -hole)));
	i.color = choco < max(cylin, -hole) ? cColor : kColor;
	return i;
}
vec3 genNormal(vec3 p){
	float d = 0.001;
	return normalize(vec3(
		distanceHub(p + vec3(  d, 0.0, 0.0)).dist - distanceHub(p + vec3( -d, 0.0, 0.0)).dist,
		distanceHub(p + vec3(0.0,   d, 0.0)).dist - distanceHub(p + vec3(0.0,  -d, 0.0)).dist,
		distanceHub(p + vec3(0.0, 0.0,   d)).dist - distanceHub(p + vec3(0.0, 0.0,  -d)).dist
	));
}

void main(){
	vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
	vec3 cPos = vec3(0.0,  1.5,  2.0);
	vec3 cDir = vec3(0.0, -0.6, -0.8);
	vec3 cUp  = vec3(0.0,  0.8, -0.6);
	vec3 cSide = cross(cDir, cUp);
	float targetDepth = 1.0;
	vec3 ray = normalize(cSide * p.x + cUp * p.y + cDir * targetDepth);

	float dist = 0.0;
	float rLen = 0.0;
	vec3  rPos = cPos;
	Intersect intersect;
	for(int i = 0; i < 256; ++i){
		intersect = distanceHub(rPos);
		rLen += intersect.dist * 0.5;
		rPos = cPos + ray * rLen;
	}

	float n = clamp(seamless(p - vec2(sin(time * 0.05), time * 0.2), vec2(2.0), vec2(2.0)), 0.0, 1.0);
	float m = clamp(seamless(p - vec2(sin(time * 0.2), time * 0.1), vec2(2.0), vec2(2.0)), 0.0, 1.0);
	float l = clamp(seamless(p - vec2(cos(time * 0.15), time * 0.15), vec2(2.0), vec2(2.0)), 0.0, 1.0);
	float c = max(cos(p.x * 3.0), 0.0);
    float f = max(cos(p.x * 2.5) - (-(p.y - 0.5) * 1.5), 0.0);
	float smoke = n * m * l * f * c * 0.35;
	if(abs(intersect.dist) < 0.001){
		float fog = smoothstep(0.0, 55.0, length(rPos - cPos));
		vec3  normal = genNormal(rPos);
		vec3  light = normalize(vec3(0.5, 2.0, 1.5));
		float diff = max(dot(normal, light), 0.3);
		vec3  eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		speculer = pow(speculer, 20.0);
		gl_FragColor = vec4(vec3(diff) * intersect.color - fog + speculer + smoke, 1.0);
	}else{
		gl_FragColor = vec4(vec3(smoke), 1.0);
	}
}

