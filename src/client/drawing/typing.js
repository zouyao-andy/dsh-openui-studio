function typingTargets(block, mode) {
  if (mode === 'heading') return [block.querySelector?.('.openui-header-top-left, .openui-inline-header-heading') ?? block]
  if (mode === 'outline' || mode === 'tabs') {
    return [...block.querySelectorAll?.('.openui-foldable-section-trigger-content-text, .openui-inline-header-heading, .openui-tabs-trigger') ?? []]
  }
  return []
}

function textSegments(target) {
  const doc = target?.ownerDocument
  if (!doc?.createTreeWalker || !doc.defaultView?.NodeFilter) return []
  const walker = doc.createTreeWalker(target, doc.defaultView.NodeFilter.SHOW_TEXT)
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
  const segments = []
  for (let node = walker.nextNode(); node && segments.length < 2400; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    if (!text.trim() || !node.parentElement?.getClientRects?.().length) continue
    if (segmenter) {
      for (const part of segmenter.segment(text)) {
        segments.push({ node, start: part.index, end: part.index + part.segment.length })
        if (segments.length >= 2400) break
      }
    } else {
      let offset = 0
      for (const character of text) {
        segments.push({ node, start: offset, end: offset + character.length })
        offset += character.length
        if (segments.length >= 2400) break
      }
    }
  }
  return segments.length >= 2400 ? [] : segments
}

export function startTyping(task) {
  const targets = typingTargets(task.block, task.mode)
  if (targets.length > 16) return
  const parts = []
  const segments = []
  for (const target of targets) {
    const rect = target?.getBoundingClientRect?.()
    if (!rect || rect.width < 2 || rect.height < 2) continue
    const text = textSegments(target)
    if (segments.length + text.length >= 2400) return
    if (!text.length) continue
    const part = { target, originalClipPath: target.style.clipPath }
    parts.push(part)
    for (const segment of text) segments.push({ ...segment, part })
  }
  if (!segments.length) return
  task.typing = { parts, segments, currentPart: null }
  parts.forEach(part => { part.target.style.clipPath = 'inset(0 100% 0 0)' })
}

export function typingPoint(task, progress) {
  const typing = task.typing
  if (!typing) return null
  const index = Math.max(0, Math.min(typing.segments.length - 1, Math.ceil(progress * typing.segments.length) - 1))
  const segment = typing.segments[index]
  if (progress >= 1) typing.parts.forEach(part => { part.target.style.clipPath = 'inset(0 0 0 0)' })
  else if (typing.currentPart !== segment.part) {
    const active = typing.parts.indexOf(segment.part)
    typing.parts.forEach((part, partIndex) => {
      part.target.style.clipPath = partIndex < active ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)'
    })
    typing.currentPart = segment.part
  }
  const range = segment.part.target.ownerDocument.createRange()
  range.setStart(segment.node, segment.start)
  range.setEnd(segment.node, segment.end)
  const glyph = range.getBoundingClientRect()
  if (!glyph.height) return null
  if (progress > 0 && progress < 1) {
    const rect = segment.part.target.getBoundingClientRect()
    const top = Math.max(0, glyph.top - rect.top)
    const bottom = Math.min(rect.height, Math.max(top, glyph.bottom - rect.top))
    const x = Math.max(0, Math.min(rect.width, glyph.right - rect.left))
    segment.part.target.style.clipPath = `polygon(0 0, 100% 0, 100% ${top}px, ${x}px ${top}px, ${x}px ${bottom}px, 0 ${bottom}px)`
  }
  return { left: progress <= 0 ? glyph.left : glyph.right, top: glyph.top }
}

export function restoreTyping(task) {
  task.typing?.parts.forEach(part => { part.target.style.clipPath = part.originalClipPath })
}
