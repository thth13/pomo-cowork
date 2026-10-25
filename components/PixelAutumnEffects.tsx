'use client'

import type { CSSProperties } from 'react'

const leafColors = ['#e49b38', '#c55b2d', '#edbd59', '#af4831', '#d67b30'] as const

// Fixed positions avoid hydration differences. Match the illustration's cover
// crop so mobile retains the same leaf scale and direction of the breeze.
const leaves = Array.from({ length: 26 }, (_, i) => ({
  x: -200 + (i * 137) % 1720,
  y: -100 + (i % 4) * 48,
  size: 0.65 + (i % 5) * 0.17,
  duration: 17 + (i % 7) * 2.1,
  delay: -i * 2.73,
  color: leafColors[i % leafColors.length],
  drift: 180 + (i % 5) * 48,
  flutter: 3.6 + (i % 4) * 0.7,
}))

export default function PixelAutumnEffects({ paused }: { paused: boolean }) {
  return (
    <svg
      className="pixel-scene-effects pixel-autumn-effects"
      viewBox="0 0 1672 941"
      preserveAspectRatio="xMidYMid slice"
      data-paused={paused ? 'true' : 'false'}
      aria-hidden="true"
      focusable="false"
    >
      <g shapeRendering="crispEdges">
        {leaves.map((leaf, i) => (
          <g key={i} transform={`translate(${leaf.x} ${leaf.y})`}>
            <g
              className="autumn-leaf-fall"
              style={{
                '--leaf-drift': `${leaf.drift}px`,
                '--leaf-opacity': i % 3 === 0 ? 0.55 : 0.85,
                animationDuration: `${leaf.duration}s`,
                animationDelay: `${leaf.delay}s`,
              } as CSSProperties}
            >
              <g
                className="autumn-leaf-sway"
                style={{ animationDuration: `${leaf.flutter * 1.6}s`, animationDelay: `${leaf.delay}s` }}
              >
                <g transform={`scale(${leaf.size})`}>
                  <g
                    className="autumn-leaf-flutter"
                    style={{ animationDuration: `${leaf.flutter}s`, animationDelay: `${leaf.delay}s` }}
                  >
                    {i % 2 === 0 ? (
                      <path fill={leaf.color} d="M-2-14h4v6h4v-4h4v6h4v4h-4v4h4v4h-8v4h-4v4h-4v-4h-4v-4h-8v-4h4v-4h-4v-4h4v-6h4v4h4z" />
                    ) : (
                      <path fill={leaf.color} d="M-2-14h4v4h4v4h4v12h-4v4h-4v4h-4v-4h-4v-4h-4v-12h4v-4h4z" />
                    )}
                    <path fill="#78442c" opacity="0.65" d="M-1-6h2v24h-2zM1 0h4v2h-4zM-5 4h4v2h-4z" />
                    <path fill="#ffe0a0" opacity="0.45" d="M-2-10h2v6h-2zM-6-4h2v4h-2z" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}
