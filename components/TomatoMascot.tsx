'use client'

import React, { useEffect, useRef, useState } from 'react'

export function TomatoMascot({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      
      // Calculate the center of the tomato
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate the distance from center
      const diffX = e.clientX - centerX
      const diffY = e.clientY - centerY

      // Calculate angle and distance
      const angle = Math.atan2(diffY, diffX)
      
      // Max eye displacement
      const maxDisplacement = 4

      // Use the distance to limit how far the eyes move (so they don't pop out)
      const dist = Math.min(maxDisplacement, Math.hypot(diffX, diffY) / 20)

      setEyePos({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist
      })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={className || "w-16 h-16 sm:w-20 sm:h-20 mb-2"}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        {/* Tomato Body */}
        <circle cx="50" cy="55" r="40" fill="#ef4444" />
        
        {/* Tomato Stem and Leaves */}
        <path d="M 50 15 C 45 5, 30 15, 25 25 C 35 25, 45 20, 50 25 C 55 20, 65 25, 75 25 C 70 15, 55 5, 50 15 Z" fill="#22c55e" />
        <path d="M 50 15 Q 52 5 55 5" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />

        {/* Left Eye Whites */}
        <circle cx="35" cy="50" r="10" fill="white" />
        {/* Left Pupil */}
        <circle cx={35 + eyePos.x} cy={50 + eyePos.y} r="4" fill="#1f2937" />

        {/* Right Eye Whites */}
        <circle cx="65" cy="50" r="10" fill="white" />
        {/* Right Pupil */}
        <circle cx={65 + eyePos.x} cy={50 + eyePos.y} r="4" fill="#1f2937" />

        {/* Cute Smile */}
        <path d="M 40 68 Q 50 78 60 68" fill="none" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
        
        {/* Blush */}
        <circle cx="25" cy="62" r="5" fill="#fca5a5" opacity="0.6" />
        <circle cx="75" cy="62" r="5" fill="#fca5a5" opacity="0.6" />
      </svg>
    </div>
  )
}
