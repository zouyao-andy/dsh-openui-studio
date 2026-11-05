import { componentPoint } from './dom.js'
import { activity, defineStrategy } from './strategy.js'

const CHART_ROOTS = [
  '[data-openui-chart]',
  '.openui-bar-chart-container',
  '.openui-horizontal-bar-chart-container',
  '.openui-line-chart-container',
  '.openui-area-chart-container',
  '.openui-pie-chart-container',
]

function chartRoot(block) {
  for (const selector of CHART_ROOTS) {
    if (block.matches?.(selector)) return block
  }
  for (const selector of CHART_ROOTS) {
    const found = block.querySelector?.(selector)
    if (found) return found
  }
  return null
}

function chartType(root) {
  const classes = String(root.className ?? '').toLowerCase()
  if (classes.includes('horizontal-bar-chart')) return 'horizontal-bar'
  for (const type of ['bar', 'line', 'area', 'pie']) {
    if (classes.includes(`${type}-chart`)) return type
  }
  const raw = root.dataset?.openuiChart ?? ''
  if (raw.startsWith('{')) {
    try { return JSON.parse(raw).type ?? 'unknown' } catch { return 'unknown' }
  }
  return raw || 'unknown'
}

function chartMarks(root, type) {
  const selector = {
    bar: '.openui-bar-chart-bar',
    'horizontal-bar': '.openui-horizontal-bar-chart-bar',
    line: '.openui-line-chart-line, .openui-line-chart-dot',
    area: '.openui-area-chart-area-path, .openui-area-chart-area-line',
    pie: 'svg[aria-label="Pie chart"] path[fill]',
  }[type] ?? 'svg rect, svg path'
  return [...root.querySelectorAll?.(selector) ?? []].filter(element => {
    if (element.getAttribute?.('fill') === 'transparent' || String(element.className?.baseVal ?? element.className ?? '').includes('track')) return false
    const rect = element.getBoundingClientRect()
    return rect.width > 5 && (rect.height > 5 || ((type === 'line' || type === 'area') && element.tagName?.toLowerCase() === 'path'))
  }).slice(0, 24)
}

function markFrames(mark, type) {
  if (type === 'bar' || type === 'horizontal-bar') {
    const side = type === 'horizontal-bar' ? '0 100% 0 0'
      : String(mark.className?.baseVal ?? mark.className ?? '').includes('--negative') ? '100% 0 0 0' : '0 0 100% 0'
    return [{ opacity: 0, clipPath: `inset(${side})` }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }]
  }
  if (type === 'line' && typeof mark.getTotalLength === 'function') {
    try {
      const length = mark.getTotalLength()
      if (Number.isFinite(length) && length > 0) return [
        { opacity: 1, strokeDasharray: String(length), strokeDashoffset: String(length) },
        { opacity: 1, strokeDasharray: String(length), strokeDashoffset: '0' },
      ]
    } catch { /* Some SVG paths do not expose measurable geometry yet. */ }
  }
  if (type === 'pie') return [
    { opacity: 0, transform: 'scale(.82)', transformBox: 'fill-box', transformOrigin: 'center' },
    { opacity: 1, transform: 'scale(1)', transformBox: 'fill-box', transformOrigin: 'center' },
  ]
  return [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }]
}

export function chartAnimationsFor(block, duration, onMarks) {
  const root = chartRoot(block)
  if (!root) return []
  const type = chartType(root)
  const marks = chartMarks(root, type)
  if (!marks.length) return []
  onMarks?.(marks)
  const axes = type === 'pie' ? [] : [...root.querySelectorAll?.('svg [class*="-grid"], svg [class*="-x-axis"], svg [class*="-y-axis"]') ?? []]
    .filter(element => {
      const rect = element.getBoundingClientRect()
      return rect.width > 5 && rect.height > 5
    }).slice(0, 8)
  const animations = axes.map(element => element.animate([
    { opacity: 0 }, { opacity: 1 },
  ], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  const stagger = Math.min(70, Math.max(12, (duration - 560) / Math.max(1, marks.length - 1)))
  marks.forEach((mark, index) => animations.push(mark.animate(markFrames(mark, type), {
    delay: 180 + index * stagger,
    duration: Math.min(480, duration * .55),
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'both',
  })))
  return animations
}

function chartResizeAnimation(root, duration, markCount) {
  const rect = root?.getBoundingClientRect?.()
  const setWidth = root?.style?.width
  if (!rect || rect.width < 320 || rect.width > 850 || markCount > 12 || typeof root.animate !== 'function') return null
  if (setWidth && setWidth !== '100%' && setWidth !== 'auto') return null
  if (root.clientWidth > 0 && root.scrollWidth > root.clientWidth + 2) return null
  return root.animate([
    { width: `${Math.round(rect.width * .88)}px` },
    { width: `${Math.round(rect.width)}px` },
  ], { delay: Math.round(duration * .34), duration: Math.round(duration * .48), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' })
}

function chartLabel(block) {
  const type = chartType(chartRoot(block) ?? block)
  if (type === 'bar' || type === 'horizontal-bar') return activity(block, '绘制', '柱状图')
  if (type === 'line' || type === 'area') return activity(block, '绘制', '趋势图')
  if (type === 'pie') return activity(block, '绘制', '比例图')
  return activity(block, '绘制', '图表')
}

export const chart = defineStrategy({
  id: 'chart', kind: null,
  match: block => Boolean(chartRoot(block)),
  label: task => chartLabel(task.block),
  milestones: [.18, .58, .9],
  frameTarget: task => chartRoot(task.block) ?? task.block,
  point: (task, progress) => {
    if (task.chartResize && progress >= .34 && progress <= .84) {
      const rect = task.frameTarget.getBoundingClientRect()
      return { left: rect.right - 2, top: rect.bottom - 8 }
    }
    const marks = task.chartMarks
    if (marks?.length) {
      const rect = marks[Math.min(marks.length - 1, Math.floor(progress * marks.length))].getBoundingClientRect()
      return { left: rect.left + rect.width * .6, top: rect.top + rect.height * .4 }
    }
    return componentPoint(task.block, progress)
  },
  start: (task, context) => {
    const attempt = count => {
      if (context.finished()) return
      const animations = chartAnimationsFor(task.block, task.duration, marks => { task.chartMarks = marks })
      if (animations.length) {
        context.track(animations)
        const resize = chartResizeAnimation(task.frameTarget, task.duration, task.chartMarks.length)
        if (resize) { task.chartResize = true; context.track(resize) }
      } else if (count < 12) context.delay(() => attempt(count + 1), 90)
    }
    attempt(0)
  },
})
