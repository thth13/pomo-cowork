'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { playTomatoThrowSound, playTomatoSplashSound } from '@/lib/tomatoSound'

interface TomatoAnimation {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  fromUserId: string
  toUserId: string
}

interface TomatoThrowProps {
  tomatoThrows: TomatoAnimation[]
  onAnimationComplete: (id: string) => void
  currentUserId?: string
}

interface SplashEffect {
  id: string
  x: number
  y: number
}

interface Particle {
  id: string
  x: number
  y: number
  angle: number
  distance: number
  rotation: number
}

export default function TomatoThrow({ tomatoThrows, onAnimationComplete, currentUserId }: TomatoThrowProps) {
  const [splashes, setSplashes] = useState<SplashEffect[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const completedTomatoes = useRef<Set<string>>(new Set())

  const handleTomatoComplete = (tomato: TomatoAnimation) => {
    // Prevent double calls
    if (completedTomatoes.current.has(tomato.id)) {
      return
    }
    completedTomatoes.current.add(tomato.id)
    
    // Play splash sound only for sender
    const shouldPlaySound = currentUserId && tomato.fromUserId === currentUserId
    
    if (shouldPlaySound) {
      playTomatoSplashSound()
    }

    // Create splash effect at end position
    setSplashes(prev => [...prev, {
      id: `splash-${tomato.id}`,
      x: tomato.endX,
      y: tomato.endY
    }])

    // Create particles flying in different directions
    const particleCount = 12
    const newParticles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const distance = 60 + Math.random() * 40
      const rotation = Math.random() * 360
      
      newParticles.push({
        id: `particle-${tomato.id}-${i}`,
        x: tomato.endX,
        y: tomato.endY,
        angle,
        distance,
        rotation
      })
    }
    
    setParticles(prev => [...prev, ...newParticles])

    // Remove splash and particles after animation
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== `splash-${tomato.id}`))
      setParticles(prev => prev.filter(p => !p.id.startsWith(`particle-${tomato.id}`)))
      completedTomatoes.current.delete(tomato.id)
    }, 1000)

    onAnimationComplete(tomato.id)
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {/* Flying tomatoes */}
        {tomatoThrows.map((tomato) => {
          // Play throw sound only for sender
          const shouldPlaySound = currentUserId && tomato.fromUserId === currentUserId
          
          return (
          <motion.div
            key={tomato.id}
            initial={{ 
              x: tomato.startX, 
              y: tomato.startY,
              scale: 0.3,
              rotate: 0,
              opacity: 0
            }}
            onAnimationStart={() => {
              if (shouldPlaySound) {
                playTomatoThrowSound()
              }
            }}
            animate={{ 
              x: tomato.endX, 
              y: tomato.endY,
              scale: [0.3, 1.3, 1.1, 1],
              rotate: [0, 180, 360, 540, 720],
              opacity: [0, 1, 1, 1, 0.9]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 1.0,
              ease: [0.34, 1.56, 0.64, 1], // Bouncy easing
              times: [0, 0.3, 0.6, 1],
              rotate: {
                duration: 1.0,
                ease: "linear"
              }
            }}
            onAnimationComplete={() => handleTomatoComplete(tomato)}
            className="absolute text-6xl"
            style={{
              left: 0,
              top: 0,
              filter: 'drop-shadow(0 6px 12px rgba(220, 38, 38, 0.4)) drop-shadow(0 0 8px rgba(255, 100, 100, 0.3))',
              transform: 'translate(-50%, -50%)'
            }}
          >
            🍅
          </motion.div>
          )
        })}
        
        {/* Explosion effects */}
        {splashes.map((splash) => (
          <motion.div
            key={splash.id}
            initial={{ 
              x: splash.x,
              y: splash.y,
              scale: 0.3,
              opacity: 1
            }}
            animate={{ 
              scale: [0.3, 1.8, 2.5],
              opacity: [1, 0.8, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: "easeOut"
            }}
            className="absolute"
            style={{
              left: 0,
              top: 0,
              transform: `translate(-50%, -50%)`
            }}
          >
            <div className="relative">
              {/* Main explosion emoji */}
              <motion.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, 1.5, 1.2],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 0.5 }}
                className="text-6xl"
              >
                💥
              </motion.div>
              
              {/* Red splash background */}
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ 
                  scale: [0, 2, 3],
                  opacity: [0.8, 0.4, 0]
                }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 -z-10 flex items-center justify-center"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-radial from-red-500/60 via-red-400/30 to-transparent blur-md" />
              </motion.div>
              
              {/* Splatter marks */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    scale: [0, 1, 0.8],
                    x: Math.cos(i * Math.PI / 4) * (30 + Math.random() * 20),
                    y: Math.sin(i * Math.PI / 4) * (30 + Math.random() * 20),
                    opacity: [1, 0.6, 0]
                  }}
                  transition={{ 
                    duration: 0.6,
                    delay: i * 0.03
                  }}
                  className="absolute text-2xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  💧
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
        
        {/* Flying particles/debris */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: particle.x,
              y: particle.y,
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            animate={{ 
              x: particle.x + Math.cos(particle.angle) * particle.distance,
              y: particle.y + Math.sin(particle.angle) * particle.distance + 30, // Gravity effect
              scale: [1, 0.8, 0.3],
              opacity: [1, 0.8, 0],
              rotate: particle.rotation
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            className="absolute text-xl"
            style={{
              left: 0,
              top: 0,
              transform: 'translate(-50%, -50%)',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            }}
          >
            {particle.id.charCodeAt(particle.id.length - 1) % 3 === 0 ? '🍅' : particle.id.charCodeAt(particle.id.length - 1) % 3 === 1 ? '💧' : '✨'}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
