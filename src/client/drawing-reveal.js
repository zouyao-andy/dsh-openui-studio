export const DRAWING_AGENTS = [
  { id: 'structure', name: '结构', color: '#1677ff' },
  { id: 'writing', name: '内容', color: '#169b78' },
  { id: 'components', name: '组件', color: '#8a68d3' },
]

const ARRIVAL_MS = 220
const DEBUG_MAX_EVENTS = 1200

function createDebugSession(content, enabled) {
  if (!enabled) return null
  const startedAt = typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now()
  const events = []
  const write = (event, data = {}) => {
    const now = typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now()
    const entry = { at: Math.round((now - startedAt) * 10) / 10, event, ...data }
    events.push(entry)
    if (events.length > DEBUG_MAX_EVENTS) events.shift()
  }
  write('session-start', { content: Boolean(content) })
  return { write, events }
}

function describeBlock(block, index, task = {}) {
  const rect = block.getBoundingClientRect?.() ?? {}
  return {
    index,
    className: String(block.className ?? ''),
    kind: task.kind ?? blockKind(block),
    mode: task.mode,
    textLength: Array.from(block.textContent ?? block.innerText ?? '').length,
    top: Math.round(rect.top ?? 0),
    height: Math.round(rect.height ?? 0),
    start: task.start,
    duration: task.duration,
  }
}

function blocksIn(native) {
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

function blockKind(block) {
  const classes = `${block.className ?? ''} ${block.firstElementChild?.className ?? ''}`.toLowerCase()
  if (/header|heading|title/.test(classes)) return 'structure'
  if (/table|chart|card|steps|tabs|gallery|image|list|form/.test(classes)) return 'components'
  return 'writing'
}

function blockTitle(block) {
  const firstLine = (block.innerText || block.textContent || '').split(/\n/u).map(line => line.trim()).find(Boolean) || ''
  const subject = firstLine.split(/[：:]/u)[0].trim() || firstLine
  const characters = Array.from(subject)
  return characters.length > 16 ? `${characters.slice(0, 16).join('')}…` : subject
}

function sectionTitle(block) {
  if (blockKind(block) === 'structure') return blockTitle(block)
  for (let previous = block.previousElementSibling; previous; previous = previous.previousElementSibling) {
    if (blockKind(previous) === 'structure') return blockTitle(previous)
  }
  return blockTitle(block)
}

function blockAction(block, kind) {
  const subject = sectionTitle(block)
  if (!subject) return '正在构建界面'
  if (kind === 'structure') return `正在整理「${subject}」章节`
  if (kind === 'writing') return `正在撰写「${subject}」内容`
  if (hasImageText(block)) return `正在调整「${subject}」配图`
  const classes = `${block.className ?? ''} ${block.firstElementChild?.className ?? ''} ${block.querySelector?.('[class*="chart"]')?.className ?? ''}`.toLowerCase()
  if (classes.includes('table')) return `正在设计「${subject}」表格`
  if (/bar.?chart|horizontal.?bar/u.test(classes)) return `正在绘制「${subject}」柱状图`
  if (/line.?chart|area.?chart/u.test(classes)) return `正在绘制「${subject}」趋势图`
  if (/pie.?chart|radial.?chart/u.test(classes)) return `正在绘制「${subject}」比例图`
  if (classes.includes('chart')) return `正在绘制「${subject}」图表`
  if (classes.includes('card')) return `正在排版「${subject}」卡片`
  if (classes.includes('steps')) return `正在编排「${subject}」步骤`
  if (classes.includes('tabs')) return `正在配置「${subject}」标签页`
  return `正在构建「${subject}」组件`
}

function scrollContainer(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) return parent
  }
  return null
}

function followBlock(scroller, block, requestScroll, progress, point) {
  if (!scroller) return
  const viewport = scroller.getBoundingClientRect()
  const rect = block.getBoundingClientRect()
  const height = viewport.height || scroller.clientHeight
  const writingTop = point?.top ?? rect.top + rect.height * progress
  const distance = writingTop - (viewport.top + height * .64)
  if (distance > 8) requestScroll(scroller.scrollTop + distance)
}

function scrollMilestones(task) {
  if (task.mode === 'prose') return [.2, .75]
  if (task.mode === 'heading' || task.mode === 'outline') return [.9]
  return [.18, .58, .9]
}

function typingTargets(block, mode) {
  if (mode === 'heading') return [block.querySelector?.('.openui-header-top-left, .openui-inline-header-heading') ?? block]
  if (mode === 'outline') {
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

function startTyping(task) {
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

function typingPoint(task, progress) {
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

function restoreTyping(task) {
  task.typing?.parts.forEach(part => { part.target.style.clipPath = part.originalClipPath })
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

function componentPoint(block, progress) {
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

function placeCursor(cursor, content, block, kind, progress, scroller, writingPoint) {
  if (!cursor) return
  const origin = content.getBoundingClientRect()
  const point = writingPoint ?? (kind === 'components' ? componentPoint(block, progress) : textPoint(block, progress))
  const rect = block.getBoundingClientRect()
  const x = Math.max(2 - origin.left, Math.min(window.innerWidth - origin.left - 22, (point?.left ?? rect.left - 26) - origin.left))
  const y = (point?.top ?? rect.top + 6 + Math.max(0, rect.height - 22) * progress) - origin.top
  cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
  const viewport = scroller?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth }
  const leftSpace = origin.left + x - viewport.left - 24
  const rightSpace = viewport.right - origin.left - x - 24
  cursor.dataset.flagSide = kind === 'structure'
    ? leftSpace >= 132 ? 'left' : 'right'
    : rightSpace >= 132 ? 'right' : 'left'
  const available = cursor.dataset.flagSide === 'left' ? leftSpace : rightSpace
  cursor.style.setProperty('--openui-flag-space', `${Math.max(80, Math.floor(available - 8))}px`)
  return point
}

function placeFrame(frame, content, block, color) {
  if (!frame) return
  const origin = content.getBoundingClientRect()
  const rect = block.getBoundingClientRect()
  frame.style.transform = `translate3d(${rect.left - origin.left}px, ${rect.top - origin.top}px, 0)`
  frame.style.width = `${rect.width}px`
  frame.style.height = `${rect.height}px`
  frame.style.setProperty('--openui-drawing-color', color)
}

function hasImageText(block) {
  const selector = '.openui-image-text--horizontal, .openui-image-text-large'
  return block.matches?.(selector) || Boolean(block.querySelector?.(selector))
}

function appearanceMode(block, kind) {
  if (kind === 'structure') return 'heading'
  if (block.querySelector?.('.openui-foldable-section-trigger-content-text, .openui-inline-header-heading, .openui-tabs-trigger')) return 'outline'
  if (hasImageText(block)) return 'image'
  if (block.querySelector?.('table')) return 'table'
  if (block.matches?.('[data-openui-chart]') || block.querySelector?.('[data-openui-chart]')) return 'chart'
  if (block.querySelector?.('.openui-medium-card-block__item, .openui-small-card-block__item')) return 'cards'
  if (block.querySelector?.('.openui-step-item')) return 'steps'
  if (block.querySelector?.('.openui-tabs-trigger')) return 'tabs'
  if (kind === 'writing') return 'prose'
  return 'component'
}

function entranceFrames(mode) {
  if (mode === 'heading') return [
    { opacity: 0, offset: 0 },
    { opacity: 1, offset: .08 },
    { opacity: 1, offset: 1 },
  ]
  if (mode === 'prose') return [
    { opacity: 0, clipPath: 'inset(0 0 100% 0)', offset: 0 },
    { opacity: 1, clipPath: 'inset(0 0 90% 0)', offset: .1 },
    { opacity: 1, clipPath: 'inset(0 0 0 0)', offset: 1 },
  ]
  if (mode === 'image') return [
    { opacity: 0, transform: 'scale(.96)', offset: 0 },
    { opacity: 1, transform: 'scale(1)', offset: .6 },
    { opacity: 1, transform: 'scale(1)', offset: 1 },
  ]
  return [
    { opacity: 0, transform: 'translateY(8px)', offset: 0 },
    { opacity: 1, transform: 'translateY(0)', offset: .32 },
    { opacity: 1, transform: 'translateY(0)', offset: 1 },
  ]
}

function detailAnimationsFor(task) {
  const { block, mode } = task
  let targets = []
  let frames
  let duration = 500
  if (mode === 'table') {
    targets = [...block.querySelectorAll?.('.openui-table-row') ?? []]
    frames = [{ opacity: 0, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0px)' }]
    duration = 370
  } else if (mode === 'cards' || mode === 'steps') {
    targets = [...block.querySelectorAll?.(mode === 'cards' ? '.openui-medium-card-block__item, .openui-small-card-block__item' : '.openui-step-item') ?? []]
    frames = [{ opacity: 0, transform: mode === 'cards' ? 'translateY(12px) scale(.94)' : 'translateX(-9px)' }, { opacity: 1, transform: 'none' }]
    duration = 520
  } else if (mode === 'tabs') {
    targets = [...block.querySelectorAll?.('.openui-tabs-trigger, .openui-tabs-content') ?? []]
    frames = [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }]
    duration = 420
  }
  targets = targets.slice(0, 32)
  if (!targets.length) return []
  const stagger = Math.min(200, Math.max(35, (task.duration - duration - 120) / Math.max(1, targets.length - 1)))
  return targets.map((element, index) => element.animate(frames, {
    delay: 80 + index * stagger,
    duration,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'both',
  }))
}

export function chartAnimationsFor(block, duration) {
  const chart = block.matches?.('[data-openui-chart]') ? block : block.querySelector?.('[data-openui-chart]')
  if (!chart) return []
  const horizontal = chart.dataset.openuiChart?.includes('horizontal')
  const targets = [...chart.querySelectorAll('svg rect, svg path')].filter(element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 5 && rect.height > 5
  }).slice(0, 32)
  const frames = horizontal
    ? [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }]
    : [{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }]
  const stagger = Math.min(130, Math.max(35, (duration - 750) / Math.max(1, targets.length - 1)))
  return targets.map((element, index) => element.animate(frames, {
    delay: 80 + index * stagger,
    duration: 650,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'both',
  }))
}

export function imageReflowAnimations(block, duration) {
  const animations = []
  const horizontal = [
    ...(block.matches?.('.openui-image-text--horizontal') ? [block] : []),
    ...block.querySelectorAll?.('.openui-image-text--horizontal') ?? [],
  ]
  for (const pair of horizontal) {
    const image = pair.querySelector('.openui-image-text__image-container')
    const rect = image?.getBoundingClientRect()
    if (!rect || rect.width < 28 || rect.height < 28) continue
    animations.push(image.animate([
      { width: `${Math.round(rect.width * .58)}px`, height: `${Math.round(rect.height * .58)}px` },
      { width: `${rect.width}px`, height: `${rect.height}px` },
    ], { duration: Math.min(1400, duration * .9), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  }
  for (const image of block.querySelectorAll?.('.openui-image-text-large__image-wrap') ?? []) {
    const height = image.getBoundingClientRect().height
    if (height < 90) continue
    animations.push(image.animate([
      { maxHeight: `${Math.round(height * .55)}px` },
      { maxHeight: `${height}px` },
    ], { duration: Math.min(1500, duration), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  }
  return animations
}

/** Reveal the actual OpenUI tree as three cursors work down the document. */
export function playDrawingReveal(content, { fromStart = false, requireFocus = false, followScroll = true, debug: forceDebug = false, onDebugComplete } = {}) {
  const skipped = reason => {
    if (forceDebug) onDebugComplete?.([{ at: 0, event: 'session-skipped', reason }])
  }
  if (!content || !Element.prototype.animate) { skipped('renderer-unavailable'); return }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { skipped('reduced-motion'); return }
  if (requireFocus && (document.hidden || !document.hasFocus())) { skipped('background'); return }
  const scrollport = scrollContainer(content)
  const blocks = blocksIn(content.querySelector('.openui-native')).filter(block => {
    if (followScroll) return true
    const viewport = scrollport?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }
    const rect = block.getBoundingClientRect()
    return rect.bottom > viewport.top && rect.top < viewport.bottom
  })
  if (!blocks.length) { skipped('no-visible-blocks'); return }
  const debug = createDebugSession(content, forceDebug)
  const cursors = new Map(DRAWING_AGENTS.map(agent => [agent.id, content.querySelector(`[data-openui-agent="${agent.id}"]`)]))
  const frame = content.querySelector('.openui-drawing-frame')
  const scroller = followScroll ? scrollport : null
  const clock = () => typeof window.performance?.now === 'function' ? window.performance.now() : performance.now()
  let scrollTarget = scroller?.scrollTop ?? 0
  let scrollFrame = null
  let lastScrollTick = clock()
  const scrollStep = time => {
    if (!scroller) { scrollFrame = null; return }
    const remaining = scrollTarget - scroller.scrollTop
    if (Math.abs(remaining) < 1) { scrollFrame = null; return }
    const now = Number.isFinite(time) ? time : clock()
    const elapsed = Math.max(1, Math.min(64, now - lastScrollTick))
    lastScrollTick = now
    const eased = Math.abs(remaining) * (1 - Math.exp(-elapsed / 220))
    const distance = Math.min(Math.abs(remaining), Math.max(1, eased), elapsed * .65)
    scroller.scrollTop += Math.sign(remaining) * distance
    scrollFrame = window.requestAnimationFrame(scrollStep)
  }
  const requestScroll = (target, replace = false) => {
    if (!scroller) return
    const bounded = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, target))
    if (Math.abs(bounded - scrollTarget) > 8) debug?.write('scroll-target', { from: Math.round(scrollTarget), to: Math.round(bounded), scrollTop: Math.round(scroller.scrollTop), replace })
    scrollTarget = replace ? bounded : Math.max(scrollTarget, bounded)
    if (scrollFrame === null && Math.abs(scrollTarget - scroller.scrollTop) >= 1) {
      lastScrollTick = clock()
      scrollFrame = window.requestAnimationFrame(scrollStep)
    }
  }
  if (fromStart && scroller) {
    const answer = content.parentElement?.getBoundingClientRect?.() ?? content.getBoundingClientRect()
    const viewport = scroller.getBoundingClientRect()
    requestScroll(scroller.scrollTop + answer.top - viewport.top - 24, true)
  } else if (fromStart && followScroll) content.parentElement?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })

  let elapsed = 0
  const tasks = blocks.map((block, index) => {
    const height = block.getBoundingClientRect().height
    const kind = blockKind(block)
    const mode = appearanceMode(block, kind)
    const characters = Array.from(block.textContent || block.innerText || '').length
    const duration = mode === 'heading' ? Math.min(1500, Math.max(650, 300 + characters * 45))
      : mode === 'outline' ? Math.min(1900, Math.max(850, 420 + characters * 24))
        : Math.min(1400, Math.max(720, Math.round(460 + height * .3)))
    const pace = mode === 'heading' ? Math.min(1200, Math.max(650, Math.round(duration * .8)))
      : mode === 'outline' ? Math.min(1300, Math.max(650, Math.round(duration * .72)))
      : Math.min(760, Math.max(420, Math.round(360 + height * .18)))
    const task = {
      block, index, kind, mode, start: elapsed, duration,
    }
    elapsed += pace
    debug?.write('task-planned', describeBlock(block, index, task))
    return task
  })
  debug?.write('plan-ready', { blockCount: tasks.length, totalDuration: Math.round((tasks.at(-1)?.start ?? 0) + (tasks.at(-1)?.duration ?? 0) + ARRIVAL_MS) })
  const animations = tasks.map(task => {
    const animation = task.block.animate(entranceFrames(task.mode), {
    duration: task.duration,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'both',
    })
    animation.pause()
    animation.currentTime = 0
    return animation
  })
  const detailAnimations = []
  const activeTasks = new Map()
  const chartRetryTimers = []
  let frameAnimation = null
  let tickFrame = null
  const playbackStart = clock()
  let nextTaskIndex = 0
  let allDoneAt = null
  let finished = false
  content.dataset.openuiDrawing = 'active'
  const realign = () => {
    for (const [kind, task] of activeTasks) {
      const cursor = cursors.get(kind)
      placeCursor(cursor, content, task.block, kind, Number(cursor?.dataset.progress ?? 0), scroller)
      if (kind === 'components') placeFrame(frame, content, task.block, DRAWING_AGENTS[2].color)
    }
  }
  const finish = (reason = 'complete') => {
    if (finished) return
    finished = true
    debug?.write('session-finish', { reason, scrollTop: scroller?.scrollTop ?? null, scrollTarget })
    if (forceDebug) onDebugComplete?.([...debug.events])
    if (tickFrame !== null) window.cancelAnimationFrame(tickFrame)
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
    chartRetryTimers.forEach(timer => window.clearTimeout(timer))
    tasks.forEach(restoreTyping)
    animations.forEach(animation => animation.cancel())
    detailAnimations.forEach(animation => animation.cancel())
    frameAnimation?.cancel()
    frame?.classList.remove('openui-drawing-frame--active')
    for (const cursor of cursors.values()) cursor?.classList.remove('openui-drawing-cursor--active')
    delete content.dataset.openuiDrawing
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('resize', realign)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
  const onVisibilityChange = () => { if (document.hidden) finish() }
  const startChart = (task, attempt = 0) => {
    if (finished || task.chartStarted) return
    const chartAnimations = chartAnimationsFor(task.block, task.duration)
    if (chartAnimations.length) {
      task.chartStarted = true
      detailAnimations.push(...chartAnimations)
    } else if (attempt < 12) {
      chartRetryTimers.push(window.setTimeout(() => startChart(task, attempt + 1), 90))
    }
  }
  const activateTask = (task, now) => {
    task.activatedAt = now
    animations[task.index].play()
    const agent = DRAWING_AGENTS.find(item => item.id === task.kind)
    const cursor = cursors.get(task.kind)
    activeTasks.set(task.kind, task)
    if (task.mode === 'heading' || task.mode === 'outline') startTyping(task)
    if (cursor) {
      cursor.dataset.task = String(task.index)
      cursor.dataset.mode = 'pointing'
      cursor.dataset.progress = '0'
      cursor.querySelector('.openui-drawing-cursor__activity').textContent = blockAction(task.block, task.kind)
      placeCursor(cursor, content, task.block, task.kind, 0, scroller)
      cursor.classList.add('openui-drawing-cursor--active')
    }
    if (task.kind === 'components' && frame) {
      frameAnimation?.cancel()
      frame.dataset.task = String(task.index)
      placeFrame(frame, content, task.block, agent.color)
      frame.classList.add('openui-drawing-frame--active')
      frameAnimation = frame.animate([
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0 0 0)' },
      ], { duration: 820, fill: 'forwards', easing: 'cubic-bezier(.22, 1, .36, 1)' })
    }
    if (task.mode === 'image') detailAnimations.push(...imageReflowAnimations(task.block, task.duration))
    if (task.mode === 'chart') startChart(task)
    detailAnimations.push(...detailAnimationsFor(task))
    debug?.write('task-start', {
      ...describeBlock(task.block, task.index, task),
      typing: Boolean(task.typing), cursorPresent: Boolean(cursor),
      cursorActive: Boolean(cursor?.classList.contains?.('openui-drawing-cursor--active')),
      frameActive: Boolean(frame?.classList.contains?.('openui-drawing-frame--active')),
      animationState: animations[task.index]?.playState ?? null,
      activatedAt: Math.round(task.activatedAt - playbackStart),
      viewportTop: Math.round(scroller?.getBoundingClientRect?.().top ?? 0),
      viewportHeight: Math.round(scroller?.clientHeight ?? window.innerHeight ?? 0),
    })
  }
  const progressTask = (task, progress) => {
    const cursor = cursors.get(task.kind)
    const point = typingPoint(task, progress)
    if (cursor?.dataset.task === String(task.index)) {
      cursor.dataset.mode = task.typing ? 'typing' : task.kind === 'components' ? 'dragging' : 'pointing'
      cursor.dataset.progress = String(progress)
      placeCursor(cursor, content, task.block, task.kind, progress, scroller, point)
    }
    for (const milestone of scrollMilestones(task)) {
      if (progress < milestone || task.scrollMilestones?.has(milestone)) continue
      task.scrollMilestones ??= new Set()
      task.scrollMilestones.add(milestone)
      debug?.write('scroll-milestone', { index: task.index, mode: task.mode, milestone, scrollTop: scroller?.scrollTop ?? null })
      followBlock(scroller, task.block, requestScroll, milestone, point)
    }
    const progressMark = progress >= 1 ? 1 : progress >= .75 ? .75 : progress >= .5 ? .5 : progress >= .2 ? .2 : 0
    if (progressMark && task.debugProgressMark !== progressMark) {
      task.debugProgressMark = progressMark
      debug?.write('task-progress', {
        index: task.index, mode: task.mode, progress: progressMark,
        hasTyping: Boolean(task.typing), scrollTop: scroller?.scrollTop ?? null,
        cursorActive: Boolean(cursor?.classList.contains?.('openui-drawing-cursor--active')),
        cursorTask: cursor?.dataset.task ?? null,
        animationState: animations[task.index]?.playState ?? null,
        animationTime: animations[task.index]?.currentTime ?? null,
        blockTop: Math.round(task.block.getBoundingClientRect().top),
      })
    }
  }
  const completeTask = task => {
    restoreTyping(task)
    debug?.write('task-complete', { ...describeBlock(task.block, task.index, task), scrollTop: scroller?.scrollTop ?? null })
    if (activeTasks.get(task.kind) === task) activeTasks.delete(task.kind)
    const cursor = cursors.get(task.kind)
    if (cursor?.dataset.task === String(task.index)) cursor.classList.remove('openui-drawing-cursor--active')
    if (frame?.dataset.task === String(task.index)) frame.classList.remove('openui-drawing-frame--active')
  }
  const tick = () => {
    if (finished) return
    const now = clock()
    if (!document.hasFocus() && now - playbackStart > 1500) { finish('background'); return }
    if (nextTaskIndex < tasks.length && now - playbackStart >= ARRIVAL_MS) {
      const previous = tasks[nextTaskIndex - 1]
      if (!previous || previous.done || (now - previous.activatedAt) / previous.duration >= .72) {
        const task = tasks[nextTaskIndex]
        const viewport = scroller?.getBoundingClientRect()
        const rect = task.block.getBoundingClientRect()
        const atScrollEnd = scroller && scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2
        const inRevealArea = viewport && rect.top <= viewport.top + scroller.clientHeight * .8 && rect.bottom >= viewport.top
        if (!viewport || inRevealArea || atScrollEnd) {
          activateTask(task, now)
          nextTaskIndex++
        } else {
          const target = scroller.scrollTop + rect.top - viewport.top - scroller.clientHeight * .34
          requestScroll(target, rect.bottom < viewport.top)
        }
      }
    }
    for (const task of tasks) {
      if (task.activatedAt === undefined || task.done) continue
      const progress = Math.max(0, Math.min(1, (now - task.activatedAt) / task.duration))
      progressTask(task, progress)
      if (progress >= 1) { task.done = true; completeTask(task) }
    }
    if (tasks.at(-1).done) {
      allDoneAt ??= now
      if ((Math.abs(scrollTarget - (scroller?.scrollTop ?? scrollTarget)) < 20 && now - allDoneAt > 280) || now - allDoneAt > 4000) {
        finish('all-tasks-complete')
        return
      }
    }
    tickFrame = window.requestAnimationFrame(tick)
  }
  const onPointerDown = () => finish('pointerdown')
  const onWheel = () => finish('wheel')
  const onKeyDown = () => finish('keydown')
  const onBlur = () => finish('blur')
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', realign)
  window.addEventListener('blur', onBlur)
  document.addEventListener('visibilitychange', onVisibilityChange)
  tick()
  return finish
}
