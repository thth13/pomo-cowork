import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { CompanionPose } from './CompanionScene'
import { preparePomodoroCharacter } from './preparePomodoroCharacter'

type ClipName = 'Idle' | 'Walk' | 'SitDown' | 'Work' | 'StandUp' | 'Rest' | 'Held'

/** Uploaded model, fitted to the companion view with local multipart animation. */
export async function createCompanionScene(canvas: HTMLCanvasElement) {
  const gltf = await new GLTFLoader().loadAsync('/assets/companion/rigged-tom/pomodoro_character.glb')
  const scene = new THREE.Scene()
  const model = gltf.scene
  const clips = preparePomodoroCharacter(model)
  const disposeModel = () => {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const skeletons = new Set<THREE.Skeleton>()
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry)
        const list = Array.isArray(object.material) ? object.material : [object.material]
        list.forEach(material => materials.add(material))
      }
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    })
    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(material => material.dispose())
    skeletons.forEach(skeleton => skeleton.dispose())
  }
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }) }
  catch (error) { disposeModel(); throw error }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(288, 288, false)
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  const camera = new THREE.PerspectiveCamera(34, 144 / 164, 0.1, 30)
  camera.setViewOffset(144, 164, -72, -62, 288, 288)
  camera.position.set(0, 1.4, 6.8)
  camera.lookAt(0, 1.15, 0)
  scene.add(new THREE.HemisphereLight(0xfff5e7, 0x69758b, 2))
  const key = new THREE.DirectionalLight(0xffe7cb, 3)
  key.position.set(-3, 5, 5); scene.add(key)
  const rim = new THREE.DirectionalLight(0xc7d8ff, 1.8)
  rim.position.set(3, 3, -3); scene.add(rim)
  const hanger = new THREE.Group()
  hanger.position.y = 2.18
  model.position.y = -2.18
  hanger.add(model); scene.add(hanger)
  model.traverse(object => { if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false })
  const mixer = new THREE.AnimationMixer(model)
  const actions = new Map<ClipName, THREE.AnimationAction>()
  const weights = new Map<ClipName, number>()
  const names: ClipName[] = ['Idle', 'Walk', 'SitDown', 'Work', 'StandUp', 'Rest', 'Held']
  for (const name of names) {
    const clip = THREE.AnimationClip.findByName(clips, name)
    if (!clip) { mixer.uncacheRoot(model); disposeModel(); renderer.dispose(); throw new Error(`Missing companion animation: ${name}`) }
    const action = mixer.clipAction(clip)
    if (name === 'SitDown' || name === 'StandUp') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
    action.play().setEffectiveWeight(name === 'Idle' ? 1 : 0)
    actions.set(name, action); weights.set(name, name === 'Idle' ? 1 : 0)
  }
  let current: ClipName = 'Idle'
  let elapsed = 0
  let previousTime: number | undefined
  let angle = 0, speed = 0, gripVelocity = 0
  let disposed = false
  const furniture = new THREE.Group(), bench = new THREE.Group()
  scene.add(furniture, bench)
  const sage = new THREE.MeshStandardMaterial({ color: 0x879780, roughness: 0.9, transparent: true })
  const wood = new THREE.MeshStandardMaterial({ color: 0xd5ba91, roughness: 0.9, transparent: true })
  const screen = new THREE.MeshStandardMaterial({ color: 0x9fc2ce, roughness: 0.5, emissive: 0x28404a, emissiveIntensity: 0.2, transparent: true })
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4356, roughness: 0.6, transparent: true })
  const restMaterial = new THREE.MeshStandardMaterial({ color: 0xa4b29a, roughness: 1, transparent: true })
  const pillow = new THREE.MeshStandardMaterial({ color: 0xf3ecd9, roughness: 1, transparent: true })
  const box = (parent: THREE.Group, material: THREE.Material, size: number[], at: number[]) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material)
    object.position.set(at[0], at[1], at[2]); parent.add(object)
    return object
  }
  box(furniture, sage, [0.66, 0.09, 0.64], [0, 0.62, 0])
  box(furniture, sage, [0.66, 0.65, 0.075], [0, 0.94, -0.3])
  for (const side of [-1, 1]) {
    box(furniture, sage, [0.06, 0.43, 0.06], [side * 0.26, 0.4, -0.23])
    box(furniture, sage, [0.06, 0.43, 0.06], [side * 0.26, 0.4, 0.23])
    box(furniture, wood, [0.08, 0.76, 0.08], [side * 0.69, 0.59, 0.42])
    box(furniture, wood, [0.08, 0.76, 0.08], [side * 0.69, 0.59, 1])
  }
  box(furniture, wood, [2.15, 0.09, 0.82], [0, 1.015, 0.72])
  box(furniture, dark, [0.65, 0.035, 0.4], [0, 1.077, 0.73])
  const lid = box(furniture, dark, [0.65, 0.42, 0.035], [0, 1.29, 0.93]); lid.rotation.x = 0.1
  const pixels = box(furniture, screen, [0.57, 0.34, 0.01], [0, 1.29, 0.907]); pixels.rotation.x = 0.1
  box(bench, restMaterial, [2.5, 0.15, 0.75], [0, 0.4, 0])
  box(bench, restMaterial, [2.5, 0.45, 0.12], [0, 0.61, -0.38])
  box(bench, pillow, [0.45, 0.12, 0.6], [0.95, 0.53, 0])
  for (const side of [-1, 1]) box(bench, restMaterial, [0.08, 0.13, 0.5], [side * 1.05, 0.26, 0])
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x303a32, opacity: 0.12, transparent: true, depthWrite: false })
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), shadowMaterial)
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.198; scene.add(shadow)
  const choose = (next: ClipName, time = 0) => {
    if (current === next) return
    current = next; elapsed = time
    const action = actions.get(next)!
    action.reset().play(); action.time = time
  }

  return {
    canMove() { return ['Work', 'SitDown', 'StandUp', 'Rest', 'Held'].every(name => (weights.get(name as ClipName) || 0) < 0.025) },
    render(time: number, pose: CompanionPose) {
      if (disposed) return
      const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(time - previousTime, 0.05))
      previousTime = time
      const wanted: ClipName = pose.held ? 'Held' : pose.walking ? 'Walk' : pose.mood === 'focus' ? 'Work' : pose.mood === 'break' ? 'Rest' : 'Idle'
      if (pose.reducedMotion || wanted === 'Held') choose(wanted)
      else if (current === 'SitDown') {
        if (wanted !== 'Work') choose('StandUp', Math.max(0, 0.7 - elapsed))
        else if (elapsed >= 0.7) choose('Work')
      } else if (current === 'StandUp') {
        if (wanted === 'Work') choose('SitDown', Math.max(0, 0.7 - elapsed))
        else if (elapsed >= 0.7) choose(wanted)
      } else if (wanted !== current) {
        if (current === 'Work') choose('StandUp')
        else if (wanted === 'Work') choose('SitDown')
        else choose(wanted)
      }
      elapsed += dt
      actions.forEach((action, name) => {
        const target = name === current ? 1 : 0
        const weight = pose.reducedMotion || wanted === 'Held' ? target : THREE.MathUtils.damp(weights.get(name) || 0, target, 12, dt)
        weights.set(name, weight)
        action.enabled = true; action.setEffectiveWeight(weight)
        if (pose.reducedMotion) action.time = 0
      })
      mixer.update(pose.reducedMotion ? 0 : dt)
      const workingWeight = (weights.get('Work') || 0) + (weights.get('SitDown') || 0) + (weights.get('StandUp') || 0)
      const restingWeight = weights.get('Rest') || 0
      const carried = weights.get('Held') || 0
      furniture.visible = workingWeight > 0.01
      bench.visible = restingWeight > 0.01
      ;[sage, wood, screen, dark].forEach(material => { material.opacity = workingWeight; material.depthWrite = workingWeight > 0.95 })
      ;[restMaterial, pillow].forEach(material => { material.opacity = restingWeight; material.depthWrite = restingWeight > 0.95 })
      if (pose.reducedMotion) { angle = 0; speed = 0; gripVelocity = 0 }
      else {
        const next = pose.held ? THREE.MathUtils.damp(gripVelocity, pose.dragVelocity || 0, 24, dt) : 0
        if (pose.held) speed -= (next - gripVelocity) * Math.cos(angle) / 95
        gripVelocity = next
        const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps
        for (let i = 0; i < steps; i++) {
          speed -= (pose.held ? 24 : 42) * Math.sin(angle) * step
          speed *= Math.exp(-(pose.held ? 0.85 : 8) * step)
          speed = THREE.MathUtils.clamp(speed, -28, 28)
          angle = Math.atan2(Math.sin(angle + speed * step), Math.cos(angle + speed * step))
        }
      }
      hanger.rotation.z = angle
      model.rotation.y = THREE.MathUtils.damp(model.rotation.y, pose.walking ? pose.direction * 0.55 : -workingWeight * 0.24, 8, pose.reducedMotion ? 1 : dt)
      shadowMaterial.opacity = 0.12 * (1 - carried)
      renderer.render(scene, camera)
    },
    dispose() {
      if (disposed) return
      disposed = true; mixer.stopAllAction(); mixer.uncacheRoot(model); disposeModel()
      ;[furniture, bench].forEach(group => group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() }))
      ;[sage, wood, screen, dark, restMaterial, pillow, shadowMaterial].forEach(material => material.dispose())
      shadow.geometry.dispose(); renderer.dispose(); renderer.forceContextLoss()
    },
  }
}
