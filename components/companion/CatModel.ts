import * as THREE from 'three'

/** Original animated geometry inspired by the user's front/back character references. */
export function createCatModel(root: THREE.Group) {
  const orangeColor = new THREE.Color(0xed8246)
  const stripeColor = new THREE.Color(0xa84e37)
  const creamColor = new THREE.Color(0xf2dfb5)
  const coat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 })
  const orange = new THREE.MeshStandardMaterial({ color: orangeColor, roughness: 0.72 })
  const cream = new THREE.MeshStandardMaterial({ color: creamColor, roughness: 0.8 })
  const innerEar = new THREE.MeshStandardMaterial({ color: 0xa74e3c, roughness: 0.9 })
  const pink = new THREE.MeshStandardMaterial({ color: 0xce7366, roughness: 0.65 })
  const black = new THREE.MeshStandardMaterial({ color: 0x262326, roughness: 0.4 })
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f3e9, roughness: 0.4 })
  const iris = new THREE.MeshPhysicalMaterial({ color: 0x479aaf, roughness: 0.22, clearcoat: 0.7 })
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const paint = (geometry: THREE.BufferGeometry, pick: (x: number, y: number, z: number, u: number) => THREE.Color) => {
    const positions = geometry.attributes.position
    const colors = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const color = pick(positions.getX(i), positions.getY(i), positions.getZ(i), geometry.attributes.uv?.getX(i) || 0)
      colors.set([color.r, color.g, color.b], i * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }
  const ellipsoid = (parent: THREE.Object3D, material: THREE.Material, size: number[], at: number[], pattern?: (x: number, y: number, z: number) => THREE.Color) => {
    const geometry = new THREE.SphereGeometry(1, 64, 48)
    if (pattern) paint(geometry, pattern)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.scale.set(size[0], size[1], size[2])
    mesh.position.set(at[0], at[1], at[2])
    parent.add(mesh)
    return mesh
  }
  const stroke = (parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material) => {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point[0], point[1], point[2])))
    const geometry = new THREE.TubeGeometry(path, 48, radius, 10, false)
    const mesh = new THREE.Mesh(geometry, material)
    parent.add(mesh)
    return mesh
  }
  // A narrow neck flows into the pear-shaped belly, as in the supplied silhouette.
  const profile = [[0, 0.48], [0.25, 0.49], [0.39, 0.62], [0.44, 0.86], [0.43, 1.06], [0.35, 1.26], [0.24, 1.38], [0.23, 1.5], [0, 1.57]]
  const curve = new THREE.SplineCurve(profile.map(([radius, y]) => new THREE.Vector2(radius, y)))
  const torsoGeometry = new THREE.LatheGeometry(curve.getPoints(48).map(point => new THREE.Vector2(Math.max(0, point.x), point.y)), 64)
  paint(torsoGeometry, (x, y, z) => {
    if (z > 0.13 && (x / (y > 1.2 ? 0.2 : 0.31)) ** 2 + ((y - 1.03) / 0.5) ** 2 < 1.15) return creamColor
    if (z < -0.16 && [0.72, 0.99, 1.24].some(band => Math.abs(y - band) < 0.04 * (1 - Math.abs(x) / 0.5))) return stripeColor
    return orangeColor
  })
  const torso = new THREE.Mesh(torsoGeometry, coat)
  torso.scale.z = 0.72
  root.add(torso)
  const head = new THREE.Group()
  head.position.set(0, 1.86, 0)
  root.add(head)
  const headGeometry = new THREE.SphereGeometry(1, 80, 64)
  paint(headGeometry, (x, y, z) => {
    if (z > 0.4 && (x / 0.65) ** 2 + ((y + 0.5) / 0.55) ** 2 < 1) return creamColor
    const cheekBand = [-0.1, -0.43].some(band => Math.abs(y - band - (Math.abs(x) - 0.7) * 0.22) < 0.05 * Math.max(0, (Math.abs(x) - 0.58) / 0.4))
    if (Math.abs(x) > 0.6 && cheekBand) return stripeColor
    if (y > 0.78 && Math.abs(Math.abs(x) - 0.23) < (y - 0.72) * 0.32) return stripeColor
    return orangeColor
  })
  const positions = headGeometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const jaw = y < -0.25 ? THREE.MathUtils.lerp(0.57, 1, (y + 1) / 0.75) : 1
    positions.setXYZ(i, positions.getX(i) * 0.74 * jaw, y * 0.58, positions.getZ(i) * 0.47)
  }
  headGeometry.computeVertexNormals()
  head.add(new THREE.Mesh(headGeometry, coat))
  // Broad cream muzzle, small rounded nose and restrained smile.
  ellipsoid(head, cream, [0.37, 0.225, 0.11], [0, -0.225, 0.37])
  ellipsoid(head, pink, [0.082, 0.065, 0.065], [0, -0.06, 0.502])
  ;[-1, 1].forEach(side => ellipsoid(head, innerEar, [0.016, 0.01, 0.012], [side * 0.04, -0.085, 0.557]))
  stroke(head, [[-0.15, -0.27, 0.474], [0, -0.283, 0.486], [0.15, -0.27, 0.474]], 0.009, black)
  const eyes = [-1, 1].map(side => {
    const eye = new THREE.Group()
    eye.position.set(side * 0.285, 0.15, 0.365)
    head.add(eye)
    ellipsoid(eye, orange, [0.175, 0.192, 0.08], [0, 0, -0.012])
    ellipsoid(eye, white, [0.143, 0.16, 0.085], [0, 0, 0.023])
    ellipsoid(eye, iris, [0.088, 0.099, 0.032], [0, -0.018, 0.097])
    ellipsoid(eye, black, [0.052, 0.063, 0.017], [0, -0.022, 0.124])
    ellipsoid(eye, shine, [0.025, 0.029, 0.008], [-0.021, 0.012, 0.14])
    ellipsoid(eye, shine, [0.01, 0.011, 0.005], [0.02, -0.046, 0.142])
    return eye
  })
  const ears = [-1, 1].map(side => {
    const ear = new THREE.Group()
    ear.position.set(side * 0.47, 0.39, -0.055)
    head.add(ear)
    const shape = new THREE.Shape()
    shape.moveTo(-0.185, 0)
    shape.quadraticCurveTo(-0.16, 0.2, side * 0.085, 0.57)
    shape.quadraticCurveTo(side * 0.13, 0.61, side * 0.16, 0.5)
    shape.quadraticCurveTo(0.22, 0.18, 0.185, 0)
    shape.closePath()
    ear.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4, curveSegments: 24 }), orange))
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), innerEar)
    inner.scale.set(0.73, 0.8, 1)
    inner.position.set(0, 0.05, 0.147)
    ear.add(inner)
    return ear
  })
  const limbPattern = (x: number, y: number) => y < -0.55 ? creamColor : (Math.abs(y - 0.1) < 0.11 || Math.abs(y - 0.48) < 0.1) && x > -0.6 ? stripeColor : orangeColor
  const feet = [-1, 1].map(side => {
    const leg = new THREE.Group()
    leg.position.set(side * 0.24, 0.69, 0)
    root.add(leg)
    ellipsoid(leg, coat, [0.17, 0.29, 0.17], [0, -0.18, 0], limbPattern)
    ellipsoid(leg, cream, [0.16, 0.085, 0.2], [0, -0.43, 0.055])
    ;[-1, 0, 1].forEach(toe => ellipsoid(leg, cream, [0.047, 0.06, 0.065], [toe * 0.09, -0.455, 0.195]))
    return leg
  })
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group()
    arm.position.set(side * 0.35, 1.27, 0)
    root.add(arm)
    ellipsoid(arm, coat, [0.105, 0.31, 0.11], [0, -0.21, 0], limbPattern)
    ellipsoid(arm, cream, [0.11, 0.09, 0.135], [0, -0.48, 0.025])
    return arm
  })
  const tail = new THREE.Group()
  tail.position.set(0, 0.63, -0.24)
  root.add(tail)
  const tailMesh = stroke(tail, [[0, 0, 0], [-0.38, -0.02, -0.1], [-0.66, -0.25, -0.05], [-0.79, -0.32, 0.05], [-0.71, -0.36, 0.18]], 0.095, coat)
  paint(tailMesh.geometry, (_x, _y, _z, u) => [0.22, 0.51, 0.8].some(band => Math.abs(u - band) < 0.06) ? stripeColor : orangeColor)
  ellipsoid(tail, orange, [0.098, 0.1, 0.098], [-0.71, -0.36, 0.18])

  return {
    animate(t: number, walking: boolean, seated: number, typing: number, hanging: number, sway: number) {
      const stride = walking ? Math.sin(t * 9) : 0
      torso.scale.y = 1 - seated * 0.08
      head.position.y = 1.86 - seated * 0.06
      head.rotation.set(-typing * 0.04, Math.sin(t * 0.8) * 0.035 * (1 - hanging), Math.sin(t * 1.2) * 0.015)
      feet.forEach((leg, i) => {
        const side = i ? 1 : -1
        leg.rotation.x = stride * side * 0.38 * (1 - seated) - seated * 0.8
        leg.rotation.z = side * hanging * 0.08
        leg.position.y = 0.69 + seated * 0.1
      })
      arms.forEach((arm, i) => {
        const side = i ? 1 : -1
        arm.position.x = side * (0.35 - typing * 0.09)
        arm.rotation.x = stride * -side * 0.3 * (1 - seated) - typing * 1.3 + Math.sin(t * 9 + i * Math.PI) * typing * 0.05
        arm.rotation.x *= 1 - hanging
        arm.rotation.z = side * (0.12 * (1 - typing) - hanging * 0.06)
      })
      ears.forEach((ear, i) => { ear.rotation.z = (i ? 1 : -1) * (Math.sin(t * 1.5) * 0.018 + hanging * 0.08) })
      tail.rotation.y = Math.sin(t * (walking ? 4 : 1.5)) * (walking ? 0.22 : 0.12)
      tail.rotation.x = hanging * 0.5
      tail.rotation.z = sway * 0.3
      eyes.forEach(eye => { eye.scale.y = t % 6 > 5.82 ? 0.12 : 1 - typing * 0.08 })
    },
    dispose() {
      ;[coat, orange, cream, innerEar, pink, black, white, iris, shine].forEach(material => material.dispose())
    },
  }
}
