'use client'

import { useEffect, useRef, useState } from 'react'

export const useTaskMenu = (isDisabled: boolean) => {
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const taskPickerRef = useRef<HTMLDivElement | null>(null)
  const taskDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isTaskMenuOpen) {
      setTaskSearch('')
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        taskPickerRef.current &&
        !taskPickerRef.current.contains(event.target as Node) &&
        !taskDropdownRef.current?.contains(event.target as Node)
      ) {
        setIsTaskMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setIsTaskMenuOpen(false)
        taskPickerRef.current?.querySelector('button')?.focus()
      }
    }

    const ownerDocument = taskPickerRef.current?.ownerDocument ?? document
    ownerDocument.addEventListener('pointerdown', handleOutsideClick)
    ownerDocument.addEventListener('keydown', handleEscape)

    return () => {
      ownerDocument.removeEventListener('pointerdown', handleOutsideClick)
      ownerDocument.removeEventListener('keydown', handleEscape)
    }
  }, [isTaskMenuOpen])

  useEffect(() => {
    if (isDisabled && isTaskMenuOpen) {
      setIsTaskMenuOpen(false)
    }
  }, [isDisabled, isTaskMenuOpen])

  return {
    isTaskMenuOpen,
    setIsTaskMenuOpen,
    taskSearch,
    setTaskSearch,
    taskPickerRef,
    taskDropdownRef,
  }
}
