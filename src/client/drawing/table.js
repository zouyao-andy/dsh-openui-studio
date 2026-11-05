import { componentPoint } from './dom.js'
import { activity, defineStrategy } from './strategy.js'

function tableElement(block) {
  return block.matches?.('table') ? block : block.querySelector?.('table') ?? null
}

function bodyRows(block) {
  const body = [...block.querySelectorAll?.('.openui-table-body .openui-table-row') ?? []]
  return body.length ? body : [...block.querySelectorAll?.('.openui-table-row') ?? []]
}

function canResize(table, rowCount) {
  const rect = table?.getBoundingClientRect?.()
  const container = table?.parentElement
  if (!rect || rect.width < 320 || rect.width > 1000 || rowCount > 12 || typeof table.animate !== 'function') return false
  if (table.style?.width && table.style.width !== '100%') return false
  return !(container?.clientWidth > 0 && container.scrollWidth > container.clientWidth + 2)
}

export function tableAnimationsFor(block, duration, table = tableElement(block)) {
  const animations = []
  const heads = [...block.querySelectorAll?.('.openui-table-header .openui-table-head') ?? []].slice(0, 8)
  const allRows = bodyRows(block)
  const rows = allRows.slice(0, 8)
  heads.forEach((head, index) => animations.push(head.animate([
    { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
    { opacity: 1, clipPath: 'inset(0 0 0 0)' },
  ], { delay: 60 + index * 55, duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' })))
  rows.forEach((row, index) => animations.push(row.animate([
    { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
    { opacity: 1, clipPath: 'inset(0 0 0 0)' },
  ], { delay: 210 + index * 78, duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' })))

  const resizable = canResize(table, allRows.length)
  if (resizable) {
    const width = table.getBoundingClientRect().width
    animations.push(table.animate([
      { width: `${Math.round(width * .86)}px` },
      { width: `${Math.round(width)}px` },
    ], { delay: 150, duration: Math.min(620, duration * .6), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  }
  return { animations, resizable }
}

export const table = defineStrategy({
  id: 'table', kind: null,
  match: block => Boolean(block.matches?.('table') || block.querySelector?.('table')),
  label: task => activity(task.block, '调整', '表格'),
  milestones: [.18, .58, .9],
  frameTarget: task => {
    const element = tableElement(task.block)
    return element?.getBoundingClientRect ? element : task.block
  },
  point: (task, progress) => {
    const surface = task.frameTarget
    if (task.tableResize && progress < .78) {
      const rect = surface.getBoundingClientRect()
      return { left: rect.right - 2, top: rect.top + Math.min(rect.height * .28, 56) }
    }
    return componentPoint(task.block, progress)
  },
  start: (task, context) => {
    const { animations, resizable } = tableAnimationsFor(task.block, task.duration, task.frameTarget)
    task.tableResize = resizable
    context.track(animations)
  },
})
