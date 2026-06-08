// markdown.js - 纯粹的 markdown 转 HTML，不涉及任何 UI 逻辑

export function renderMarkdown(text) {
  if (!text) return ''

  // 先提取代码块，避免被段落分割破坏
  const codeBlocks = []
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length
    codeBlocks.push({ lang, code: code.trim() })
    return `\n__CODE_BLOCK_${index}__\n`
  })

  const blocks = processed.split(/\n\n+/)
  let html = ''

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // 代码块占位符
    const codeMatch = trimmed.match(/^__CODE_BLOCK_(\d+)__$/)
    if (codeMatch) {
      const cb = codeBlocks[parseInt(codeMatch[1])]
      html += '<pre><code>' + escapeHtml(cb.code) + '</code></pre>'
      continue
    }

    // 标题（必须在 # 后有空格）
    if (trimmed.startsWith('### ')) { html += '<h3>' + inline(trimmed.slice(4)) + '</h3>'; continue }
    if (trimmed.startsWith('## ')) { html += '<h2>' + inline(trimmed.slice(3)) + '</h2>'; continue }
    if (trimmed.startsWith('# ')) { html += '<h1>' + inline(trimmed.slice(2)) + '</h1>'; continue }

    // 分割线
    if (trimmed.match(/^---+$/)) { html += '<hr>'; continue }

    // 表格
    if (trimmed.includes('|') && trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(l => l.trim())
      const hasSep = lines.some(l => l.match(/^\|[\s\-:|]+\|$/))
      if (hasSep && lines.length >= 2) {
        html += '<table>'
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^\|[\s\-:|]+\|$/)) continue
          const cells = lines[i].split('|').slice(1, -1).map(c => c.trim())
          if (i === 0) {
            html += '<thead><tr>' + cells.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'
          } else {
            html += '<tr>' + cells.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'
          }
        }
        html += '</tbody></table>'
        continue
      }
    }

    // 列表（支持 - 和 *，以及有序列表 1.）
    const listLines = trimmed.split('\n')
    const allList = listLines.every(l => l.trim().match(/^[-*]\s+/) || l.trim().match(/^\d+\.\s+/) || l.trim() === '')
    if (allList && listLines.filter(l => l.trim()).length > 0) {
      const isOrdered = listLines.some(l => l.trim().match(/^\d+\.\s+/))
      const tag = isOrdered ? 'ol' : 'ul'
      html += `<${tag}>`
      for (const l of listLines) {
        if (l.trim()) {
          const content = l.trim().replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '')
          html += '<li>' + inline(content) + '</li>'
        }
      }
      html += `</${tag}>`
      continue
    }

    // 引用
    if (trimmed.startsWith('> ')) {
      html += '<blockquote>' + inline(trimmed.replace(/^>\s?/gm, '')) + '</blockquote>'
      continue
    }

    // 段落
    html += '<p>' + inline(trimmed) + '</p>'
  }

  return html
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, rawUrl) => {
      const href = safeUrl(rawUrl)
      if (!href) return label
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
    })
    .replace(/\n/g, '<br>')
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function safeUrl(rawUrl) {
  const decoded = String(rawUrl || '').trim().replace(/&amp;/g, '&')
  if (!decoded || /[\u0000-\u001f\u007f\s]/.test(decoded)) return ''
  try {
    const url = new URL(decoded, 'https://example.invalid')
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return ''
    return escapeHtml(decoded)
  } catch {
    return ''
  }
}

export function extractHeadings(text) {
  if (!text) return []
  const result = []
  // 排除代码块内的内容
  const withoutCode = text.replace(/```[\s\S]*?```/g, '')
  for (const line of withoutCode.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (m) result.push({ level: m[1].length, text: m[2] })
  }
  return result
}
