import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mkdir, writeFile } from 'node:fs/promises'

// Authoring only: create an original skinned character and reusable animation clips.
// No service, API key, external model, texture or running application is required.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.() }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.() }
}
const model = new THREE.Group()
model.name = 'Tom'
const mesh = new THREE.SkinnedMesh(undefined, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }))
mesh.name = 'TomSkin'
model.add(mesh)
const bones = []
const byName = {}
function bone(name, parent, xyz) {
  const node = new THREE.Bone(); node.name = name; node.position.set(...xyz)
  parent.add(node); bones.push(node); byName[name] = node
  return node
}
const root = bone('Root', mesh, [0, 0, 0])
const hips = bone('Hips', root, [0, 0.8, 0])
const spine = bone('Spine', hips, [0, 0.35, 0])
const neck = bone('Neck', spine, [0, 0.3, 0])
const head = bone('Head', neck, [0, 0.3, 0])
for (const [side, sign] of [['L', -1], ['R', 1]]) {
  const upper = bone(`UpperArm${side}`, spine, [sign * 0.44, 0.12, 0.065])
  const fore = bone(`Forearm${side}`, upper, [0, -0.22, 0])
  bone(`Hand${side}`, fore, [0, -0.18, 0.015])
  const thigh = bone(`Thigh${side}`, hips, [sign * 0.23, 0, 0])
  const shin = bone(`Shin${side}`, thigh, [0, -0.22, 0])
  bone(`Foot${side}`, shin, [0, -0.22, 0])
}
model.updateMatrixWorld(true)
const palette = { fur: '#aaa2d9', furLight: '#beb5e5', furDark: '#9187c2', cream: '#fff0dc', pink: '#e9a6b1', ink: '#342d48', white: '#fffdf6', scarf: '#edb18e' }
const parts = []
function part(geometry, parent, offset, color, rotation = [0, 0, 0], blend) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...offset), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1))
  geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(parent.matrixWorld, matrix))
  if (geometry.index) geometry = geometry.toNonIndexed()
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3), joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4)
  const value = new THREE.Color(palette[color] || color)
  for (let i = 0; i < count; i++) {
    colors.set([value.r, value.g, value.b], i * 3)
    const amount = blend ? blend.weight(geometry.attributes.position.getY(i)) : 0
    joints.set([bones.indexOf(parent), blend ? bones.indexOf(blend.bone) : 0, 0, 0], i * 4)
    weights.set([1 - amount, amount, 0, 0], i * 4)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(joints, 4))
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4))
  parts.push(geometry)
}
function sphere(parent, size, offset, color, rotation) {
  const geometry = new THREE.SphereGeometry(1, 16, 12); geometry.scale(...size)
  part(geometry, parent, offset, color, rotation)
}
function tube(parent, points, radius, color) {
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 12, radius, 6, false), parent, [0, 0, 0], color)
}
// A plump fantasy creature: soft pear body, giant head and tiny paws.
const belly = new THREE.SphereGeometry(1, 28, 22)
belly.scale(0.49, 0.51, 0.37)
part(belly, hips, [0, 0.18, 0], 'fur', [0, 0, 0], { bone: spine, weight: y => THREE.MathUtils.smoothstep(y, 0.82, 1.35) * 0.55 })
sphere(spine, [0.32, 0.32, 0.045], [0, -0.12, 0.342], 'cream')
// Large, overlapping rounded cheeks make the silhouette feel like a plush toy.
sphere(head, [0.59, 0.5, 0.43], [0, 0, 0], 'fur')
for (const side of [-1, 1]) {
  sphere(head, [0.28, 0.25, 0.26], [side * 0.34, -0.16, 0.15], 'fur')
  sphere(head, [0.155, 0.105, 0.035], [side * 0.365, -0.12, 0.395], 'pink')
  sphere(head, [0.03, 0.014, 0.009], [side * 0.38, -0.09, 0.427], 'cream')
  // Rounded ears have inset pink centers and no human ear shapes.
  sphere(head, [0.17, 0.33, 0.135], [side * 0.43, 0.37, -0.02], 'fur', [0, 0, side * -0.25])
  sphere(head, [0.105, 0.235, 0.033], [side * 0.445, 0.38, 0.104], 'pink', [0, 0, side * -0.25])
  sphere(head, [0.09, 0.12, 0.045], [side * 0.21, 0.025, 0.397], 'ink')
  sphere(head, [0.028, 0.034, 0.012], [side * 0.21 - 0.022, 0.065, 0.438], 'white')
  sphere(head, [0.012, 0.014, 0.008], [side * 0.21 + 0.027, -0.015, 0.439], 'white')
}
sphere(head, [0.23, 0.13, 0.055], [0, -0.205, 0.37], 'cream')
sphere(head, [0.05, 0.034, 0.025], [0, -0.13, 0.432], 'pink')
for (const side of [-1, 1]) tube(head, [[0, -0.19, 0.43], [side * 0.055, -0.22, 0.425], [side * 0.1, -0.19, 0.416]], 0.012, 'ink')
// A little top tuft and scarf replace hair, clothes and accessories.
sphere(head, [0.12, 0.16, 0.105], [-0.07, 0.46, 0.015], 'furLight', [0, 0, -0.45])
part(new THREE.TorusGeometry(0.255, 0.055, 10, 28), neck, [0, -0.05, 0], 'scarf', [Math.PI / 2, 0, 0])
sphere(spine, [0.07, 0.18, 0.035], [0.15, 0.025, 0.335], 'scarf', [0, 0, -0.25])
sphere(spine, [0.06, 0.14, 0.03], [0.22, 0.055, 0.3], 'scarf', [0, 0, -0.5])
// A cream pom tail remains part of the skinned mesh.
sphere(hips, [0.225, 0.23, 0.22], [0.39, 0.13, -0.25], 'cream')
sphere(hips, [0.13, 0.12, 0.14], [0.51, 0.19, -0.24], 'cream')
for (const side of ['L', 'R']) {
  const arm = byName[`UpperArm${side}`], fore = byName[`Forearm${side}`], hand = byName[`Hand${side}`]
  part(new THREE.CapsuleGeometry(0.125, 0.08, 8, 16), arm, [0, -0.1, 0], 'fur')
  sphere(fore, [0.115, 0.145, 0.12], [0, -0.065, 0.015], 'fur')
  sphere(hand, [0.12, 0.115, 0.13], [0, -0.015, 0.025], 'furLight')
  sphere(hand, [0.06, 0.043, 0.015], [0, -0.025, 0.145], 'pink')
  const thigh = byName[`Thigh${side}`], shin = byName[`Shin${side}`], foot = byName[`Foot${side}`]
  sphere(thigh, [0.18, 0.205, 0.18], [0, -0.08, 0], 'fur')
  sphere(shin, [0.13, 0.16, 0.14], [0, -0.06, 0.025], 'fur')
  sphere(foot, [0.19, 0.14, 0.24], [0, 0, 0.065], 'furLight')
  sphere(foot, [0.09, 0.055, 0.02], [0, -0.015, 0.287], 'pink')
  for (const x of [-0.075, 0, 0.075]) sphere(foot, [0.027, 0.027, 0.015], [x, 0.052, 0.268], 'cream')
}
mesh.geometry.dispose()
mesh.geometry = mergeGeometries(parts, false)
mesh.bind(new THREE.Skeleton(bones))
mesh.normalizeSkinWeights()
mesh.frustumCulled = false
model.updateMatrixWorld(true)
const tracks = []
const quat = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray()
function clip(name, duration, frames) {
  const names = Object.keys(byName)
  const entries = []
  for (const name of names) {
    const q = [], p = [], times = []
    frames.forEach(([time, values]) => {
      times.push(time)
      q.push(...quat(...(values[name]?.rotation || [0, 0, 0])))
      p.push(...(values[name]?.position || byName[name].position.toArray()))
    })
    entries.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, q), new THREE.VectorKeyframeTrack(`${name}.position`, times, p))
  }
  const result = new THREE.AnimationClip(name, duration, entries)
  tracks.push(result)
  return result
}
const idle = t => ({ Spine: { rotation: [0, 0, Math.sin(t * Math.PI) * 0.012] }, Head: { rotation: [Math.sin(t * Math.PI) * 0.018, Math.sin(t * Math.PI) * 0.035, 0] }, UpperArmL: { rotation: [0, 0, -0.06] }, UpperArmR: { rotation: [0, 0, 0.06] } })
clip('Idle', 2, Array.from({ length: 9 }, (_, i) => [i / 4, idle(i / 4)]))
const workPose = tap => ({ Hips: { position: [0, 0.66, 0] }, ThighL: { rotation: [-Math.PI / 2, 0, 0] }, ThighR: { rotation: [-Math.PI / 2, 0, 0] }, ShinL: { rotation: [Math.PI / 2, 0, 0] }, ShinR: { rotation: [Math.PI / 2, 0, 0] }, UpperArmL: { rotation: [-1.05 + tap * 0.04, 0, -0.08] }, UpperArmR: { rotation: [-1.05 - tap * 0.04, 0, 0.08] }, ForearmL: { rotation: [-0.35, 0, 0] }, ForearmR: { rotation: [-0.35, 0, 0] }, Head: { rotation: [0.08, 0, 0] }, Spine: { rotation: [0.06, 0, 0] } })
clip('Work', 0.8, Array.from({ length: 9 }, (_, i) => [i / 10, workPose(Math.sin(i / 8 * Math.PI * 2))]))
clip('SitDown', 0.7, [[0, idle(0)], [0.7, workPose(0)]])
clip('StandUp', 0.7, [[0, workPose(0)], [0.7, idle(0)]])
clip('Walk', 0.8, Array.from({ length: 17 }, (_, i) => {
  const t = i / 20, swing = Math.sin(i / 16 * Math.PI * 2)
  const frame = { Hips: { position: [0, 0.8 + Math.abs(swing) * 0.025, 0] } }
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    frame[`Thigh${side}`] = { rotation: [swing * sign * 0.48, 0, 0] }
    frame[`Shin${side}`] = { rotation: [Math.max(0, -swing * sign) * 0.65, 0, 0] }
    frame[`Foot${side}`] = { rotation: [-swing * sign * 0.12, 0, 0] }
    frame[`UpperArm${side}`] = { rotation: [-swing * sign * 0.3, 0, sign * 0.06] }
    frame[`Forearm${side}`] = { rotation: [-0.1, 0, 0] }
  }
  return [t, frame]
}))
clip('Rest', 3, Array.from({ length: 9 }, (_, i) => [i * 3 / 8, { Hips: { position: [-0.5, 1.07 + Math.sin(i / 8 * Math.PI * 2) * 0.008, 0], rotation: [0, 0, -Math.PI / 2] }, UpperArmL: { rotation: [-0.15, 0, -0.18] }, UpperArmR: { rotation: [-0.15, 0, 0.18] }, ThighL: { rotation: [-0.14, 0, 0] }, ThighR: { rotation: [-0.2, 0, 0] }, ShinL: { rotation: [0.22, 0, 0] }, ShinR: { rotation: [0.3, 0, 0] } }]))
clip('Held', 1.6, Array.from({ length: 9 }, (_, i) => {
  const wave = Math.sin(i / 8 * Math.PI * 2)
  return [i / 5, { UpperArmL: { rotation: [wave * 0.04, 0, 0.04] }, UpperArmR: { rotation: [-wave * 0.04, 0, -0.04] }, ThighL: { rotation: [wave * 0.04, 0, -0.02] }, ThighR: { rotation: [-wave * 0.04, 0, 0.02] }, FootL: { rotation: [0.18, 0, 0] }, FootR: { rotation: [0.18, 0, 0] } }]
}))
const output = new URL('../../public/assets/companion/rigged-tom/', import.meta.url)
await mkdir(output, { recursive: true })
const glb = await new GLTFExporter().parseAsync(model, { binary: true, animations: tracks, onlyVisible: false })
await writeFile(new URL('tom.glb', output), Buffer.from(glb))
const metadata = { name: 'Tom', character: 'Lavender plush fantasy creature', authoring: 'Original geometry, skinning and clips authored for Pomo Cowork', generator: 'scripts/companion/create-rigged-tom.mjs', boneCount: bones.length, bones: bones.map(b => b.name), vertexCount: mesh.geometry.attributes.position.count, animations: tracks.map(c => ({ name: c.name, duration: c.duration })), units: 'metres', externalAssets: false }
await writeFile(new URL('model.json', output), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify({ output: 'public/assets/companion/rigged-tom/tom.glb', bytes: glb.byteLength, bones: bones.length, vertices: metadata.vertexCount, clips: tracks.map(c => c.name) }))
