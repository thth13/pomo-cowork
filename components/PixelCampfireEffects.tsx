'use client'

import { useId, type CSSProperties } from 'react'

// Coordinates match the 1672 × 941 illustration. The SVG and image use the same
// centered cover crop, so the flames stay on the logs even on portrait screens.
const fireflies = [
  [382, 598, 7.3], [522, 702, 9.1], [644, 584, 8.4], [1102, 633, 10.2],
  [1228, 532, 8.8], [1304, 742, 11.4], [572, 778, 9.7], [1058, 760, 7.8],
] as const

export default function PixelCampfireEffects({ paused }: { paused: boolean }) {
  const glowId = useId()

  return (
    <svg
      className="pixel-scene-effects pixel-campfire-effects"
      viewBox="0 0 1672 941"
      preserveAspectRatio="xMidYMid slice"
      data-paused={paused ? 'true' : 'false'}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#ffbd55" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#ff8e35" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ff8e35" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="campfire-light" cx="836" cy="795" rx="262" ry="104" fill={`url(#${glowId})`} />

      <g shapeRendering="crispEdges">
        <g className="campfire-flame campfire-flame-left">
          <path fill="#ff9d36" d="M804 760h8v-20h4v-20h4v-24h4v32h4v16h4v24h-28z" />
          <path fill="#ffe59a" d="M816 760h4v-20h4v12h4v16h-12z" />
        </g>
        <g className="campfire-flame campfire-flame-center">
          <path fill="#ffb347" d="M828 752v-24h4v-24h4v-32h4v-16h4v40h4v24h4v40h-24z" />
          <path fill="#ffe9a0" d="M832 752v-24h4v-16h4v24h4v24h-12z" />
        </g>
        <g className="campfire-flame campfire-flame-right">
          <path fill="#ffab42" d="M852 768v-24h4v-24h4v-20h4v36h4v16h4v16z" />
          <path fill="#ffdf83" d="M856 768v-20h4v8h4v12z" />
        </g>

        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={`ember-${i}`}
            className="campfire-ember"
            x={816 + (i * 13) % 40}
            y={710 + (i * 7) % 35}
            width={i % 3 === 0 ? 4 : 3}
            height={i % 3 === 0 ? 6 : 4}
            fill={i % 3 === 0 ? '#ffe4a2' : '#ffaf50'}
            style={{
              '--ember-drift': `${(i % 2 ? 1 : -1) * (12 + i * 3)}px`,
              '--ember-rise': `${-95 - (i % 4) * 24}px`,
              animationDuration: `${3.2 + (i % 5) * 0.6}s`,
              animationDelay: `${-i * 0.73}s`,
            } as CSSProperties}
          />
        ))}

        {fireflies.map(([x, y, duration], i) => (
          <g
            key={`firefly-${i}`}
            className="campfire-firefly"
            style={{
              '--firefly-drift': `${i % 2 ? 20 : -16}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${-i * 1.7}s`,
            } as CSSProperties}
          >
            <rect x={x - 3} y={y - 3} width="10" height="10" fill="#c7dc8d" opacity="0.12" />
            <rect x={x} y={y} width="4" height="4" fill="#e1eeb0" />
          </g>
        ))}
      </g>
    </svg>
  )
}
