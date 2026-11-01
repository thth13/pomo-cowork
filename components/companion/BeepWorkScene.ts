/** Local SVG furniture and typing poses, in the artwork's 400×400 coordinates. */
export function createBeepWorkScene(svg: SVGSVGElement) {
  const group = (markup = '') => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    element.innerHTML = markup
    return element
  }
  const character = group()
  Array.from(svg.children).forEach(child => {
    if (child.tagName.toLowerCase() !== 'defs') character.appendChild(child)
  })
  const desk = group(`
    <g stroke="#2b3a33" stroke-width="3" stroke-linejoin="round">
      <path d="M86 317v68m228-68v68" fill="none" stroke="#856b4c" stroke-width="10"/>
      <path d="M62 295h276l15 17H47z" fill="#e4cda8"/>
      <rect x="47" y="312" width="306" height="10" rx="3" fill="#b69a73"/>
    </g>`)
  // We see the outside of the lid; the display faces Beep behind it.
  const laptop = group(`<g stroke="#2b3a33" stroke-width="3" stroke-linejoin="round">
    <path d="M170 303h119l12 6H160z" fill="#9dada6"/>
    <path d="M185 245h100l-6 58h-88z" fill="#647b5b"/>
    <path d="M191 251h88" fill="none" stroke="#91a485"/>
    <circle cx="235" cy="274" r="6" fill="#c3d2b9" stroke="none"/>
    <path d="M191 303h88" fill="none" stroke="#435a40" stroke-width="5"/>
  </g>`)
  desk.appendChild(laptop)
  const arm = (selector: string) => {
    const source = character.querySelector<SVGGElement>(selector)
    const pivot = group()
    if (source?.parentNode) {
      source.parentNode.insertBefore(pivot, source)
      pivot.appendChild(source)
    }
    return pivot
  }
  const leftArm = arm('.companion-armL')
  const rightArm = arm('.companion-armR')
  desk.style.opacity = '0'
  svg.append(character, desk)
  return {
    render(progress: number, jump: number, exit: number, arms: number, time: number, reducedMotion: boolean, pointAt?: { x: number; y: number }) {
      desk.style.opacity = String(progress)
      desk.setAttribute('transform', `translate(${(1 - progress) * 30} 0)`)
      character.setAttribute('transform', `translate(${-exit * 20} ${-jump})`)
      // Move the original arm layers at their shoulders; never replace or detach them.
      const tap = reducedMotion ? 0 : Math.sin(time * 14) * 2 * progress
      leftArm.setAttribute('transform', `rotate(${-48 * progress + arms * 150 + tap} 128 248)`)
      rightArm.setAttribute('transform', `rotate(${48 * progress - arms * 150 + tap} 272 248)`)
      if (pointAt) {
        // Convert actor CSS coordinates to the original 400×400 artwork.
        const x = pointAt.x / 144 * 400
        const y = (pointAt.y - 10) / 144 * 400
        const right = x >= 200
        const shoulderX = right ? 272 : 128
        const angle = Math.atan2(y - 248, x - shoulderX) * 180 / Math.PI - 90 - (right ? -8 : 8)
        const pointingArm = right ? rightArm : leftArm
        pointingArm.setAttribute('transform', `rotate(${angle} ${shoulderX} 248)`)
      }
    },
  }
}
