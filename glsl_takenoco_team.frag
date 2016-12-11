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
float dFloor(vec3 p){
	return dot(p, vec3(0.0, 1.0, 0.0)) + 1.5;
}
float dCylinder(vec3 p, vec2 r){
	vec2 d = abs(vec2(length(p.xz), p.y)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.25 + step(-1.0, p.y);
}
Intersect distanceHub(vec3 p){
	vec3 q = vec3(mod(p, 3.0) - 1.5);
	q = vec3(q.x, p.y, q.z);
	float choco = dChoco(q);
	float flor = dFloor(q);
	float cylin = dCylinder(q, vec2(0.5, 2.0));
	Intersect i;
	i.dist = min(cylin, min(choco, flor));
	i.color = cylin < min(choco, flor) ? kColor : choco < flor ? cColor : fColor;
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
	float t = mod(time, 3.0);
	vec3 cPos = vec3(0.0,  3.0,  3.0 - t - abs(sin(time * PI)));
	vec3 cDir = vec3(0.0,  0.0, -1.0);
	vec3 cUp  = vec3(0.0,  1.0,  0.0);
	vec3 cSide = cross(cDir, cUp);
	float targetDepth = 2.0;
	vec3 ray = normalize(cSide * p.x + cUp * p.y + cDir * targetDepth);

	float dist = 0.0;
	float rLen = 0.0;
	vec3  rPos = cPos;
	Intersect intersect;
	for(int i = 0; i < 512; ++i){
		intersect = distanceHub(rPos);
		rLen += intersect.dist * 0.3;
		rPos = cPos + ray * rLen;
	}

	if(abs(intersect.dist) < 0.001){
		float fog = smoothstep(0.0, 100.0, length(rPos - cPos));
		vec3  normal = genNormal(rPos);
		vec3  light = normalize(vec3(mouse + 2.0, 3.0));
		float diff = max(dot(normal, light), 0.1);
		vec3  eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		vec3 specColor = pow(speculer, 20.0) + cColor;
		gl_FragColor = vec4(vec3(diff) * intersect.color + fog * vec3(3.0, 1.0, 0.8) + specColor, 1.0);
	}else{
		float s = 0.1 / length(p - vec2(0.0, 0.75));
		gl_FragColor = vec4(vec3(1.0) - pow(min(s, 1.0), 2.0) * vec3(0.0, 0.65, 0.85), 1.0);
	}
}

