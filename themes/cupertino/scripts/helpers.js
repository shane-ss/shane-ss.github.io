// Small helpers used by the post cards.

const stripTags = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()

// First real paragraph of a post, trimmed to `length` characters.
hexo.extend.helper.register('post_summary', (post, length = 120) => {
  if (post.description) return post.description
  const html = post.content || ''
  const paragraphs = html.match(/<p>([\s\S]*?)<\/p>/gi) || []
  let text = ''
  for (const p of paragraphs) {
    const inner = p.replace(/^<p>|<\/p>$/gi, '').trim()
    // skip paragraphs that are only a link or only an image
    if (/^<a\b[\s\S]*<\/a>$/i.test(inner) || /^<img\b[^>]*>$/i.test(inner)) continue
    text = stripTags(p)
    if (text.length >= 8) break
    text = ''
  }
  if (!text) text = stripTags(html.replace(/<(figure|pre|h[1-6])\b[\s\S]*?<\/\1>/gi, ' '))
  return text.length > length ? text.slice(0, length) + '…' : text
})

// Rough reading time: ~400 CJK characters or ~200 English words per minute.
hexo.extend.helper.register('reading_minutes', (post) => {
  const text = stripTags(post.content || '')
  const cjk = (text.match(/[一-鿿]/g) || []).length
  const words = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length
  return Math.max(1, Math.round(cjk / 400 + words / 200))
})
