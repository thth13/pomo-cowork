import 'server-only'

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

export const SITE_URL = 'https://pomo-co.work'
export const BLOG_DESCRIPTION = 'Practical guides to the Pomodoro technique, focused work, and online coworking.'
const contentDirectory = path.join(process.cwd(), 'content/blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  author: string
  authorType: 'Person' | 'Organization'
  date: string
  updated: string
  language: 'en' | 'es' | 'ru' | 'uk'
  category: string
  minutes: number
  content: string
}

function requiredText(data: Record<string, unknown>, key: string, file: string): string {
  const value = data[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${file}: ${key} must be a non-empty string`)
  return value.trim()
}

function dateField(data: Record<string, unknown>, key: string, file: string): string {
  const value = requiredText(data, key, file)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`${file}: ${key} must be a quoted YYYY-MM-DD date`)
  }
  return value
}

// Only explicitly published articles enter the public routes, metadata and sitemap.
export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const files = (await readdir(contentDirectory)).filter((file) => file.endsWith('.md'))
  const posts = await Promise.all(files.map(async (file): Promise<BlogPost | null> => {
    const { data, content } = matter(await readFile(path.join(contentDirectory, file), 'utf8'))
    if (data.published !== true) return null
    const slug = file.slice(0, -3)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: use a lowercase URL slug`)
    const date = dateField(data, 'date', file)
    const updated = data.updated === undefined ? date : dateField(data, 'updated', file)
    if (updated < date) throw new Error(`${file}: updated cannot precede date`)
    if (!['en', 'es', 'ru', 'uk'].includes(data.language)) throw new Error(`${file}: language must be en, es, ru or uk`)
    if (data.authorType !== undefined && !['Person', 'Organization'].includes(data.authorType)) throw new Error(`${file}: authorType must be Person or Organization`)
    if (!content.trim()) throw new Error(`${file}: article body is empty`)
    if (/^#\s/m.test(content)) throw new Error(`${file}: use ## headings; the title already renders an h1`)
    return {
      slug,
      title: requiredText(data, 'title', file),
      description: requiredText(data, 'description', file),
      author: requiredText(data, 'author', file),
      authorType: data.authorType ?? 'Person',
      category: requiredText(data, 'category', file),
      language: data.language,
      date,
      updated,
      minutes: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)),
      content,
    }
  }))
  return posts.filter((post): post is BlogPost => post !== null).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
})

export async function getBlogPost(slug: string) {
  return (await getBlogPosts()).find((post) => post.slug === slug)
}

export async function renderMarkdown(content: string) {
  // remark-html sanitizes HTML and unsafe URL protocols. Raw HTML is not supported.
  return String(await remark().use(html, { sanitize: true }).process(content))
}

export function postUrl(slug: string) {
  return `${SITE_URL}/blog/${slug}`
}

export function formatPostDate(date: string, language = 'en') {
  return new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(date))
}

export const blogCopy = {
  en: { home: 'Timer', blog: 'Blog', minutes: 'min read', updated: 'Updated', back: 'All articles', cta: 'Put it into practice', intro: 'Choose one task and start a focus session.', start: 'Open the Pomodoro timer', related: 'Keep reading' },
  es: { home: 'Temporizador', blog: 'Blog', minutes: 'min de lectura', updated: 'Actualizado', back: 'Todos los artículos', cta: 'Ponlo en práctica', intro: 'Elige una tarea e inicia una sesión de concentración.', start: 'Abrir el temporizador Pomodoro', related: 'Sigue leyendo' },
  ru: { home: 'Таймер', blog: 'Блог', minutes: 'мин чтения', updated: 'Обновлено', back: 'Все статьи', cta: 'Попробуйте на практике', intro: 'Выберите одну задачу и начните сессию фокусировки.', start: 'Открыть Pomodoro-таймер', related: 'Читайте также' },
  uk: { home: 'Таймер', blog: 'Блог', minutes: 'хв читання', updated: 'Оновлено', back: 'Усі статті', cta: 'Спробуйте на практиці', intro: 'Виберіть одне завдання та почніть сесію фокусування.', start: 'Відкрити Pomodoro-таймер', related: 'Читайте також' },
} as const
