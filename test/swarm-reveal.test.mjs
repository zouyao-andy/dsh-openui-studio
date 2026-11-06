import assert from 'node:assert/strict'
import test from 'node:test'
import { playSwarmReveal } from '../src/client/swarm-reveal.js'
import { SwarmRebuild } from '../src/client/vendor/swarm-rebuild.js'

test('the OpenUI answer starts a scoped Swarm scene and restores its state on exit', () => {
  const previous = { window: globalThis.window, document: globalThis.document, getComputedStyle: globalThis.getComputedStyle }
  const originalStart = SwarmRebuild.start
  const scroller = { scrollHeight: 1000, clientHeight: 500, parentElement: null }
  const target = {}
  const content = {
    isConnected: true,
    parentElement: scroller,
    dataset: {},
    querySelector: selector => selector === '.openui-native' ? target : null,
  }
  let call
  let stopped = false
  let report
  try {
    globalThis.window = { matchMedia: () => ({ matches: false }) }
    globalThis.document = { hidden: false, hasFocus: () => true, scrollingElement: {} }
    globalThis.getComputedStyle = () => ({ overflowY: 'auto' })
    SwarmRebuild.start = (element, options) => {
      call = { element, options }
      return () => { stopped = true }
    }
    const cleanup = playSwarmReveal(content, { debug: true, onDebugComplete: events => { report = events } })
    assert.equal(call.element, target)
    assert.equal(call.options.scroller, scroller)
    assert.equal(call.options.labels.touring, 'Touring')
    assert.equal(content.dataset.openuiDrawing, 'active')
    call.options.onComplete({ items: 12, tasks: 14, workers: 8 })
    call.options.onExit('complete')
    assert.equal(content.dataset.openuiDrawing, undefined)
    assert.equal(report.find(event => event.event === 'scene-complete').tasks, 14)
    assert.equal(report.at(-1).reason, 'complete')
    cleanup()
    assert.equal(stopped, true)
  } finally {
    SwarmRebuild.start = originalStart
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.getComputedStyle = previous.getComputedStyle
  }
})

test('reduced motion and disabled tour leave the answer visible without starting Swarm', () => {
  const previous = { window: globalThis.window, document: globalThis.document }
  const originalStart = SwarmRebuild.start
  const content = { isConnected: true, dataset: {}, querySelector: () => ({}) }
  const reports = []
  try {
    SwarmRebuild.start = () => { throw new Error('Swarm should not start') }
    globalThis.document = { hidden: false, hasFocus: () => true }
    globalThis.window = { matchMedia: () => ({ matches: true }) }
    playSwarmReveal(content, { debug: true, onDebugComplete: events => reports.push(events) })
    assert.equal(reports[0][0].reason, 'reduced-motion')
    globalThis.window.matchMedia = () => ({ matches: false })
    playSwarmReveal(content, { followScroll: false, debug: true, onDebugComplete: events => reports.push(events) })
    assert.equal(reports[1][0].reason, 'follow-scroll-disabled')
    assert.equal(content.dataset.openuiDrawing, undefined)
  } finally {
    SwarmRebuild.start = originalStart
    globalThis.window = previous.window
    globalThis.document = previous.document
  }
})

test('the scene starts with readable content instead of a cursor-only prelude', () => {
  const view = { vp: { ox: 0, oy: 0, sx: 0, sy: 0, vw: 800, vh: 600 } }
  const engine = new SwarmRebuild.debug.Engine(view)
  const heading = { kind: 'text', total: 18, shown: 0, vis: false, done: false, scale: .5, v: 0 }
  const headingTask = { layer: 'world', y: 40, deps: [], state: 'wait', spec: { type: 'text', it: heading } }
  const body = { kind: 'text', total: 500, shown: 0, vis: false, v: 0 }
  const bodyTask = { layer: 'world', y: 120, deps: [], state: 'wait', spec: { type: 'text', it: body } }
  engine.setModel({ items: [heading, body], tasks: [headingTask, bodyTask], groups: [], guides: [] })
  engine.seedFirstContent()
  assert.equal(headingTask.state, 'done')
  assert.equal(heading.shown, heading.total)
  assert.equal(heading.vis, true)
  assert.equal(heading.scale, 1)
  assert.equal(bodyTask.state, 'wait')
  assert.equal(body.vis, false)
  assert.equal(engine.doneCount, 1)
  assert.equal(engine.waitCount, 1)
})

test('completion fires on the final task without an ending cursor sequence', () => {
  const view = { vp: { ox: 0, oy: 0, sx: 0, sy: 0, vw: 800, vh: 600 } }
  const engine = new SwarmRebuild.debug.Engine(view)
  const heading = { kind: 'text', total: 12, shown: 0, vis: false, scale: 1, v: 0 }
  const task = { layer: 'world', y: 40, deps: [], state: 'wait', spec: { type: 'text', it: heading } }
  engine.setModel({ items: [heading], tasks: [task], groups: [], guides: [] })
  let completed = 0
  engine.onComplete = () => completed++
  engine.start()
  engine.seedFirstContent()
  engine.step(1 / 60)
  assert.equal(completed, 1)
  assert.equal(engine.completed, true)
  engine.step(1 / 60)
  assert.equal(completed, 1)
})

test('completed scenes hand off briefly while interrupted scenes exit at once', () => {
  const previous = { window: globalThis.window, setTimeout: globalThis.setTimeout, cancelAnimationFrame: globalThis.cancelAnimationFrame }
  const writes = new Map()
  let removeHost
  let exits = []
  const host = {
    style: { setProperty: (name, value) => writes.set(name, value) },
    getBoundingClientRect: () => ({}),
    remove: () => { removeHost = true },
  }
  const create = () => {
    const target = { style: { visibility: 'hidden' } }
    const scroller = { style: { scrollBehavior: 'auto' } }
    const scene = new SwarmRebuild.debug.App(target, { onExit: reason => exits.push(reason) })
    scene.visibility = ''
    scene.scrollBehavior = 'smooth'
    scene.env = { scroller }
    scene.view = { host }
    return { scene, target, scroller }
  }
  let timer
  try {
    globalThis.window = { matchMedia: () => ({ matches: false }) }
    globalThis.cancelAnimationFrame = () => {}
    globalThis.setTimeout = (callback, delay) => { timer = { callback, delay }; return 1 }
    const completed = create()
    completed.scene.destroy(true)
    assert.equal(completed.target.style.visibility, '')
    assert.equal(completed.scroller.style.scrollBehavior, 'smooth')
    assert.equal(writes.get('pointer-events'), 'none')
    assert.match(writes.get('transition'), /opacity 180ms linear/)
    assert.equal(removeHost, undefined)
    assert.equal(timer.delay, 210)
    assert.deepEqual(exits, ['complete'])
    timer.callback()
    assert.equal(removeHost, true)

    removeHost = false
    const interrupted = create()
    interrupted.scene.destroy(false)
    assert.equal(removeHost, true)
    assert.deepEqual(exits, ['complete', 'interrupted'])
  } finally {
    globalThis.window = previous.window
    globalThis.setTimeout = previous.setTimeout
    globalThis.cancelAnimationFrame = previous.cancelAnimationFrame
  }
})
