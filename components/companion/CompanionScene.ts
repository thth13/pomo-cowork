import * as THREE from 'three'
import { createCatModel } from './CatModel'

export type CompanionMood = 'idle' | 'focus' | 'break'
export interface CompanionPose {
  mood: CompanionMood
  walking: boolean
  direction: number
  reducedMotion: boolean
  hovered?: boolean
  speaking?: boolean
  /** Point in CSS pixels, relative to the companion actor. */
  pointAt?: { x: number; y: number }
  celebrateUntil?: number
  held?: boolean
  dragVelocity?: number
}

// Original geometry: no remote models, textures or asset requests.
export function createCompanionScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(144, 164)
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 144 / 164, 0.1, 30)
  camera.position.set(0, 1.4, 6.8)
  camera.lookAt(0, 1.15, 0)
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x647b5b, 2.5))
  const light = new THREE.DirectionalLight(0xfff0d5, 3)
  light.position.set(-3, 5, 4)
  scene.add(light)
  const green = new THREE.MeshStandardMaterial({ color: 0x647b5b, roughness: 0.9 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x303a32, roughness: 1 })
  const paper = new THREE.MeshStandardMaterial({ color: 0xfbfaf5, roughness: 1 })
  const stage = new THREE.Group()
  scene.add(stage)
  const root = new THREE.Group()
  const hanger = new THREE.Group()
  hanger.position.y = 2.18
  stage.add(hanger)
  hanger.add(root)
  const sphere = (parent: THREE.Object3D, material: THREE.Material, scale: number[], position: number[]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material)
    mesh.scale.set(scale[0], scale[1], scale[2])
    mesh.position.set(position[0], position[1], position[2])
    parent.add(mesh)
    return mesh
  }
  const cat = createCatModel(root)
  const workspace = new THREE.Group()
  stage.add(workspace)
  const box = (parent: THREE.Group, material: THREE.Material, size: number[], position: number[]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material)
    mesh.position.set(position[0], position[1], position[2])
    parent.add(mesh)
    return mesh
  }
  // A low sage chair and paper-colored desk keep the little worker visible.
  box(workspace, green, [0.95, 0.12, 0.7], [0, 0.65, -0.12])
  box(workspace, green, [0.95, 0.7, 0.12], [0, 1.05, -0.45])
  ;[-1, 1].forEach(side => {
    box(workspace, green, [0.1, 0.42, 0.1], [side * 0.36, 0.43, -0.33])
    box(workspace, green, [0.1, 0.42, 0.1], [side * 0.36, 0.43, 0.12])
  })
  box(workspace, paper, [1.85, 0.12, 0.95], [0, 0.94, 0.69])
  ;[-1, 1].forEach(side => {
    box(workspace, green, [0.11, 0.67, 0.11], [side * 0.79, 0.55, 0.34])
    box(workspace, green, [0.11, 0.67, 0.11], [side * 0.79, 0.55, 1.02])
  })
  box(workspace, dark, [0.73, 0.055, 0.45], [0, 1.03, 0.72])
  box(workspace, paper, [0.55, 0.01, 0.2], [0, 1.062, 0.61])
  const laptopLid = new THREE.Group()
  laptopLid.position.set(0, 1.05, 0.94)
  laptopLid.rotation.x = 0.16
  workspace.add(laptopLid)
  box(laptopLid, green, [0.73, 0.46, 0.05], [0, 0.23, 0])
  box(laptopLid, paper, [0.62, 0.35, 0.012], [0, 0.23, -0.03])
  sphere(laptopLid, paper, [0.055, 0.055, 0.012], [0, 0.23, 0.03])
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.63, 24), new THREE.MeshBasicMaterial({ color: 0x303a32, transparent: true, opacity: 0.13, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.21
  scene.add(shadow)

  // Furniture needs its own materials so fading it never fades the cat.
  const furnitureMaterials = new Map<THREE.Material, THREE.Material>()
  workspace.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const source = object.material as THREE.Material
    let material = furnitureMaterials.get(source)
    if (!material) {
      material = source.clone()
      material.transparent = true
      furnitureMaterials.set(source, material)
    }
    object.material = material
  })
  let workProgress = 0
  let previousTime: number | undefined
  let hanging = 0
  let sway = 0
  let swaySpeed = 0
  const phase = (value: number, start: number, end: number) => THREE.MathUtils.smoothstep(value, start, end)

  return {
    canMove() { return workProgress <= 0.001 && hanging < 0.02 },
    render(time: number, pose: CompanionPose) {
      const t = pose.reducedMotion ? 0 : time
      const working = pose.mood === 'focus' && !pose.walking && !pose.held
      const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(time - previousTime, 0.05))
      previousTime = time
      hanging = pose.reducedMotion ? (pose.held ? 1 : 0) : THREE.MathUtils.damp(hanging, pose.held ? 1 : 0, 12, dt)
      if (pose.reducedMotion) { sway = 0; swaySpeed = 0 }
      else {
        const pull = pose.held ? THREE.MathUtils.clamp(-(pose.dragVelocity || 0) / 2400, -0.45, 0.45) + Math.sin(t * 3) * 0.025 : 0
        swaySpeed += ((pull - sway) * 55 - swaySpeed * 9) * dt
        sway = THREE.MathUtils.clamp(sway + swaySpeed * dt, -0.45, 0.45)
      }
      hanger.rotation.z = sway
      const goal = working ? 1 : 0
      workProgress = pose.reducedMotion ? goal : THREE.MathUtils.clamp(workProgress + (working ? 1 : -1) * dt / 1.4, 0, 1)
      if (pose.held) workProgress = 0
      const furniture = phase(workProgress, 0, 0.28)
      const approach = phase(workProgress, 0.15, 0.5)
      const seated = phase(workProgress, 0.4, 0.8)
      const typing = phase(workProgress, 0.76, 1)
      const free = 1 - phase(workProgress, 0, 0.45)
      const walking = pose.walking && workProgress <= 0.001 && hanging < 0.02
      const stride = walking ? Math.sin(t * 11) : 0
      const resting = pose.mood === 'break' ? free : 0
      workspace.visible = furniture > 0.001
      workspace.scale.setScalar(0.88 + furniture * 0.12)
      workspace.position.y = (1 - furniture) * -0.12
      furnitureMaterials.forEach(material => {
        material.opacity = furniture
        material.depthWrite = furniture >= 0.999
      })
      stage.rotation.y = -0.35 * approach
      root.position.y = -2.18 - 0.12 * seated - hanging * 0.045 + (walking ? Math.abs(stride) * 0.065 : Math.sin(t * 2) * 0.025 * free * (1 - hanging))
      root.position.z = Math.sin(Math.PI * approach) * 0.16
      root.rotation.x = Math.sin(Math.PI * seated) * 0.12
      root.rotation.y = (walking ? pose.direction * 0.5 : Math.sin(t * 0.7) * 0.06) * (1 - seated) * (1 - hanging)
      root.rotation.z = Math.sin(t * 2.4) * 0.055 * resting * (1 - hanging)
      cat.animate(t, walking, seated, typing, hanging, sway)
      shadow.scale.setScalar(1 + furniture * 0.5)
      shadow.material.opacity = 0.13 * (1 - hanging)
      renderer.render(scene, camera)
    },
    dispose() {
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.dispose()
      })
      ;[green, dark, paper, shadow.material].forEach(material => material.dispose())
      furnitureMaterials.forEach(material => material.dispose())
      cat.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
