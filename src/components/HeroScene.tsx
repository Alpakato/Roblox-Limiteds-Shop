// components/HeroScene.tsx
'use client'

import { Canvas, useFrame, RootState } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

function GradientRecolor({ root }: { root: THREE.Object3D }) {
  // สแกนทุก mesh แล้วแทนที่ material เป็น ShaderMaterial แบบ gradient
  useMemo(() => {
    root.traverse((obj: THREE.Object3D) => {
      if (!('isMesh' in obj) || !(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      if (!mesh.geometry) return

      // คำนวณ bounding box ต่อชิ้น เพื่อ normalize แกน Y ทำ gradient สวย ๆ
      mesh.geometry.computeBoundingBox()
      const bbox = mesh.geometry.boundingBox
      if (!bbox) return
      const minY = bbox.min.y
      const maxY = bbox.max.y
      const rangeY = Math.max(0.0001, maxY - minY)

      // สร้าง ShaderMaterial gradient น้ำเงิน-แดง
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          colorA: { value: new THREE.Color('#2563eb') }, // น้ำเงิน (tailwind blue-600)
          colorB: { value: new THREE.Color('#ef4444') }, // แดง (tailwind red-500)
          minY: { value: minY },
          invRangeY: { value: 1 / rangeY },
          opacity: { value: 1.0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 colorA;
          uniform vec3 colorB;
          uniform float minY;
          uniform float invRangeY;
          uniform float opacity;
          varying vec3 vPos;

          void main() {
            float t = clamp((vPos.y - minY) * invRangeY, 0.0, 1.0);
            vec3 c = mix(colorA, colorB, t);
            gl_FragColor = vec4(c, opacity);
          }
        `,
        transparent: true,
        depthWrite: true,
      })

      // ปิด toneMapped เพื่อให้สีสดตามที่ตั้ง (type ของ ShaderMaterial รองรับอยู่แล้ว)
      mat.toneMapped = false

      mesh.material = mat
    })
  }, [root])

  return null
}

function Model() {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF('/models/roblox_logo.glb') as GLTF
  const scene = gltf.scene as THREE.Group

  // ปรับสเกล/ตำแหน่งให้พอดีกับ Hero และไปอยู่หลังตัวหนังสือ (ล่างซ้าย)
  const scale = 1.3
  const position: [number, number, number] = [-0.8, -0.35, 0] // ขยับลงล่างซ้าย
  const rotation: [number, number, number] = [0, 0, 0]

  // หมุนเฉพาะแกน Y
  useFrame((_state: RootState, delta: number) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.3
  })

  return (
    <group ref={groupRef} scale={scale} position={position} rotation={rotation}>
      {/* ติด gradient ให้ทั้งก้อน */}
      <primitive object={scene} />
      <GradientRecolor root={scene} />
    </group>
  )
}

export default function HeroScene() {
  return (
    <Canvas
      // เป็นพื้นหลัง อยู่นิ่ง ๆ หลังตัวหนังสือ
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.6], fov: 22 }}
    >
      {/* แสงสองข้างช่วยให้มีมิติ แต่สีหลักมาจาก shader gradient แล้ว */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 2, 3]} intensity={0.8} />
      <directionalLight position={[-2, -1, 2]} intensity={0.5} />

      {/* ฉากเล็กน้อยเพื่อให้มี depth */}
      <fog attach="fog" args={['#0b0f1a', 5, 12]} />
      <Model />
    </Canvas>
  )
}

useGLTF.preload('/models/roblox_logo.glb')
