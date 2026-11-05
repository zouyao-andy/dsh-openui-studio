import { blocksIn } from './drawing/dom.js'
import { strategyFor } from './drawing/registry.js'
import { followBlock, placeCursor, placeFrame, scrollContainer } from './drawing/viewport.js'

export { textPoint } from './drawing/dom.js'
export { chartAnimationsFor } from './drawing/chart.js'
export { imageReflowAnimations } from './drawing/image.js'

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
    kind: task.kind,
    mode: task.mode,
    textLength: Array.from(block.textContent ?? block.innerText ?? '').length,
    top: Math.round(rect.top ?? 0),
    height: Math.round(rect.height ?? 0),
    start: task.start,
    duration: task.duration,
  }
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
    const { kind, strategy } = strategyFor(block)
    const task = { block, index, kind, strategy, mode: strategy.id, start: elapsed, ...strategy.plan(block) }
    elapsed += task.pace
    debug?.write('task-planned', describeBlock(block, index, task))
    return task
  })
  debug?.write('plan-ready', { blockCount: tasks.length, totalDuration: Math.round((tasks.at(-1)?.start ?? 0) + (tasks.at(-1)?.duration ?? 0) + ARRIVAL_MS) })
  const animations = tasks.map(task => {
    const animation = task.block.animate(task.frames, {
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
  const timers = []
  let frameAnimation = null
  let tickFrame = null
  const playbackStart = clock()
  let nextTaskIndex = 0
  let allDoneAt = null
  let finished = false
  const context = {
    track(value) {
      if (Array.isArray(value)) detailAnimations.push(...value)
      else if (value) detailAnimations.push(value)
    },
    delay(callback, ms) { timers.push(window.setTimeout(callback, ms)) },
    finished: () => finished,
  }
  content.dataset.openuiDrawing = 'active'
  const realign = () => {
    for (const [kind, task] of activeTasks) {
      const cursor = cursors.get(kind)
      const progress = Number(cursor?.dataset.progress ?? 0)
      placeCursor(cursor, content, task.block, kind, progress, scroller, task.strategy.point(task, progress))
      if (kind === 'components') placeFrame(frame, content, task.frameTarget, DRAWING_AGENTS[2].color)
    }
  }
  const finish = (reason = 'complete') => {
    if (finished) return
    finished = true
    debug?.write('session-finish', { reason, scrollTop: scroller?.scrollTop ?? null, scrollTarget })
    if (forceDebug) onDebugComplete?.([...debug.events])
    if (tickFrame !== null) window.cancelAnimationFrame(tickFrame)
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
    timers.forEach(timer => window.clearTimeout(timer))
    tasks.forEach(task => task.strategy.dispose(task))
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
  const activateTask = (task, now) => {
    task.activatedAt = now
    animations[task.index].play()
    const agent = DRAWING_AGENTS.find(item => item.id === task.kind)
    const cursor = cursors.get(task.kind)
    task.frameTarget = task.strategy.frameTarget(task)
    activeTasks.set(task.kind, task)
    if (cursor) {
      cursor.dataset.task = String(task.index)
      cursor.dataset.mode = 'pointing'
      cursor.dataset.progress = '0'
      cursor.querySelector('.openui-drawing-cursor__activity').textContent = task.strategy.label(task)
      placeCursor(cursor, content, task.block, task.kind, 0, scroller, task.strategy.point(task, 0))
      cursor.classList.add('openui-drawing-cursor--active')
    }
    if (task.kind === 'components' && frame) {
      frameAnimation?.cancel()
      frame.dataset.task = String(task.index)
      placeFrame(frame, content, task.frameTarget, agent.color)
      frame.classList.add('openui-drawing-frame--active')
      frameAnimation = frame.animate([
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0 0 0)' },
      ], { duration: 820, fill: 'forwards', easing: 'cubic-bezier(.22, 1, .36, 1)' })
    }
    task.strategy.start(task, context)
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
    const point = task.strategy.point(task, progress)
    if ((task.tableResize || task.chartResize) && frame?.dataset.task === String(task.index)) {
      placeFrame(frame, content, task.frameTarget, DRAWING_AGENTS[2].color)
    }
    if (cursor?.dataset.task === String(task.index)) {
      cursor.dataset.mode = task.typing ? 'typing' : task.kind === 'components' ? 'dragging' : 'pointing'
      cursor.dataset.progress = String(progress)
      placeCursor(cursor, content, task.block, task.kind, progress, scroller, point)
    }
    for (const milestone of task.milestones) {
      if (progress < milestone || task.scrollMilestones?.has(milestone)) continue
      task.scrollMilestones ??= new Set()
      task.scrollMilestones.add(milestone)
      debug?.write('scroll-milestone', { index: task.index, mode: task.mode, milestone, scrollTop: scroller?.scrollTop ?? null })
      followBlock(scroller, task.block, requestScroll, milestone, task.typing ? point : null)
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
    task.strategy.dispose(task)
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
