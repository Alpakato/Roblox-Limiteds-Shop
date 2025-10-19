// src/components/HeroScene.tsx
'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

type Props = {
  count?: number
  speed?: number
  spreadX?: number
  spreadY?: number
  radius?: number
  softness?: number
  parallax?: number
}

const MAX_BLOBS = 16

function FullscreenGradient({
  count = 12,
  speed = 0.5,
  spreadX = 0.8,
  spreadY = 0.35,
  radius = 0.5,
  softness = 0.32,
  parallax = 0.12,
}: Props) {
  const mesh = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const { viewport, size } = useThree()

  // โทน Dark Roblox Duo: แดงเข้ม + น้ำเงินเข้ม (มี accent น้ำเงินสว่างนิด ๆ)
  const palette = useMemo(
    () => [
      new THREE.Color('#991B1B'), // dark red
      new THREE.Color('#DC2626'), // bright red
      new THREE.Color('#1E3A8A'), // navy blue
      new THREE.Color('#2563EB'), // royal blue
      new THREE.Color('#4C1D95'), // deep indigo (ผสมแดง-น้ำเงิน)
      new THREE.Color('#3B82F6'), // accent blue
    ],
    []
  )

  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uColors: { value: palette }, // vec3[6]
      uCount: { value: Math.min(MAX_BLOBS, Math.max(1, count)) },
      uSpeed: { value: speed },
      uRadius: { value: radius },
      uSoft: { value: softness },
      uParallax: { value: parallax },
      uSpreadX: { value: spreadX },
      uSpreadY: { value: spreadY },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }

    const vertex = /* glsl */`
      varying vec2 vUv;
      void main () {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const fragment = /* glsl */`
      precision mediump float;

      varying vec2 vUv;

      uniform float uTime;
      uniform vec2  uResolution;
      uniform vec3  uColors[6];

      uniform int   uCount;
      uniform float uSpeed;
      uniform float uRadius;
      uniform float uSoft;
      uniform float uParallax;
      uniform float uSpreadX;
      uniform float uSpreadY;
      uniform vec2  uPointer;

      const vec2 BASES[16] = vec2[](
        vec2(0.10,0.24), vec2(0.90,0.22), vec2(0.22,0.78), vec2(0.78,0.76),
        vec2(0.50,0.55), vec2(0.34,0.36), vec2(0.66,0.34), vec2(0.16,0.60),
        vec2(0.84,0.58), vec2(0.44,0.18), vec2(0.58,0.86), vec2(0.06,0.42),
        vec2(0.94,0.34), vec2(0.32,0.64), vec2(0.68,0.60), vec2(0.52,0.26)
      );

      float hash11(float p) {
        return fract(sin(p*127.1)*43758.5453123);
      }
      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

      // 1) soft circle
      float softCircle(vec2 uv, vec2 c, float r, float s) {
        float d = distance(uv, c);
        return smoothstep(r, r - s, d);
      }

      // 2) soft superellipse (L^p norm) + anisotropy + rotation
      float softSuperellipse(vec2 uv, vec2 c, float rx, float ry, float p, float s, float angle) {
        vec2 d = (uv - c) * rot(-angle);
        float lp = pow(abs(d.x)/rx, p) + pow(abs(d.y)/ry, p);
        float f  = pow(lp, 1.0/p);
        return smoothstep(1.0, 1.0 - s, f);
      }

      // 3) soft diamond (L^1 norm) + anisotropy + rotation
      float softDiamond(vec2 uv, vec2 c, float rx, float ry, float s, float angle) {
        vec2 d = (uv - c) * rot(-angle);
        float f = abs(d.x)/rx + abs(d.y)/ry;
        return smoothstep(1.0, 1.0 - s, f);
      }

      // 4) soft capsule (ระยะจากแกน x หมุน + ปรับความยาว)
      float softCapsule(vec2 uv, vec2 c, float rx, float ry, float len, float s, float angle) {
        // ทำให้เป็นแกนตรงกลางยาว len แล้วปวมด้วยรีเดียส (rx, ry)
        vec2 p = (uv - c) * rot(-angle);
        // squash ให้เป็นรี
        p = vec2(p.x/len, p.y);
        float d = length(vec2(p.x, p.y/ry)); // วงรีคร่าว ๆ บนแกน
        return smoothstep(1.0, 1.0 - s, d);
      }

      // 5) soft ring (โดนัท) + anisotropy + rotation
      float softRing(vec2 uv, vec2 c, float rOuter, float thickness, float s, float angle) {
        vec2 d = (uv - c) * rot(-angle);
        float rr = length(d);
        float rInner = max(0.0001, rOuter - thickness);
        float edgeOuter = smoothstep(rOuter, rOuter - s, rr);
        float edgeInner = 1.0 - smoothstep(rInner, rInner - s, rr);
        return edgeOuter * edgeInner;
      }

      vec3 aces(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
      }

      void main () {
        vec2 uv = vUv;

        // รักษาอัตราส่วน (content หน้ากว้าง)
        float aspect = uResolution.x / uResolution.y;
        uv.x = (uv.x - 0.5) * aspect + 0.5;

        // parallax: เน้น X นิด
        vec2 par = vec2(uPointer.x * 1.1, -uPointer.y) * uParallax;
        uv += par * 0.05;

        float t = uTime * uSpeed;

        vec3 col = vec3(0.0);

        for (int i = 0; i < ${MAX_BLOBS}; i++) {
          if (i >= uCount) break;

          float fi = float(i);
          float ph = hash11(fi*7.0) * 6.2831;
          float f1 = 0.6 + hash11(fi*11.0) * 1.0;
          float f2 = 0.5 + hash11(fi*17.0) * 1.0;

          // จุดฐาน + เคลื่อนไหว (X กระจายมากกว่า Y)
          vec2 wob  = vec2(
            sin(t*f1 + ph) * (uSpreadX + 0.12*hash11(fi*23.0)),
            cos(t*f2 + ph*0.7) * (uSpreadY + 0.06*hash11(fi*29.0))
          ) * 0.45;

          vec2 base = BASES[i] + vec2(0.0, -0.05);
          float depth = 0.5 + 0.5*hash11(fi*41.0);
          vec2 center = base + wob + par * (0.14 * depth);

          // พารามิเตอร์ทรงสุ่ม
          float angle = ph + t * (0.05 + 0.05*hash11(fi*67.0)); // หมุนช้า ๆ
          // อัตราส่วนแกน (ยืด/บีบ)
          float ax = 0.85 + 0.6*hash11(fi*71.0);
          float ay = 0.85 + 0.6*hash11(fi*73.0);
          // กำลังของ superellipse (p=2 คือวงกลม)
          float pe = 1.4 + 2.2*hash11(fi*79.0);

          float r = uRadius * (0.85 + 0.35*hash11(fi*53.0));
          float s = uSoft  * (0.85 + 0.35*hash11(fi*59.0));

          // เลือกทรง (0..4)
          float pick = hash11(fi*97.0);
          float w = 0.0;
          if (pick < 0.20) {
            w = pow(softCircle(uv, center, r, s), 1.2);
          } else if (pick < 0.45) {
            w = softSuperellipse(uv, center, r*ax, r*ay, pe, s, angle);
          } else if (pick < 0.65) {
            w = softDiamond(uv, center, r*ax, r*ay, s, angle);
          } else if (pick < 0.85) {
            // capsule: ความยาวแกนรวม len=1.0..1.6
            float len = 1.0 + 0.6*hash11(fi*101.0);
            w = softCapsule(uv, center, r*ax, r*ay, len, s, angle);
          } else {
            // ring: โดนัทหนา/บางต่างกัน
            float thick = r * (0.35 + 0.35*hash11(fi*103.0));
            w = softRing(uv, center, r, thick, s, angle);
          }

          // สีตามพาเลต + depth
          vec3 c = uColors[i % 6] * mix(0.82, 1.0, depth);
          col += c * pow(w, 1.1);
        }

        // vignette
        float v = smoothstep(0.985, 0.52, distance(uv, vec2(0.5, 0.5)));
        col *= mix(1.0, v, 0.40);

        // tone-map + gamma
        col = aces(col * 0.9);
        col = pow(col, vec3(1.0/2.2));

        gl_FragColor = vec4(col, 1.0);
      }
    `

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true, // ซ้อนกับ gradient พื้นหลัง
    })

    matRef.current = mat
    return mat
  }, [palette, size.width, size.height, count, speed, spreadX, spreadY, radius, softness, parallax])

  // อัปเดตเวลา/ขนาด/พอยน์เตอร์
  useFrame((state, dt) => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uTime.value += dt
    ;(mat.uniforms.uResolution.value as THREE.Vector2).set(size.width, size.height)
    const p = mat.uniforms.uPointer.value as THREE.Vector2
    p.x = THREE.MathUtils.lerp(p.x, state.pointer.x, 0.08)
    p.y = THREE.MathUtils.lerp(p.y, state.pointer.y, 0.08)
  })

  return (
    <mesh ref={mesh} scale={[viewport.width * 1.12, viewport.height * 1.12, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default function HeroScene(props: Props) {
  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], zoom: 100 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)} // โปร่งใส
      >
        <FullscreenGradient {...props} />
      </Canvas>
    </div>
  )
}
