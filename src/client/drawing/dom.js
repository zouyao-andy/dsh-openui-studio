export function blocksIn(native) {
  const root = native?.firstElementChild?.firstElementChild?.firstElementChild
  if (!root) return []
  const blocks = root.children.length > 1 ? [...root.children] : [root]
  const revealBlocks = blocks.flatMap(block => {
    if (!block.matches?.('.openui-section-v2')) return [block]
    const header = block.querySelector('.openui-section-v2-header')
    const content = block.querySelector('.openui-section-v2-content')
    return header && content ? [header, ...content.children] : [block]
  })
  return revealBlocks.filter(block => {
    const rect = block.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
}

export function blockKind(block) {
  const classes = `${block.className ?? ''} ${block.firstElementChild?.className ?? ''}`.toLowerCase()
  if (/header|heading|title/.test(classes)) return 'structure'
  if (/table|chart|card|steps|tabs|gallery|image|list|form/.test(classes)) return 'components'
  return 'writing'
}

export function blockTitle(block) {
  const firstLine = (block.innerText || block.textContent || '').split(/\n/u).map(line => line.trim()).find(Boolean) || ''
  const subject = firstLine.split(/[：:]/u)[0].trim() || firstLine
  const characters = Array.from(subject)
  return characters.length > 16 ? `${characters.slice(0, 16).join('')}…` : subject
}

export function sectionTitle(block) {
  if (blockKind(block) === 'structure') return blockTitle(block)
  for (let previous = block.previousElementSibling; previous; previous = previous.previousElementSibling) {
    if (blockKind(previous) === 'structure') return blockTitle(previous)
  }
  return blockTitle(block)
}

export function subjectFor(block) {
  const subject = sectionTitle(block)
  return subject ? `「${subject}」` : ''
}

export function hasImageText(block) {
  const selector = '.openui-image-text--horizontal, .openui-image-text-large'
  return block.matches?.(selector) || Boolean(block.querySelector?.(selector))
}

export function textPoint(block, fraction) {
  const doc = block.ownerDocument
  if (!doc?.createTreeWalker || !doc.defaultView?.NodeFilter) return null
  const walker = doc.createTreeWalker(block, doc.defaultView.NodeFilter.SHOW_TEXT)
  const nodes = []
  let total = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    nodes.push(node)
    total += node.textContent.length
  }
  let offset = Math.min(total - 1, Math.floor(total * Math.max(0, Math.min(1, fraction))))
  for (const node of nodes) {
    const length = node.textContent?.length ?? 0
    if (!length) continue
    if (offset >= length) { offset -= length; continue }
    const start = Math.max(0, Math.min(offset, length - 1))
    const range = doc.createRange()
    try {
      range.setStart(node, start)
      range.setEnd(node, start + 1)
    } catch { return null }
    const rect = range.getBoundingClientRect()
    if (rect.height) return { left: fraction === 0 ? rect.left : rect.right, top: rect.top }
    break
  }
  return null
}

export function componentPoint(block, progress) {
  const selectors = [
    '.openui-image-text__image-container, .openui-image-text-large__image-wrap',
    'thead th, tbody td',
    '.openui-medium-card-block__item, .openui-small-card-block__item',
    '.openui-step-item',
    '.openui-tabs-trigger, .openui-tabs-content',
    '[class*="chart"] svg rect, [class*="chart"] svg path',
  ]
  for (const selector of selectors) {
    const targets = [...(block.querySelectorAll?.(selector) ?? [])].filter(element => {
      const rect = element.getBoundingClientRect()
      return rect.width > 8 && rect.height > 8
    })
    if (!targets.length) continue
    const rect = targets[Math.min(targets.length - 1, Math.floor(progress * targets.length))].getBoundingClientRect()
    return targets.length === 1
      ? { left: rect.left + rect.width * (.18 + progress * .68), top: rect.top + rect.height * (.2 + progress * .65) }
      : { left: rect.left + Math.min(rect.width * .65, 140), top: rect.top + Math.min(rect.height * .45, 32) }
  }
  const rect = block.getBoundingClientRect()
  return { left: rect.left + rect.width * (.3 + progress * .45), top: rect.top + rect.height * (.18 + progress * .55) }
}
