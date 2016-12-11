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
const vec3 fColor = vec3(0.2, 0.7, 0.1);
const vec3 kColor = vec3(0.9, 0.8, 0.4);

float smoothMin(float d1, float d2, float k){
	float h = exp(-k * d1) + exp(-k * d2);
	return -log(h) / k;
}
float dChocokino(vec3 p){
	vec3 q = (p + vec3(0.0, -0.55, 0.0)) * vec3(1.0, 1.2, 1.0);
	float len = sin(atan(q.z, q.x) * 7.0) * 0.01 * PI;
	return length(q) - 1.0 + len + step(p.y, -0.4) + pow(p.y, 1.0);
}
float dCylinderkino(vec3 p, vec2 r){
	float s = -cos(p.y * 2.0) * 0.1 - 0.05;
	float l = length(p + vec3(0.0, 1.25, 0.0)) - 0.4;
	vec3 q = p + vec3(s, 0.5, 0.0);
	vec2 d = abs(vec2(length(q.xz), q.y)) - r;
	return smoothMin(min(max(d.x, d.y), 0.0), l, 32.0) + length(max(d, 0.0)) - 0.2;
}
float waveline(vec2 p){
	float f = smoothstep(0.975, 1.0, cos(p.x * 2.5) - (p.y * 2.5) - 0.75);
	float g = smoothstep(0.975, 1.0, cos(p.x * PI + PI) - (p.y * 4.0) - 0.5);
	float h = smoothstep(0.975, 1.0, cos(p.x * 2.5) - (p.y * 2.5) + 0.5);
	return mix(mix(mix(0.0, 0.3, h), 0.4, g), 0.6, f);
}
float dChoco(vec3 p){
	float e = 1.0 - p.y * 0.7;
	float w = waveline(vec2(atan(p.z, p.x) / PI, p.y + 0.25)) * 0.15;
	return length((p + vec3(0.0, -0.5, 0.0)) * vec3(e, 0.5, e)) + p.y - 0.5 + step(p.y, -1.2) - w;
}
float dCylinder(vec3 p, vec2 r){
	vec2 d = abs(vec2(length(p.xz), p.y)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.25 + step(-1.0, p.y);
}
float dFloor(vec3 p){
	return dot(p, vec3(0.0, 1.0, 0.0)) + 1.5;
}
Intersect distanceHub(vec3 p){
	Intersect i;
	float flor = dFloor(p);
	vec3 q = p + vec3(3.0, 0.0, 0.0);
	if(p.x < 0.0){
		float chocokino = dChocokino(q);
		float cylinkino = dCylinderkino(q, vec2(0.1, 0.9));
		i.dist = min(min(chocokino, flor), cylinkino);
		i.color = cylinkino < min(chocokino, flor) ? kColor : chocokino < flor ? cColor : fColor;
	}else{
		q = p;
		if(p.x > 6.0){
			q = vec3(mod(q, 3.0) - 1.5);
		}else{
			q = q - vec3(3.0, 0.0, 0.0);
		}
		q = vec3(q.x, p.y, q.z);
		float choco = dChoco(q);
		float cylin = dCylinder(q, vec2(0.5, 2.0));
		i.dist = min(cylin, min(choco, flor));
		i.color = cylin < min(choco, flor) ? kColor : choco < flor ? cColor : fColor;
	}
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
	float f = mod(time, 10.0);
	float t = exp(smoothstep(8.0, 9.0, f) * 4.0) - 1.0;
	float u = smoothstep(0.0, 1.0, f);
	vec3 cPos = vec3(0.0,  t,  5.0);
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

	if(abs(intersect.dist) < 0.001){
		float fog = smoothstep(0.0, 30.0, length(rPos - cPos));
		vec3  normal = genNormal(rPos);
		vec3  light = normalize(vec3(mouse + 2.0, 3.0));
		float diff = max(dot(normal, light), 0.1);
		vec3  eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		vec3 specColor = pow(speculer, 20.0) + cColor;
		float d = min(1.0, smoothstep(14.5, 15.0, length(rPos - vec3(25.0 - f * 2.0, 0.0, 0.0))) + 0.5);
		vec3 destColor = vec3(diff) * intersect.color + fog + specColor;
		gl_FragColor = vec4(destColor * d * u, 1.0);
	}else{
		gl_FragColor = vec4(vec3(u), 1.0);
	}
}
