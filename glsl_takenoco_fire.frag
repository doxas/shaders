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
const vec3 cColor = vec3(0.3, 0.1, 0.0);
const vec3 kColor = vec3(1.0, 0.8, 0.4);

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
float waveline(vec2 p){
	float f = smoothstep(0.975, 1.0, cos(p.x * 2.5) - (p.y * 2.5) - 0.75);
	float g = smoothstep(0.975, 1.0, cos(p.x * PI + PI) - (p.y * 4.0) - 0.5);
	float h = smoothstep(0.975, 1.0, cos(p.x * 2.5) - (p.y * 2.5) + 0.5);
	return mix(mix(mix(0.0, 0.3, h), 0.6, g), 0.9, f);
}
float dChoco(vec3 p){
	float rad = -time * 0.2;
	mat3 m = mat3(cos(rad), 0.0, -sin(rad), 0.0, 1.0, 0.0, sin(rad), 0.0, cos(rad));
	vec3 q = m * p;
	float e = 1.0 - p.y * 0.7;
	float w = waveline(vec2(atan(q.z, q.x) / PI, p.y + 0.25)) * 0.15;
	return length((q + vec3(0.0, -0.5, 0.0)) * vec3(e, 0.5, e)) + p.y - 0.5 + step(p.y, -1.2) * 2.0 - w;
}
float dCylinder(vec3 p, vec2 r){
	vec2 d = abs(vec2(length(p.xz), p.y)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.25 + step(-1.0, p.y) + step(p.y, -1.5);
}
Intersect distanceHub(vec3 p){
	float choco = dChoco(p);
	float cylin = dCylinder(p, vec2(0.5, 2.0));
	Intersect i;
	i.dist = min(cylin, choco);
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
		rLen += intersect.dist * 0.2;
		rPos = cPos + ray * rLen;
	}

	if(abs(intersect.dist) < 0.001){
		float fog = smoothstep(0.0, 15.0, length(rPos - cPos));
		vec3  normal = genNormal(rPos);
		vec3  light = normalize(vec3(mouse + 2.0, 3.0));
		float diff = max(dot(normal, light), 0.05);
		vec3  eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		vec3 specColor = pow(speculer, 20.0) + cColor;
		gl_FragColor = vec4(vec3(diff) * intersect.color - fog + specColor, 1.0);
	}else{
		vec2 c = gl_FragCoord.xy / resolution;
		vec2 t = vec2(c.s, c.t - (3.0 / resolution.y));
		vec4 texColor = texture2D(backbuffer, t);
		float n = seamless(p - vec2(0.0, time), p / 2.0, vec2(2.0));
		float f = min(0.1 / abs(p.x), 1.0) * min(1.0 - p.y, 1.0);
		vec3 fire = texColor.rgb * (vec3(1.0, 0.3, 0.0) + pow(n * 3.0, 2.0)) * 0.95 * f;
		gl_FragColor = vec4(fire, 1.0);
	}
}


