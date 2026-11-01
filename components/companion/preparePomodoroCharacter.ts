import * as THREE from 'three'

/** Attach animation pivots to the uploaded multipart GLB without changing its file. */
export function preparePomodoroCharacter(model: THREE.Group): THREE.AnimationClip[] {
  model.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  if (bounds.isEmpty() || size.y <= 0) throw new Error('Empty pomodoro character')
  const center = bounds.getCenter(new THREE.Vector3())
  const scale = 2.2 / size.y
  const sourceParts = [...model.children]
  const frame = new THREE.Group()
  frame.name = 'PomodoroFrame'
  const motion = new THREE.Group()
  motion.name = 'PomodoroMotion'
  motion.position.set(0, 0.75, 0)
  model.add(frame); frame.add(motion)
  model.updateMatrixWorld(true)
  for (const part of sourceParts) motion.attach(part)
  const pivots: THREE.Group[] = [motion]
  const pivot = (name: string, names: string[], point: number[]) => {
    const objects = names.map(part => model.getObjectByName(part)).filter((part): part is THREE.Object3D => !!part)
    const node = new THREE.Group()
    node.name = name
    node.position.set(point[0], point[1] - 0.75, point[2])
    motion.add(node); model.updateMatrixWorld(true)
    objects.forEach(object => node.attach(object))
    pivots.push(node)
    return node
  }
  const armL = pivot('PomodoroArmL', ['armL', 'handL'], [-0.51, 0.65, 0.05])
  const armR = pivot('PomodoroArmR', ['armR', 'handR'], [0.51, 0.65, 0.05])
  const legL = pivot('PomodoroLegL', ['legL', 'shoeL'], [-0.18, 0.31, 0])
  const legR = pivot('PomodoroLegR', ['legR', 'shoeR'], [0.18, 0.31, 0])
  const leaves = pivot('PomodoroLeaves', ['dimple', 'stem', 'leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4'], [0, 1.13, 0])
  const eyes = [pivot('PomodoroEyeL', ['eyeWL', 'pupilL', 'shineL'], [-0.2, 0.85, 0.5]), pivot('PomodoroEyeR', ['eyeWR', 'pupilR', 'shineR'], [0.2, 0.85, 0.5])]
  frame.scale.setScalar(scale)
  frame.position.set(-center.x * scale, 0.2 - bounds.min.y * scale, -center.z * scale)
  model.traverse(object => {
    if (object instanceof THREE.Mesh && !object.geometry.attributes.normal) object.geometry.computeVertexNormals()
  })
  const rest = new Map(pivots.map(node => [node.name, node.position.clone()]))
  type Pose = Record<string, { rotation?: number[]; position?: number[]; scale?: number[] }>
  const clips: THREE.AnimationClip[] = []
  const idle = (phase: number): Pose => ({
    [motion.name]: { position: [0, 0.75 + Math.sin(phase) * 0.006, 0] },
    [leaves.name]: { rotation: [0.025 * Math.sin(phase), 0, Math.sin(phase) * 0.035] },
  })
  const work = (tap: number): Pose => ({
    [motion.name]: { position: [0, 0.55, 0], rotation: [0.04, 0, 0] },
    [armL.name]: { position: [-0.24, 0.14, 0.12], rotation: [-0.85 + tap * 0.07, 0, 0.65] },
    [armR.name]: { position: [0.24, 0.14, 0.12], rotation: [-0.85 - tap * 0.07, 0, -0.65] },
    [legL.name]: { rotation: [-1.1, 0, 0] }, [legR.name]: { rotation: [-1.1, 0, 0] },
  })
  function clip(name: string, duration: number, frames: [number, Pose][]) {
    const tracks: THREE.KeyframeTrack[] = []
    const times = frames.map(([time]) => time)
    for (const node of pivots) {
      const q: number[] = [], p: number[] = [], s: number[] = []
      for (const [, pose] of frames) {
        const values = pose[node.name]
        const r = values?.rotation || [0, 0, 0]
        q.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])).toArray())
        p.push(...(values?.position || rest.get(node.name)!.toArray()))
        s.push(...(values?.scale || [1, 1, 1]))
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, q), new THREE.VectorKeyframeTrack(`${node.name}.position`, times, p), new THREE.VectorKeyframeTrack(`${node.name}.scale`, times, s))
    }
    clips.push(new THREE.AnimationClip(name, duration, tracks))
  }
  clip('Idle', 3, Array.from({ length: 13 }, (_, i): [number, Pose] => {
    const pose = idle(i / 12 * Math.PI * 2)
    eyes.forEach(eye => { pose[eye.name] = { scale: [1, i === 10 ? 0.13 : 1, 1] } })
    return [i / 4, pose]
  }))
  clip('Walk', 0.8, Array.from({ length: 17 }, (_, i): [number, Pose] => {
    const swing = Math.sin(i / 16 * Math.PI * 2)
    return [i / 20, {
      [motion.name]: { position: [0, 0.75 + Math.abs(swing) * 0.015, 0], rotation: [0, 0, swing * 0.025] },
      [legL.name]: { rotation: [swing * 0.5, 0, 0] }, [legR.name]: { rotation: [-swing * 0.5, 0, 0] },
      [armL.name]: { rotation: [-swing * 0.3, 0, 0] }, [armR.name]: { rotation: [swing * 0.3, 0, 0] },
      [leaves.name]: { rotation: [swing * 0.04, 0, 0] },
    }]
  }))
  clip('SitDown', 0.7, [[0, idle(0)], [0.7, work(0)]])
  clip('StandUp', 0.7, [[0, work(0)], [0.7, idle(0)]])
  clip('Work', 0.8, Array.from({ length: 9 }, (_, i): [number, Pose] => [i / 10, work(Math.sin(i / 8 * Math.PI * 2))]))
  clip('Rest', 3, Array.from({ length: 9 }, (_, i): [number, Pose] => {
    const pose: Pose = {
      [motion.name]: { position: [-0.2, 0.6 + Math.sin(i / 8 * Math.PI * 2) * 0.004, 0], rotation: [0, 0, -Math.PI / 2] },
      [armL.name]: { rotation: [0, 0, 0.15] }, [armR.name]: { rotation: [0, 0, -0.15] },
    }
    eyes.forEach(eye => { pose[eye.name] = { scale: [1, 0.12, 1] } })
    return [i * 3 / 8, pose]
  }))
  clip('Held', 1.6, Array.from({ length: 9 }, (_, i): [number, Pose] => {
    const swing = Math.sin(i / 8 * Math.PI * 2) * 0.07
    return [i / 5, {
      [armL.name]: { rotation: [swing, 0, 0.15] }, [armR.name]: { rotation: [-swing, 0, -0.15] },
      [legL.name]: { rotation: [swing, 0, 0] }, [legR.name]: { rotation: [-swing, 0, 0] },
      [leaves.name]: { rotation: [swing * 0.5, 0, 0] },
    }]
  }))
  return clips
}
