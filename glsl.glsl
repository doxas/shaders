precision mediump float;
uniform vec2  resolution;
uniform vec2  mouse;
uniform float time;
uniform sampler2D prevScene;

const float PI  = 3.1415926;
const float PI2 = PI * 2.0;
const float PIH = PI / 2.0;

// distance functions
float dSphere(vec3 p){
	return length(p) - 1.0;
}
float dCube(vec3 p, vec3 s, float e){
	vec3 q = abs(p);
	return length(max(q - s, 0.0)) - e;
}
float dFloor(vec3 p, float h){
	return dot(p, vec3(0.0, 1.0, 0.0)) + h;
}
float dCylinderY(vec3 p, vec2 r, float e){
	vec2 d = abs(vec2(length(p.xz), p.y)) - r;
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - e;
}
float dCone(vec3 p, vec3 c){
	vec2 q = vec2(length(p.xz), p.y);
	float d = -q.y - c.y;
	float e = max(dot(q, c.xz), p.y);
	return length(max(vec2(d, e), 0.0)) + min(max(d, e), 0.0);
}

// distance
float distanceHub(vec3 p){
	return min(
//		dCube(p, vec3(0.2, 0.2, 0.5), 0.1), min(
//		dCylinderY(p, vec2(0.2, 1.0), 0.1), min(
		dCone(p, vec3(1.5, 1.5, 1.2)),
		dFloor(p, 1.25)
	);
//	)));
}

vec3 genNormal(vec3 p){
	float d = 0.001;
	return normalize(vec3(
		distanceHub(p + vec3(  d, 0.0, 0.0)) - distanceHub(p + vec3( -d, 0.0, 0.0)),
		distanceHub(p + vec3(0.0,   d, 0.0)) - distanceHub(p + vec3(0.0,  -d, 0.0)),
		distanceHub(p + vec3(0.0, 0.0,   d)) - distanceHub(p + vec3(0.0, 0.0,  -d))
	));
}

void main(){
	vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
	vec3 cPos = vec3(0.0, 0.0, 3.0);
	vec3 cDir = -normalize(cPos);
	vec3 cUp  = vec3(0.0,  1.0,  0.0);
	vec3 cSide = cross(cDir, cUp);
	float targetDepth = 1.0;
	vec3 ray = normalize(cSide * p.x + cUp * p.y + cDir * targetDepth);

	float dist = 0.0;
	float rLen = 0.0;
	vec3  rPos = cPos;
	for(int i = 0; i < 128; ++i){
		dist = distanceHub(rPos);
		rLen += dist;
		rPos = cPos + ray * rLen;
	}

	if(abs(dist) < 0.001){
		float fog = 1.0 - smoothstep(0.0, 20.0, length(rPos - cPos));
		vec3 normal = genNormal(rPos);
		vec3 light = normalize(vec3(3.0, 3.0, 0.0));
		float diff = max(dot(normal, light), 0.1);
		vec3 eye = reflect(normalize(rPos - cPos), normal);
		float speculer = clamp(dot(eye, light), 0.0, 1.0);
		speculer = pow(speculer, 20.0);
		gl_FragColor = vec4(vec3(diff + speculer) * fog * normal, 1.0);
	}else{
		gl_FragColor = vec4(vec3(0.0), 1.0);
	}
}

