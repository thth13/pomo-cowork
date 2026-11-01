import lottie from 'lottie-web'
import type { CompanionPose } from './CompanionScene'
import { createBeepWorkScene } from './BeepWorkScene'
import { BEEP_CELEBRATION_DURATION, createBeepReactions } from './BeepReactions'

/** Keep playback in the companion's existing visibility-aware animation loop. */
export async function createCompanionScene(container: HTMLDivElement) {
  const response = await fetch('/assets/companion/rigged-tom/beep_pomo.json')
  if (!response.ok) throw new Error('Unable to load companion animation')
  const animationData = await response.json()
  // Make expressions independent of the ambient timeline without changing the source asset.
  for (const layer of animationData.layers) {
    layer.cl = `companion-${layer.nm}`
    if (['eyes', 'happy', 'bubble'].includes(layer.nm)) layer.ks.o = { a: 0, k: 100 }
    if (layer.nm === 'bubble') layer.ks.s = { a: 0, k: [100, 100, 100] }
    // Keep both arms resting instead of replaying the greeting in every loop.
    if (layer.nm === 'armR') layer.ks.r = { a: 0, k: -8 }
    if (layer.nm === 'armL') layer.ks.r = { a: 0, k: 8 }
    // Mouth motion is driven by visible text, independently of the source timeline.
    if (layer.nm === 'mouth') {
      const path = layer.shapes[0].it.find((shape: { ty: string }) => shape.ty === 'sh')
      path.ks = { a: 0, k: path.ks.k[0].s[0] }
    }
  }
  const animation = lottie.loadAnimation({
    container,
    renderer: 'svg',
    autoplay: false,
    loop: true,
    animationData,
    rendererSettings: { progressiveLoad: false, focusable: false },
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => finish(new Error('Companion animation timed out')), 15000)
      const ready = () => finish()
      const failed = () => finish(new Error('Unable to render companion animation'))
      function finish(error?: Error) {
        window.clearTimeout(timeout)
        animation.removeEventListener('DOMLoaded', ready)
        animation.removeEventListener('data_failed', failed)
        animation.removeEventListener('error', failed)
        if (error) reject(error)
        else resolve()
      }
      animation.addEventListener('DOMLoaded', ready)
      animation.addEventListener('data_failed', failed)
      animation.addEventListener('error', failed)
      if (animation.isLoaded) finish()
    })
  } catch (error) {
    animation.destroy()
    throw error
  }
  const expressions = {
    eyes: container.querySelector<SVGGElement>('.companion-eyes'),
    happy: container.querySelector<SVGGElement>('.companion-happy'),
    mouth: container.querySelector<SVGGElement>('.companion-mouth'),
    bubble: container.querySelector<SVGGElement>('.companion-bubble'),
    hearts: container.querySelectorAll<SVGGElement>('.companion-heart1, .companion-heart2'),
  }
  const svg = container.querySelector('svg')
  if (!svg) {
    animation.destroy()
    throw new Error('Companion artwork unavailable')
  }
  const workScene = createBeepWorkScene(svg)
  const head = container.querySelector<SVGGElement>('.companion-head')
  if (!head) {
    animation.destroy()
    throw new Error('Companion face unavailable')
  }
  const reactions = createBeepReactions(head)
  const show = (element: SVGGElement | null, visible: boolean) => {
    if (element) element.style.visibility = visible ? 'visible' : 'hidden'
  }
  let previousTime: number | undefined
  let elapsed = 0
  let work = 0
  let disposed = false
  return {
    canMove() { return work < 0.02 },
    render(time: number, pose: CompanionPose) {
      if (disposed) return
      const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(time - previousTime, 0.05))
      previousTime = time
      if (!pose.reducedMotion) elapsed += dt
      const celebrating = time < (pose.celebrateUntil || 0) && !pose.held
      const celebrationTime = celebrating ? Math.max(0, BEEP_CELEBRATION_DURATION - ((pose.celebrateUntil || 0) - time)) : 0
      const cheering = celebrating && (pose.reducedMotion || celebrationTime >= 0.55)
      const working = pose.mood === 'focus' && !pose.walking && !pose.held && !celebrating
      const resting = pose.mood === 'break' && !pose.walking && !pose.held && !celebrating
      work = pose.reducedMotion ? Number(working) : Math.max(0, Math.min(1, work + (working ? 1 : -1) * dt / 0.45))
      if (pose.held) work = 0
      const frame = pose.reducedMotion || work > 0 || resting || pose.held || celebrating ? 0 : elapsed * animation.frameRate % Math.max(1, animation.totalFrames)
      animation.goToAndStop(frame, true)
      const expression = pose.held ? 'surprised' : cheering || pose.hovered ? 'happy' : resting ? 'rest' : working || celebrating ? 'focus' : 'neutral'
      show(expressions.eyes, expression === 'neutral')
      show(expressions.happy, expression === 'happy')
      show(expressions.mouth, expression === 'happy' && !pose.speaking)
      show(expressions.bubble, !!pose.speaking)
      expressions.hearts.forEach(heart => show(heart, !!pose.hovered))
      const smooth = (value: number) => {
        const clamped = Math.max(0, Math.min(1, value))
        return clamped * clamped * (3 - 2 * clamped)
      }
      const returning = smooth((celebrationTime - 1.95) / 0.45)
      const exit = celebrating && !pose.reducedMotion ? smooth(celebrationTime / 0.55) * (1 - returning) : 0
      const arms = !celebrating ? 0 : pose.reducedMotion ? 1 : smooth((celebrationTime - 0.55) / 0.35) * (1 - returning)
      const jumpPhase = Math.max(0, Math.min(1, (celebrationTime - 0.8) / 0.75))
      const jump = cheering && !pose.reducedMotion ? Math.sin(jumpPhase * Math.PI) * 30 : 0
      workScene.render(work, jump, exit, arms, elapsed, pose.reducedMotion, pose.pointAt)
      reactions.render(expression, !!pose.speaking, elapsed, pose.reducedMotion)
      const tilt = pose.held && !pose.reducedMotion
        ? Math.max(-0.25, Math.min(0.25, -(pose.dragVelocity || 0) / 3600)) : 0
      container.style.transform = `rotate(${tilt}rad)`
    },
    dispose() {
      disposed = true
      animation.destroy()
      container.style.transform = ''
    },
  }
}
