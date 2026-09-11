import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

/** Markdown -> sanitised HTML. Sanitising matters: entry bodies are user input. */
export function renderMarkdown(src?: string): string {
  if (!src) return ''
  return DOMPurify.sanitize(marked.parse(src, { async: false }) as string)
}
