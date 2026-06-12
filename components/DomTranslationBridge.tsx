'use client'

import { useEffect } from 'react'
import { defaultLanguage } from '@/lib/i18n/translations'
import { domTranslations } from '@/lib/i18n/domTranslations'
import type { LanguageCode } from '@/lib/i18n/translations'

const attributeDataPrefix = 'i18nOriginalAttr'
const translatableAttributes = ['placeholder', 'title', 'aria-label'] as const
const originalTextByNode = new WeakMap<Text, string>()

function withOriginalWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? ''
  const trailing = original.match(/\s*$/)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function translateTextNode(node: Text, textMap: Record<string, string>, language: string) {
  const parent = node.parentElement
  if (!parent) return

  const original = originalTextByNode.get(node) ?? node.nodeValue ?? ''
  if (!originalTextByNode.has(node) && original.trim()) {
    originalTextByNode.set(node, original)
  }

  const source = originalTextByNode.get(node) ?? original
  const key = source.trim()
  const translated = textMap[key]
  const nextValue =
    language === defaultLanguage
      ? source
      : translated
        ? withOriginalWhitespace(source, translated)
        : null

  if (nextValue !== null && node.nodeValue !== nextValue) {
    node.nodeValue = nextValue
  }
}

function translateElementAttributes(
  element: Element,
  attributeMap: Record<string, string>,
  language: string
) {
  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute)
    if (!value) continue

    const dataKey = `${attributeDataPrefix}${attribute.replace('-', '')}`
    const htmlElement = element as HTMLElement
    const original = htmlElement.dataset[dataKey] ?? value
    if (!htmlElement.dataset[dataKey]) {
      htmlElement.dataset[dataKey] = original
    }

    const translated = language === defaultLanguage ? original : attributeMap[original]
    if (translated && value !== translated) {
      element.setAttribute(attribute, translated)
    }
  }
}

function translateTree(root: ParentNode, language: string) {
  const dictionaries = domTranslations.es
  const textMap = language === 'es' ? dictionaries.text : {}
  const attributeMap = language === 'es' ? dictionaries.attributes : {}

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    translateTextNode(current as Text, textMap, language)
    current = walker.nextNode()
  }

  if (root instanceof Element) {
    translateElementAttributes(root, attributeMap, language)
  }

  root.querySelectorAll?.('*').forEach((element) => {
    translateElementAttributes(element, attributeMap, language)
  })
}

export default function DomTranslationBridge({ language }: { language: LanguageCode }) {
  useEffect(() => {
    translateTree(document.body, language)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text, language === 'es' ? domTranslations.es.text : {}, language)
          continue
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, language === 'es' ? domTranslations.es.text : {}, language)
            return
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node as Element, language)
          }
        })
      }
    })

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [language])

  return null
}
