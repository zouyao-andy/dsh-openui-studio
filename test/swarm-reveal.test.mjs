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

test('completed work keeps the canvas until the tour reaches the answer bottom', () => {
  const previous = globalThis.cancelAnimationFrame
  let scrollTop = 300
  let removed = false
  let exited
  const target = { style: { visibility: 'hidden' } }
  const scroller = { style: { scrollBehavior: 'auto' } }
  const scene = new SwarmRebuild.debug.App(target, { onExit: reason => { exited = reason } })
  const layers = Array.from({ length: 5 }, () => ({ style: {} }))
  scene.visibility = ''
  scene.scrollBehavior = 'smooth'
  scene.env = {
    scroller,
    geom: () => ({ sy: scrollTop, vh: 600 }),
    scrollHeight: () => 2400,
    scrollBy: distance => { scrollTop = Math.min(1800, scrollTop + distance) },
  }
  scene.engine = { started: true, speed: 1, cursors: [], backlog: () => 0 }
  scene.view = {
    render() {},
    ov: layers[0], badges: layers[1], cursorsEl: layers[2], rulers: layers[3], hud: layers[4],
    host: { remove: () => { removed = true } },
  }
  try {
    globalThis.cancelAnimationFrame = () => {}
    scene.onComplete()
    assert.equal(target.style.visibility, 'hidden')
    assert.equal(removed, false)
    assert.ok(layers.every(layer => layer.style.opacity === '0'))
    for (let frame = 0; frame < 600 && scene.remainingScroll() > 2; frame++) scene.tourStep(1 / 60)
    assert.ok(scene.remainingScroll() <= 2)
    assert.ok(scrollTop <= 1800)
    scene.destroy(true)
    assert.equal(target.style.visibility, '')
    assert.equal(scroller.style.scrollBehavior, 'smooth')
    assert.equal(removed, true)
    assert.equal(exited, 'complete')
  } finally {
    globalThis.cancelAnimationFrame = previous
  }
})

test('a tour scroll step moves the viewport only once', () => {
  const previous = { document: globalThis.document, window: globalThis.window, getComputedStyle: globalThis.getComputedStyle }
  const root = { scrollTop: 0 }
  const body = { scrollTop: 0 }
  const scroller = { scrollTop: 0, scrollBy: ({ top }) => { scroller.scrollTop += top } }
  const target = {}
  try {
    globalThis.document = { scrollingElement: root, documentElement: root, body }
    globalThis.getComputedStyle = () => ({ backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'none' })
    globalThis.window = { scrollBy: ({ top }) => { root.scrollTop += top } }
    SwarmRebuild.debug.detectEnv(target, scroller).scrollBy(42)
    assert.equal(scroller.scrollTop, 42)
    SwarmRebuild.debug.detectEnv(target, root).scrollBy(42)
    assert.equal(root.scrollTop, 42)
    assert.equal(body.scrollTop, 0)
  } finally {
    globalThis.document = previous.document
    globalThis.window = previous.window
    globalThis.getComputedStyle = previous.getComputedStyle
  }
})
