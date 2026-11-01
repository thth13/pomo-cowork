type Expression = 'neutral' | 'focus' | 'rest' | 'surprised' | 'happy'
export const BEEP_CELEBRATION_DURATION = 2.4

/** Face details share the head's transform. */
export function createBeepReactions(head: SVGGElement) {
  const group = (markup: string) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    element.innerHTML = markup
    element.style.visibility = 'hidden'
    head.appendChild(element)
    return element
  }
  const focus = group(`<g fill="#f7f3ea">
    <rect x="158" y="120" width="20" height="23" rx="5"/>
    <rect x="222" y="120" width="20" height="23" rx="5"/>
  </g>`)
  const rest = group(`<g fill="#f7f3ea">
    <rect x="157" y="128" width="22" height="8" rx="4"/>
    <rect x="221" y="128" width="22" height="8" rx="4"/>
  </g>`)
  const restingEyes = rest.querySelectorAll('rect')
  const surprised = group(`<g fill="#f7f3ea">
    <ellipse cx="168" cy="125" rx="13" ry="20"/>
    <ellipse cx="232" cy="125" rx="13" ry="20"/>
    <ellipse cx="200" cy="159" rx="9" ry="12"/>
  </g>`)
  const talking = group('<rect x="189" y="151" width="22" height="6" rx="3" fill="#f7f3ea"/>')
  const mouth = talking.querySelector('rect')!
  return {
    render(expression: Expression, speaking: boolean, time: number, reducedMotion: boolean) {
      focus.style.visibility = expression === 'focus' ? 'visible' : 'hidden'
      rest.style.visibility = expression === 'rest' ? 'visible' : 'hidden'
      // Heavy eyelids, with a long sleepy blink instead of alert open eyes.
      const blinkPhase = time % 4
      const blink = !reducedMotion && blinkPhase < 1.5 ? Math.sin(blinkPhase / 1.5 * Math.PI) : 0
      const eyeHeight = 8 - blink * 5
      restingEyes.forEach(eye => {
        eye.setAttribute('height', String(eyeHeight))
        eye.setAttribute('y', String(132 - eyeHeight / 2))
      })
      surprised.style.visibility = expression === 'surprised' ? 'visible' : 'hidden'
      talking.style.visibility = speaking && expression !== 'surprised' ? 'visible' : 'hidden'
      const opening = reducedMotion ? 7 : 5 + (Math.sin(time * 19) * 0.5 + 0.5) * 13
      mouth.setAttribute('height', String(opening))
      mouth.setAttribute('width', String(22 - (opening - 5) * 0.3))
      mouth.setAttribute('x', String(189 + (opening - 5) * 0.15))
    },
  }
}
