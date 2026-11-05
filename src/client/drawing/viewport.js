export function scrollContainer(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) return parent
  }
  return null
}

export function followBlock(scroller, block, requestScroll, progress, point) {
  if (!scroller) return
  const viewport = scroller.getBoundingClientRect()
  const rect = block.getBoundingClientRect()
  const height = viewport.height || scroller.clientHeight
  const writingTop = point?.top ?? rect.top + rect.height * progress
  const distance = writingTop - (viewport.top + height * .64)
  if (distance > 8) requestScroll(scroller.scrollTop + distance)
}

export function placeCursor(cursor, content, block, kind, progress, scroller, writingPoint) {
  if (!cursor) return
  const origin = content.getBoundingClientRect()
  const point = writingPoint
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

export function placeFrame(frame, content, block, color) {
  if (!frame) return
  const origin = content.getBoundingClientRect()
  const rect = block.getBoundingClientRect()
  frame.style.transform = `translate3d(${rect.left - origin.left}px, ${rect.top - origin.top}px, 0)`
  frame.style.width = `${rect.width}px`
  frame.style.height = `${rect.height}px`
  frame.style.setProperty('--openui-drawing-color', color)
}
