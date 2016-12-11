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
const vec3 cColor = vec3(0.25, 0.1, 0.0);
const vec3 kColor = vec3(0.9, 0.8, 0.4);

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
float dChoco(vec3 p){
	float rad = time * 0.2;
	mat3 m = mat3(cos(rad), 0.0, -sin(rad), 0.0, 1.0, 0.0, sin(rad), 0.0, cos(rad));
	vec3 q = m * (p + vec3(0.0, -0.55, 0.0)) * vec3(1.0, 1.2, 1.0);
	float len = sin(atan(q.z, q.x) * 7.0) * 0.01 * PI;
	return length(q) - 1.0 + len + step(p.y, -0.4) + pow(p.y, 1.0);
}
float dCylinder(vec3 p, vec2 r){
	float rad = time * 0.2;
	mat3 m = mat3(cos(rad), 0.0, -sin(rad), 0.0, 1.0, 0.0, sin(rad), 0.0, cos(rad));
	float s = -cos(p.y * 2.0) * 0.1 - 0.05;
	float l = length(p + vec3(0.0, 1.25, 0.0)) - 0.4;
	vec3 q = m * p + vec3(s, 0.5, 0.0);
	vec2 d = abs(vec2(length(q.xz), q.y)) - r;
	return smoothMin(min(max(d.x, d.y), 0.0), l, 32.0) + length(max(d, 0.0)) - 0.2;
}
Intersect distanceHub(vec3 p){
	float choco = dChoco(p);
	float cylin = dCylinder(p, vec2(0.1, 0.9));
	Intersect i;
	i.dist = min(choco, cylin);
	i.color = choco < cylin ? cColor : kColor;
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
	vec3 cPos = vec3(0.0,  0.0,  3.0);
	vec3 cDir = vec3(0.0,  0.0, -1.0);
	vec3 cUp  = vec3(0.0,  1.0,  0.0);
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

	float tk = min(time * 0.2, 1.0);
	float tf = min((time - 4.0) * 0.2, 1.0);
	if(abs(intersect.dist) < 0.001){
		float fog = smoothstep(0.0, 15.0, length(rPos - cPos));
		vec3  normal = genNormal(rPos);
		vec3  light = normalize(vec3(mouse + 2.0, 3.0));
		float diff = max(dot(normal, light), 0.1);
		vec3  eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		vec3 specColor = pow(speculer, 20.0) + cColor;
		gl_FragColor = vec4(vec3(diff) * intersect.color * tk - fog + specColor, 1.0);
	}else{
		float f = pow((0.5 + tf * 0.5) / length(p), 3.0);
		float map = 2.0;
		vec2 c = vec2((atan(p.y, p.x) + PI) / PI2 * 2.0, mod(length(p) * 0.25 - time, map));
		float n = seamless(c, c / map, vec2(map));
		gl_FragColor = vec4(vec3(0.1, 0.3, 1.0) * n * f, 1.0);
	}
}
