import type { CompanionPose } from './CompanionScene'

/** Sprite Fusion artwork with local canvas motion. No API calls or secrets in the client. */
export async function createCompanionScene(canvas: HTMLCanvasElement) {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Unable to load companion artwork'))
    image.src = '/assets/companion/pixel-human/companion.png'
  })
  const source = document.createElement('canvas')
  source.width = image.naturalWidth
  source.height = image.naturalHeight
  const sourceContext = source.getContext('2d')
  const context = canvas.getContext('2d')
  if (!sourceContext || !context) throw new Error('Canvas unavailable')
  sourceContext.drawImage(image, 0, 0)
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height)
  let left = source.width, top = source.height, right = 0, bottom = 0
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    if (pixels.data[(y * source.width + x) * 4 + 3] < 32) continue
    left = Math.min(left, x); right = Math.max(right, x)
    top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  const width = right - left + 1, height = bottom - top + 1
  if (width <= 0 || height <= 0) throw new Error('Empty companion artwork')
  const scale = 2
  const artWidth = width * scale, artHeight = height * scale
  canvas.width = canvas.height = 288
  context.imageSmoothingEnabled = false
  let previousTime: number | undefined
  let work = 0, rest = 0, held = 0, angle = 0, angularVelocity = 0
  let disposed = false
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const ease = (value: number) => value * value * (3 - 2 * value)
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color
    context.fillRect(Math.round(x), Math.round(y), w, h)
  }
  const picture = (walking: boolean, time: number, direction: number, sitting: number) => {
    context.save()
    if (direction < 0) context.scale(-1, 1)
    const dx = -artWidth / 2
    const dy = 125 - artHeight - sitting * 6
    const legHeight = Math.max(1, Math.floor(height * 0.21))
    const bodyHeight = height - legHeight
    if (walking) {
      const step = Math.sin(time * 11)
      context.drawImage(image, left, top, width, bodyHeight, dx, dy, artWidth, bodyHeight * scale)
      const half = Math.floor(width / 2)
      context.drawImage(image, left, top + bodyHeight, half, legHeight, dx, dy + bodyHeight * scale - Math.max(0, step) * 3, half * scale, legHeight * scale)
      context.drawImage(image, left + half, top + bodyHeight, width - half, legHeight, dx + half * scale, dy + bodyHeight * scale - Math.max(0, -step) * 3, (width - half) * scale, legHeight * scale)
    } else context.drawImage(image, left, top, width, height, dx, dy, artWidth, artHeight - sitting * 5)
    context.restore()
  }

  return {
    canMove() { return work < 0.02 && rest < 0.02 && held < 0.02 },
    render(time: number, pose: CompanionPose) {
      if (disposed) return
      const dt = previousTime === undefined ? 0 : clamp(time - previousTime, 0, 0.05)
      previousTime = time
      const t = pose.reducedMotion ? 0 : time
      const goalWork = pose.mood === 'focus' && !pose.walking && !pose.held ? 1 : 0
      const goalRest = pose.mood === 'break' && !pose.walking && !pose.held ? 1 : 0
      work = pose.reducedMotion ? goalWork : clamp(work + (goalWork ? 1 : -1) * dt / 0.65, 0, 1)
      rest = pose.reducedMotion ? goalRest : clamp(rest + (goalRest ? 1 : -1) * dt / 0.75, 0, 1)
      held = pose.reducedMotion ? Number(!!pose.held) : held + (Number(!!pose.held) - held) * Math.min(1, dt * 12)
      if (pose.held) { work = 0; rest = 0 }
      if (pose.reducedMotion) { angle = 0; angularVelocity = 0 }
      else {
        const pull = pose.held ? clamp(-(pose.dragVelocity || 0) / 1800, -0.7, 0.7) : 0
        angularVelocity += ((pull - angle) * 40 - angularVelocity * 7) * dt
        angle += angularVelocity * dt
      }
      const sitting = ease(work), reclining = ease(rest)
      const walking = pose.walking && work < 0.02 && rest < 0.02 && held < 0.02
      context.clearRect(0, 0, 288, 288)
      context.save()
      context.translate(72, 62)
      context.globalAlpha = 0.12 * (1 - held)
      context.fillStyle = '#303a32'
      context.beginPath(); context.ellipse(72, 127, 25, 4, 0, 0, Math.PI * 2); context.fill()
      context.globalAlpha = 1
      // Pixel chair stays behind the character; the desk is drawn in front.
      if (work > 0) {
        context.globalAlpha = sitting
        rect(43, 68, 48, 46, '#647b5b'); rect(47, 72, 40, 33, '#98ab8a')
        rect(47, 112, 5, 17, '#52664b'); rect(83, 112, 5, 17, '#52664b')
        context.globalAlpha = 1
      }
      if (rest > 0) {
        context.globalAlpha = reclining
        rect(19, 107, 107, 17, '#788c68'); rect(19, 103, 107, 14, '#a9bb91')
        rect(21, 123, 6, 7, '#52664b'); rect(116, 123, 6, 7, '#52664b')
        rect(99, 98, 22, 10, '#fbfaf5')
        context.globalAlpha = 1
      }
      context.save()
      context.translate(72, 43)
      context.rotate(angle * held)
      context.translate(-72, -43)
      const bob = walking ? Math.abs(Math.sin(t * 11)) * -2 : Math.sin(t * 2) * (1 - held) * 0.7
      context.translate(72 - 52 * reclining, bob - 45 * reclining)
      context.translate(0, 125 * reclining)
      context.rotate(Math.PI / 2 * reclining)
      context.translate(0, -125 * reclining)
      picture(walking, t, pose.direction, sitting)
      context.restore()
      if (work > 0) {
        context.globalAlpha = sitting
        rect(22, 101, 102, 7, '#d5bd94'); rect(26, 108, 6, 23, '#856b4c'); rect(115, 108, 6, 23, '#856b4c')
        rect(61, 71, 43, 30, '#354b61'); rect(65, 75, 35, 22, '#a9cbd1')
        rect(70, 81, 18, 2, '#5b8e9a'); rect(70, 86, 24, 2, '#5b8e9a'); rect(70, 91, 13, 2, '#5b8e9a')
        rect(56, 100, 53, 3, '#657b8c')
        const tap = Math.sin(t * 10) > 0 ? 1 : 0
        rect(48, 97 - tap, 8, 5, '#e9ba8b'); rect(57, 98 + tap, 7, 4, '#e9ba8b')
        context.globalAlpha = 1
      }
      context.restore()
    },
    dispose() { disposed = true; context.clearRect(0, 0, 288, 288); image.src = ''; source.width = source.height = 0 },
  }
}
