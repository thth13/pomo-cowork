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

  const current = node.nodeValue ?? ''
  const storedOriginal = originalTextByNode.get(node)

  if (language === defaultLanguage) {
    if (storedOriginal !== undefined && current !== storedOriginal) {
      node.nodeValue = storedOriginal
    }
    originalTextByNode.delete(node)
    return
  }

  if (storedOriginal !== undefined) {
    const storedTranslation = textMap[storedOriginal.trim()]
    const expectedValue = storedTranslation
      ? withOriginalWhitespace(storedOriginal, storedTranslation)
      : storedOriginal

    if (current === storedOriginal || current === expectedValue) {
      if (storedTranslation && current !== expectedValue) {
        node.nodeValue = expectedValue
      }
      return
    }

    // React reused this text node for new content. Treat the new value as source text.
    originalTextByNode.delete(node)
  }

  const source = current
  const key = source.trim()
  const translated = textMap[key]
  if (!translated) return

  originalTextByNode.set(node, source)
  const nextValue = withOriginalWhitespace(source, translated)
  if (current !== nextValue) {
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
    const storedOriginal = htmlElement.dataset[dataKey]

    if (language === defaultLanguage) {
      if (storedOriginal !== undefined && value !== storedOriginal) {
        element.setAttribute(attribute, storedOriginal)
      }
      if (storedOriginal !== undefined) {
        delete htmlElement.dataset[dataKey]
      }
      continue
    }

    let original = storedOriginal ?? value
    if (storedOriginal !== undefined) {
      const storedTranslation = attributeMap[storedOriginal]
      if (value !== storedOriginal && value !== storedTranslation) {
        delete htmlElement.dataset[dataKey]
        original = value
      }
    }

    const translated = attributeMap[original]
    if (!translated) continue

    if (htmlElement.dataset[dataKey] === undefined) {
      htmlElement.dataset[dataKey] = original
    }
    if (value !== translated) {
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

    // English is rendered directly by React. Observing it would compete with
    // dynamic text updates such as timers and online-user counters.
    if (language === defaultLanguage) {
      return
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text, domTranslations.es.text, language)
          continue
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, domTranslations.es.text, language)
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
