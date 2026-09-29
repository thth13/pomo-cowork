'use client'

import { useEffect, type RefObject } from 'react'

const surfaces = '.seo-header, .seo-content, .seo-footer'

// Sample each glass surface's actual object-fit: cover crop. Videos use their
// still poster so text does not flicker as frames change.
export function useSceneryContrast(imageRef: RefObject<HTMLImageElement>, sceneId: string) {
  useEffect(() => {
    const image = imageRef.current
    const root = image?.closest('.pomodoro-home, .seo-shell')
    if (!image || !root) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 16
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const tracked = new Set<HTMLElement>()
    let frame = 0

    const update = () => {
      if (!image.complete || !image.naturalWidth) return
      const viewport = image.getBoundingClientRect()
      if (!viewport.width || !viewport.height) return
      const scale = Math.max(viewport.width / image.naturalWidth, viewport.height / image.naturalHeight)
      const offsetX = (image.naturalWidth * scale - viewport.width) / 2
      const offsetY = (image.naturalHeight * scale - viewport.height) / 2
      root.querySelectorAll<HTMLElement>(surfaces).forEach(surface => {
        if (!tracked.has(surface)) {
          tracked.add(surface)
          resize.observe(surface)
        }
        const rect = surface.getBoundingClientRect()
        const left = Math.max(rect.left, viewport.left)
        const top = Math.max(rect.top, viewport.top)
        const width = Math.min(rect.right, viewport.right) - left
        const height = Math.min(rect.bottom, viewport.bottom) - top
        if (width <= 0 || height <= 0) return
        try {
          context.clearRect(0, 0, 16, 16)
          context.drawImage(image, (left - viewport.left + offsetX) / scale, (top - viewport.top + offsetY) / scale, width / scale, height / scale, 0, 0, 16, 16)
          // Account for the page wash (20%) and glass tint (12%).
          context.globalAlpha = 1 - 0.8 * 0.88
          context.fillStyle = getComputedStyle(surface).getPropertyValue('--pixel-page').trim()
          context.fillRect(0, 0, 16, 16)
          context.globalAlpha = 1
          const pixels = context.getImageData(0, 0, 16, 16).data
          let luminance = 0
          for (let i = 0; i < pixels.length; i += 4) {
            const linear = [pixels[i], pixels[i + 1], pixels[i + 2]].map(channel => {
              const value = channel / 255
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
            })
            luminance += linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
          }
          surface.dataset.sceneryText = luminance / 256 > 0.179 ? 'dark' : 'light'
        } catch {
          // Keep theme colors if the image cannot be sampled.
          delete surface.dataset.sceneryText
        }
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    const content = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node =>
        node instanceof Element && (node.matches(surfaces) || node.querySelector(surfaces))
      ))) schedule()
    })
    content.observe(root, { childList: true, subtree: true })
    const theme = new MutationObserver(schedule)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    image.addEventListener('load', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      content.disconnect()
      theme.disconnect()
      image.removeEventListener('load', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
      tracked.forEach(surface => { delete surface.dataset.sceneryText })
    }
  }, [imageRef, sceneId])
}
