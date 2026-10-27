/** A stable, local pixel portrait for an anonymous participant. */
export default function GuestAvatar({ userId }: { userId: string }) {
  let hash = 2166136261
  for (let index = 0; index < userId.length; index++) {
    hash = Math.imul(hash ^ userId.charCodeAt(index), 16777619) >>> 0
  }

  const pixels = Array.from({ length: 25 }, (_, index) => {
    const x = index % 5
    const y = Math.floor(index / 5)
    const mirroredX = Math.min(x, 4 - x)
    return (x === 2 && y === 2) || ((hash >>> (y * 3 + mirroredX)) & 1)
      ? <rect key={index} x={x + 2} y={y + 2} width="1" height="1" />
      : null
  })

  return (
    <svg className="guest-avatar" viewBox="0 0 9 9" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {pixels}
    </svg>
  )
}
