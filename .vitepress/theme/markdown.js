// markdown.js - 纯粹的 markdown 转 HTML，不涉及任何 UI 逻辑

export function renderMarkdown(text) {
  if (!text) return ''

  const blocks = text.split(/\n\n+/)
  let html = ''

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // 代码块
    if (trimmed.startsWith('```')) {
      const match = trimmed.match(/^```(\w*)\n([\s\S]*?)```$/)
      if (match) {
        html += '<pre><code>' + escapeHtml(match[2].trim()) + '</code></pre>'
        continue
      }
    }

    // 标题
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

    // 列表
    const listLines = trimmed.split('\n')
    const allList = listLines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim() === '')
    if (allList && listLines.filter(l => l.trim()).length > 0) {
      html += '<ul>'
      for (const l of listLines) {
        if (l.trim()) html += '<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'
      }
      html += '</ul>'
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
  for (const line of text.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (m) result.push({ level: m[1].length, text: m[2] })
  }
  return result
}
