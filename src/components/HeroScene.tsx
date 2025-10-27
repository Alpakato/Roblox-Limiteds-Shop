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

  // Roblox-ish dark duo palette
  const palette = useMemo(
    () => [
      new THREE.Color('#991B1B'),
      new THREE.Color('#DC2626'),
      new THREE.Color('#1E3A8A'),
      new THREE.Color('#2563EB'),
      new THREE.Color('#4C1D95'),
      new THREE.Color('#3B82F6'),
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
      // ใช้ highp เพิ่มเสถียรภาพบนอุปกรณ์/เบราว์เซอร์บางตัว
      precision highp float;

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

      float softCircle(vec2 uv, vec2 c, float r, float s) {
        float d = distance(uv, c);
        return smoothstep(r, r - s, d);
      }
      float softSuperellipse(vec2 uv, vec2 c, float rx, float ry, float p, float s, float angle) {
        vec2 d = (uv - c) * rot(-angle);
        float lp = pow(abs(d.x)/rx, p) + pow(abs(d.y)/ry, p);
        float f  = pow(lp, 1.0/p);
        return smoothstep(1.0, 1.0 - s, f);
      }
      float softDiamond(vec2 uv, vec2 c, float rx, float ry, float s, float angle) {
        vec2 d = (uv - c) * rot(-angle);
        float f = abs(d.x)/rx + abs(d.y)/ry;
        return smoothstep(1.0, 1.0 - s, f);
      }
      float softCapsule(vec2 uv, vec2 c, float rx, float ry, float len, float s, float angle) {
        vec2 p = (uv - c) * rot(-angle);
        p = vec2(p.x/len, p.y);
        float d = length(vec2(p.x, p.y/ry));
        return smoothstep(1.0, 1.0 - s, d);
      }
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

        float aspect = uResolution.x / uResolution.y;
        uv.x = (uv.x - 0.5) * aspect + 0.5;

        // parallax: ลดแอมพลิจูดลงเล็กน้อยให้คงเส้นคงวา
        vec2 par = vec2(uPointer.x * 1.1, -uPointer.y) * (uParallax * 0.85);
        uv += par * 0.045;

        float t = uTime * uSpeed;
        vec3 col = vec3(0.0);

        for (int i = 0; i < ${MAX_BLOBS}; i++) {
          if (i >= uCount) break;

          float fi = float(i);
          float ph = hash11(fi*7.0) * 6.2831;
          float f1 = 0.6 + hash11(fi*11.0) * 1.0;
          float f2 = 0.5 + hash11(fi*17.0) * 1.0;

          // ลด amplitude นิดหน่อยเพื่อกัน “วิ่งเยอะ” บนบางเครื่อง
          vec2 wob  = vec2(
            sin(t*f1 + ph) * (uSpreadX + 0.12*hash11(fi*23.0)),
            cos(t*f2 + ph*0.7) * (uSpreadY + 0.06*hash11(fi*29.0))
          ) * 0.40; // เดิม 0.45

          vec2 base = BASES[i] + vec2(0.0, -0.05);
          float depth = 0.5 + 0.5*hash11(fi*41.0);
          vec2 center = base + wob + par * (0.14 * depth);

          float angle = ph + t * (0.05 + 0.05*hash11(fi*67.0));
          float ax = 0.85 + 0.6*hash11(fi*71.0);
          float ay = 0.85 + 0.6*hash11(fi*73.0);
          float pe = 1.4 + 2.2*hash11(fi*79.0);

          float r = uRadius * (0.85 + 0.35*hash11(fi*53.0));
          float s = uSoft  * (0.85 + 0.35*hash11(fi*59.0));

          float pick = hash11(fi*97.0);
          float w = 0.0;
          if (pick < 0.20) {
            w = pow(softCircle(uv, center, r, s), 1.2);
          } else if (pick < 0.45) {
            w = softSuperellipse(uv, center, r*ax, r*ay, pe, s, angle);
          } else if (pick < 0.65) {
            w = softDiamond(uv, center, r*ax, r*ay, s, angle);
          } else if (pick < 0.85) {
            float len = 1.0 + 0.6*hash11(fi*101.0);
            w = softCapsule(uv, center, r*ax, r*ay, len, s, angle);
          } else {
            float thick = r * (0.35 + 0.35*hash11(fi*103.0));
            w = softRing(uv, center, r, thick, s, angle);
          }

          vec3 c = uColors[i % 6] * mix(0.82, 1.0, depth);
          col += c * pow(w, 1.1);
        }

        float v = smoothstep(0.985, 0.52, distance(uv, vec2(0.5, 0.5)));
        col *= mix(1.0, v, 0.40);

        col = aces(col * 0.9);
        col = pow(col, vec3(1.0/2.2));

        gl_FragColor = vec4(col, 1.0);
      }
    `

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
    })

    matRef.current = mat
    return mat
  }, [palette, size.width, size.height, count, speed, spreadX, spreadY, radius, softness, parallax])

  // อัปเดตเวลา/ขนาด/พอยน์เตอร์ (เวอร์ชันเสถียรขึ้น)
  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return

    // ใช้เวลาจาก clock โดยตรง ป้องกัน dt spikes / refresh rate แปลก ๆ
    mat.uniforms.uTime.value = state.clock.getElapsedTime()

    ;(mat.uniforms.uResolution.value as THREE.Vector2).set(size.width, size.height)

    // หน่วง pointer ให้ smooth และจำกัดขนาด
    const p = mat.uniforms.uPointer.value as THREE.Vector2
    const targetX = THREE.MathUtils.clamp(state.pointer.x, -1, 1)
    const targetY = THREE.MathUtils.clamp(state.pointer.y, -1, 1)

    // damp ช้าลงนิดเพื่อกัน “วิ่งตามเมาส์แรงไป”
    p.x = THREE.MathUtils.damp(p.x, targetX, 6, state.clock.getDelta())
    p.y = THREE.MathUtils.damp(p.y, targetY, 6, state.clock.getDelta())
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
        // จำกัด DPR ให้เสถียร (เครื่องบางตัว DPR สูง ทำให้พฤติกรรมแปลก)
        dpr={[1, 2]}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <FullscreenGradient {...props} />
      </Canvas>
    </div>
  )
}
