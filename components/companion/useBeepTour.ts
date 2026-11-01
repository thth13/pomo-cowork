'use client'

import { logBeepEvent } from '@/lib/beepEvents'
import type { BeepAction } from '@/lib/beepEventTypes'
import { useEffect, useRef } from 'react'
import { TASK_CHANGED_EVENT, type TaskChange } from '@/hooks/useQuickTasks'
import type { RefObject } from 'react'
import styles from './WalkingCompanion.module.css'

export const BEEP_GUIDE_MODAL_SELECTOR = 'dialog[open], [aria-modal="true"]'

const toolPanels: Record<number, string> = { 6: 'sounds', 7: 'progress', 8: 'goal', 9: 'habits', 10: 'history', 11: 'chat' }

export type GuideTarget = { x: number; y: number; pointX: number; pointY: number } | null

// These anchors belong to the real controls: the tour never creates sample records.
export function useBeepTour(active: boolean, step: number, advance: () => void, onTarget: (target: GuideTarget) => void, bubbleRef: RefObject<HTMLElement>) {
  const callbacks = useRef({ advance, onTarget })
  callbacks.current = { advance, onTarget }
  const projectId = useRef<string | null>(null)
  const taskId = useRef<string | null>(null)

  useEffect(() => {
    if (!active) { callbacks.current.onTarget(null); return }
    if (step === 0) { projectId.current = null; taskId.current = null }
    const bubble = bubbleRef.current
    let highlighted: HTMLElement | null = null
    let highlightedElements: HTMLElement[] = []
    let frame = 0
    let clickFrame = 0
    let lastGeometry = ''
    let scrolled: HTMLElement | null = null
    let advanced = false
    let submitted = false
    const visible = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector)).find(element => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    })
    const taskPlay = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('#workspace-tasks [data-beep-tour="task-play"]'))
        .filter(element => element.getBoundingClientRect().height > 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]'))
      return buttons.find(element => element.dataset.taskId === taskId.current) ?? buttons[0]
    }
    const findTarget = () => {
      if (step === 1) return visible('button[aria-controls="workspace-tasks"]') ?? visible('[data-workspace-menu-trigger]')
      if (step === 2) return visible('#workspace-tasks [data-beep-tour="project"]') ?? visible('button[aria-controls="workspace-tasks"]') ?? visible('[data-workspace-menu-trigger]')
      if (step === 3) {
        const forms = Array.from(document.querySelectorAll<HTMLElement>('#workspace-tasks [data-beep-tour="task"]'))
        const form = forms.find(element => !projectId.current || element.dataset.projectId === projectId.current)
        if (form && form.getBoundingClientRect().height > 0) return form
        return Array.from(document.querySelectorAll<HTMLElement>('#workspace-tasks .focus-project-disclosure[aria-expanded="false"]')).find(button => button.getAttribute('aria-controls') === `project-todos-${projectId.current}`) ?? visible('button[aria-controls="workspace-tasks"]') ?? visible('[data-workspace-menu-trigger]')
      }
      if (step === 4) return visible('[data-beep-tour="task-picker"]') ?? taskPlay()
      if (step === 5) return visible('[data-beep-tour="register"]') ?? visible('[data-workspace-menu-trigger]')
      const panel = toolPanels[step]
      if (panel) return visible(`button[aria-controls="workspace-${panel}"]`) ?? visible('[data-workspace-menu-trigger]')
    }
    const clear = () => {
      highlightedElements.forEach(element => {
        element.classList.remove(styles.tourTarget)
        element.removeAttribute('data-beep-tour-active')
      })
      highlightedElements = []
      highlighted = null
      callbacks.current.onTarget(null)
    }
    const track = () => {
      frame = requestAnimationFrame(track)
      if (document.hidden) return
      const modal = Boolean(document.querySelector(BEEP_GUIDE_MODAL_SELECTOR))
      if (bubble) bubble.style.visibility = modal ? 'hidden' : ''
      const element = !modal ? findTarget() : undefined
      if ((element ?? null) !== highlighted) {
        clear()
        highlighted = element ?? null
        lastGeometry = ''
      }
      const elements = element ? [element] : []
      const play = !modal && step === 4 ? taskPlay() : undefined
      if (play && !elements.includes(play)) elements.push(play)
      highlightedElements.filter(target => !elements.includes(target)).forEach(target => {
        target.classList.remove(styles.tourTarget)
        target.removeAttribute('data-beep-tour-active')
      })
      elements.forEach(target => {
        target.classList.add(styles.tourTarget)
        target.setAttribute('data-beep-tour-active', target === element ? 'primary' : 'secondary')
      })
      highlightedElements = elements
      if (!element) return
      if (scrolled !== element) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
        scrolled = element
      }
      const rect = element.getBoundingClientRect()
      const geometry = `${rect.x}:${rect.y}:${rect.width}:${rect.height}:${window.innerWidth}:${window.innerHeight}`
      if (geometry === lastGeometry) return
      lastGeometry = geometry
      const pointX = rect.left + rect.width / 2
      const pointY = rect.top + rect.height / 2
      const x = rect.right + 152 < window.innerWidth ? rect.right + 8 : rect.left >= 152 ? rect.left - 152 : Math.max(0, Math.min(window.innerWidth - 144, pointX - 72))
      const y = rect.right + 152 < window.innerWidth || rect.left >= 152 ? pointY - 90 : rect.bottom + 164 < window.innerHeight - 68 ? rect.bottom + 8 : rect.top - 164
      callbacks.current.onTarget({ x, y: Math.max(8, Math.min(window.innerHeight - 172, y)), pointX, pointY })
    }
    const next = () => { if (!advanced) { advanced = true; callbacks.current.advance() } }
    // Capture before React closes a mobile menu or a control stops propagation.
    // Advance on the next frame, after the control's own action has run.
    const click = (event: MouseEvent) => {
      const clicked = event.target
      if (!(clicked instanceof Node)) return
      const control = highlightedElements.find(element => element.contains(clicked))
      if (!control || control.matches(':disabled, [aria-disabled="true"]')) return
      const clickedElement = clicked instanceof Element ? clicked : clicked.parentElement
      const button = clickedElement?.closest('button, a, select, input[type="submit"]')
      // Forms are highlighted too: record their buttons, never text-field clicks or values.
      if (button && control.contains(button) && !button.matches(':disabled, [aria-disabled="true"]')) {
        const panel = toolPanels[step]
        const action: BeepAction = control.matches('[data-workspace-menu-trigger]') ? 'target_menu'
          : control.matches('button[aria-controls="workspace-tasks"]') ? 'target_tasks'
          : control.matches('[data-beep-tour="project"]') ? (button.matches('[type="submit"]') ? 'target_project' : 'target_project_color')
          : control.matches('.focus-project-disclosure') ? 'target_project_expand'
          : control.matches('[data-beep-tour="task"]') ? 'target_task'
          : control.matches('[data-beep-tour="task-play"]') ? 'target_task_play'
          : control.matches('[data-beep-tour="task-picker"]') ? 'target_task_picker'
          : control.matches('[data-beep-tour="register"]') ? 'target_register'
          : `target_${panel}` as BeepAction
        logBeepEvent(action, 'tour', step)
      }
      if (step === 5 && control.matches('[data-beep-tour="register"]')) {
        event.preventDefault()
        event.stopPropagation()
        window.dispatchEvent(new Event('pomo:open-registration'))
        clickFrame = requestAnimationFrame(next)
        return
      }
      const panel = toolPanels[step]
      if (step === 4 || panel && control.matches(`button[aria-controls="workspace-${panel}"]`)) {
        clickFrame = requestAnimationFrame(next)
        return
      }
      if (step === 1 && control.matches('button[aria-controls="workspace-tasks"]')) {
        clickFrame = requestAnimationFrame(() => { if (visible('#workspace-tasks [data-beep-tour="project"]')) next() })
      }
    }
    const submit = (event: Event) => {
      const form = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('#workspace-tasks [data-beep-tour="project"], #workspace-tasks [data-beep-tour="task"]') : null
      submitted = Boolean(form)
      if (step === 3 && form?.dataset.beepTour === 'task') projectId.current = form.dataset.projectId ?? null
    }
    const saved = (event: Event) => {
      const change = (event as CustomEvent<TaskChange>).detail
      if (!submitted || !change || !('task' in change)) return
      if (step === 2 && !change.task.parentId) { projectId.current = change.task.id; next() }
      if (step === 3 && change.task.parentId === projectId.current) { taskId.current = change.task.id; next() }
    }
    frame = requestAnimationFrame(track)
    document.addEventListener('click', click, true)
    document.addEventListener('submit', submit, true)
    window.addEventListener(TASK_CHANGED_EVENT, saved)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(clickFrame)
      document.removeEventListener('click', click, true)
      document.removeEventListener('submit', submit, true)
      window.removeEventListener(TASK_CHANGED_EVENT, saved)
      clear()
      if (bubble) bubble.style.visibility = ''
    }
  }, [active, step, bubbleRef])
}
