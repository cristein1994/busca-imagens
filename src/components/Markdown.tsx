import { useState, type ReactNode } from 'react'
import styles from './Markdown.module.css'

type Block =
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string }

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className={styles.root}>
      {blocks.map((block, index) => {
        if (block.kind === 'code') {
          return <CodeBlock key={index} lang={block.lang} text={block.text} />
        }
        if (block.kind === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        return <p key={index}>{renderInline(block.text)}</p>
      })}
    </div>
  )
}

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <figure className={styles.code}>
      <figcaption>
        <span>{lang || 'código'}</span>
        <button type="button" onClick={() => void copy()}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </figcaption>
      <pre>
        <code>{text}</code>
      </pre>
    </figure>
  )
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let fence: { lang: string; lines: string[] } | null = null

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
    paragraph = []
  }

  function flushList() {
    if (list.length === 0) return
    blocks.push({ kind: 'list', items: list })
    list = []
  }

  for (const line of lines) {
    if (fence) {
      if (line.trim().startsWith('```')) {
        blocks.push({ kind: 'code', lang: fence.lang, text: fence.lines.join('\n') })
        fence = null
      } else {
        fence.lines.push(line)
      }
      continue
    }

    const fenceStart = line.match(/^```([\w.+-]*)\s*$/)
    if (fenceStart) {
      flushParagraph()
      flushList()
      fence = { lang: fenceStart[1] ?? '', lines: [] }
      continue
    }

    const item = line.match(/^\s*[-*]\s+(.+)$/)
    if (item?.[1]) {
      flushParagraph()
      list.push(item[1])
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  if (fence) blocks.push({ kind: 'code', lang: fence.lang, text: fence.lines.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}

function renderInline(text: string) {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  const nodes: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) nodes.push(text.slice(last, start))
    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(<code key={index}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={index}>{token.slice(2, -2)}</strong>)
    } else {
      const linked = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (linked?.[1] && linked[2]) {
        nodes.push(
          <a key={index} href={linked[2]} target="_blank" rel="noopener noreferrer">
            {linked[1]}
          </a>,
        )
      } else {
        nodes.push(token)
      }
    }
    last = start + token.length
    index += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
