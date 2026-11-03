'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { ReactNode, useCallback, useState } from 'react'

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  separated?: boolean;
}

// The journal shell owns theme tokens, including scenery and project colors.
// Portal there so the popup retains those tokens without being clipped by cards.
export default function JournalSelect({
  id, name, value, onValueChange, options, placeholder, placeholderIcon,
  disabled, invalid, describedBy, labelledBy
}: {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  placeholderIcon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  labelledBy: string;
}) {
  const [container, setContainer] = useState<HTMLElement>()
  const selected = options.find(option => option.value === value)
  const attachTrigger = useCallback((node: HTMLButtonElement | null) => {
    const shell = node?.closest<HTMLElement>('.journal-shell')
    if (shell) setContainer(shell)
  }, [])

  return <SelectPrimitive.Root name={name} value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectPrimitive.Trigger
      ref={attachTrigger}
      id={id}
      className="journal-select-trigger"
      aria-labelledby={labelledBy}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      title={selected?.label}
    >
      <span className="journal-select-icon" aria-hidden="true">{selected?.icon || placeholderIcon}</span>
      <SelectPrimitive.Value placeholder={placeholder}>{selected?.label}</SelectPrimitive.Value>
      <SelectPrimitive.Icon className="journal-select-chevron"><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content className="journal-select-popup" position="popper" sideOffset={6} collisionPadding={12} align="start">
        <SelectPrimitive.ScrollUpButton className="journal-select-scroll"><ChevronUp size={16} aria-hidden="true" /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="journal-select-viewport">
          {options.map(option => <SelectPrimitive.Item key={option.value} value={option.value} textValue={option.label} className="journal-select-option" data-separated={option.separated || undefined}>
            <span className="journal-select-icon" aria-hidden="true">{option.icon}</span>
            <span className="journal-select-copy">
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              {option.description && <span className="journal-select-description">{option.description}</span>}
            </span>
            <SelectPrimitive.ItemIndicator className="journal-select-check"><Check size={16} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="journal-select-scroll"><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
}
