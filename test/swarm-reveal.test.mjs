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
