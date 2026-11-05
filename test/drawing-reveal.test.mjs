import test from 'node:test'
import assert from 'node:assert/strict'
import { DRAWING_AGENTS, chartAnimationsFor, imageReflowAnimations, playDrawingReveal, textPoint } from '../src/client/drawing-reveal.js'

test('replay draws every block with three agents and follows the document', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element, getComputedStyle: globalThis.getComputedStyle, document: globalThis.document }
  const timers = new Map()
  const frames = new Map()
  const listeners = new Map()
  const animations = []
  let debugEvents
  let nextTimer = 0
  let fakeNow = 0
  let scrolledToStart = 0
  class FakeElement {
    animate(frames, options) {
      const animation = {
        frames, options, currentTime: 0, playState: 'running', canceled: false,
        pause() { this.playState = 'paused' },
        play() { this.playState = 'running' },
        cancel() { this.canceled = true },
      }
      animations.push(animation)
      return animation
    }
  }
  const rect = (top, height) => ({ left: 80, right: 380, top: top - scroller.scrollTop, bottom: top - scroller.scrollTop + height, width: 300, height })
  const blocks = [
    { className: 'openui-header', innerText: '宋代印刷：知识传播', getBoundingClientRect: () => rect(100, 60), animate: FakeElement.prototype.animate },
    { className: 'openui-text-content', innerText: '书籍供给增加', getBoundingClientRect: () => rect(200, 70), animate: FakeElement.prototype.animate },
    { className: 'openui-scrollable-table-wrapper', innerText: '阶段\n变化', getBoundingClientRect: () => rect(1000, 80), animate: FakeElement.prototype.animate },
  ]
  const tableRows = Array.from({ length: 2 }, () => ({ animate: FakeElement.prototype.animate }))
  blocks[2].querySelector = selector => selector === 'table' ? {} : null
  blocks[2].querySelectorAll = selector => selector === '.openui-table-row' ? tableRows : []
  blocks[1].previousElementSibling = blocks[0]
  blocks[2].previousElementSibling = blocks[1]
  const native = { firstElementChild: { firstElementChild: { firstElementChild: { children: blocks } } } }
  const classList = () => {
    const values = new Set()
    return { values, add: name => values.add(name), remove: name => values.delete(name) }
  }
  const cursors = new Map(DRAWING_AGENTS.map(agent => {
    const activity = { textContent: '' }
    return [agent.id, { dataset: {}, style: { setProperty() {} }, classList: classList(), activity, querySelector: () => activity }]
  }))
  const frame = {
    dataset: {}, classList: classList(), animate: FakeElement.prototype.animate,
    style: { setProperty() {} },
  }
  const scroller = {
    kind: 'scroller', scrollHeight: 2000, clientHeight: 700, scrollTop: 0, parentElement: null,
    getBoundingClientRect: () => ({ left: 0, right: 900, top: 0, bottom: 700, height: 700 }),
  }
  const section = { kind: 'section', parentElement: scroller, scrollHeight: 1000, clientHeight: 1000, scrollIntoView: () => { scrolledToStart++ } }
  const content = {
    dataset: {}, parentElement: section,
    querySelector: selector => selector === '.openui-native' ? native : selector === '.openui-drawing-frame' ? frame : cursors.get(selector.match(/data-openui-agent="([^"]+)"/)?.[1]),
    getBoundingClientRect: () => ({ left: 60, top: 80 }),
  }
  const advanceTo = time => {
    while (fakeNow < time) {
      fakeNow = Math.min(time, fakeNow + 32)
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach(callback => callback(fakeNow))
    }
  }
  try {
    globalThis.Element = FakeElement
    globalThis.getComputedStyle = element => ({ overflowY: element.kind === 'scroller' ? 'auto' : 'visible' })
    globalThis.document = { hidden: false, hasFocus: () => true, addEventListener() {}, removeEventListener() {} }
    globalThis.window = {
      innerWidth: 900,
      performance: { now: () => fakeNow },
      matchMedia: () => ({ matches: false }),
      setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id },
      clearTimeout: id => timers.delete(id),
      requestAnimationFrame: callback => { const id = ++nextTimer; frames.set(id, callback); return id },
      cancelAnimationFrame: id => frames.delete(id),
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name),
    }
    const cleanup = playDrawingReveal(content, { fromStart: true, debug: true, onDebugComplete: events => { debugEvents = events } })
    assert.equal(scrolledToStart, 0)
    assert.equal(scroller.scrollTop, 0, 'starting playback must not jump the document')
    assert.equal(animations.length, 3)
    assert.ok(animations.every(animation => animation.playState === 'paused'))
    assert.equal(animations[0].frames[0].filter, undefined)
    assert.equal(animations[1].frames[0].opacity, 0)
    assert.equal(animations[1].frames[0].clipPath, 'inset(0 0 100% 0)')
    assert.equal(content.dataset.openuiDrawing, 'active')
    advanceTo(1600)
    assert.equal(animations[1].playState, 'running')
    assert.equal(cursors.get('structure').activity.textContent, '正在整理「宋代印刷」章节')
    assert.equal(cursors.get('writing').activity.textContent, '正在撰写「宋代印刷」内容')
    assert.equal(animations[2].playState, 'paused', 'offscreen table must not draw early')
    assert.ok(scroller.scrollTop > 0 && scroller.scrollTop < 700, 'the reading area should advance gradually')
    advanceTo(2600)
    assert.equal(animations[2].playState, 'running', 'table should draw once it enters the viewport')
    const rowAnimations = animations.filter(animation => animation.frames?.[0]?.clipPath === 'inset(0 100% 0 0)' && animation.options.delay >= 210)
    assert.equal(rowAnimations.length, 2)
    assert.ok(rowAnimations[1].options.delay > rowAnimations[0].options.delay, 'table rows should enter in order')
    assert.equal(cursors.get('components').activity.textContent, '正在调整「宋代印刷」表格')
    assert.equal(cursors.get('writing').dataset.flagSide, 'right')
    assert.ok(Number(cursors.get('components').style.transform.match(/translate3d\(([-\d.]+)px/u)[1]) > 20)
    assert.ok(debugEvents === undefined, 'playback should still be active before user intervention')
    listeners.get('resize')()
    assert.equal(content.dataset.openuiDrawing, 'active')
    assert.ok(scroller.scrollTop > 0, 'the offscreen table should move the reading area as it is revealed')
    listeners.get('wheel')()
    assert.equal(animations.every(animation => animation.canceled), true)
    assert.equal(timers.size, 0)
    assert.equal(frames.size, 0)
    assert.equal(content.dataset.openuiDrawing, undefined)
    assert.ok(debugEvents.some(entry => entry.event === 'task-planned' && entry.index === 2))
    assert.ok(debugEvents.some(entry => entry.event === 'task-start' && entry.index === 2))
    assert.ok(debugEvents.some(entry => entry.event === 'session-finish' && entry.reason === 'wheel'))
    assert.equal(DRAWING_AGENTS.some(agent => cursors.get(agent.id).classList.values.has('openui-drawing-cursor--active')), false)
    cleanup()
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
    globalThis.getComputedStyle = previous.getComputedStyle
    globalThis.document = previous.document
  }
})

test('long prose reveals as one readable block with gradual milestone scrolling', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element, getComputedStyle: globalThis.getComputedStyle, document: globalThis.document }
  const frames = new Map()
  const animations = []
  let nextFrame = 0
  let fakeNow = 0
  const block = {
    className: 'openui-text-content', textContent: '一'.repeat(800),
    children: [],
    getBoundingClientRect: () => ({ left: 80, top: 1000 - scroller.scrollTop, bottom: 2800 - scroller.scrollTop, width: 500, height: 1800 }),
    animate: (keyframes, options) => {
      const animation = { currentTime: 0, keyframes, options, playState: 'running', pause() { this.playState = 'paused' }, play() { this.playState = 'running' }, cancel() {} }
      animations.push(animation)
      return animation
    },
    querySelectorAll: () => [],
  }
  const scroller = { scrollHeight: 4000, clientHeight: 700, scrollTop: 0, getBoundingClientRect: () => ({ left: 0, right: 900, top: 0, height: 700 }) }
  const native = { firstElementChild: { firstElementChild: { firstElementChild: block } } }
  const content = {
    dataset: {}, parentElement: { parentElement: scroller }, getBoundingClientRect: () => ({ left: 60, top: 80 }),
    querySelector: selector => selector === '.openui-native' ? native : null,
  }
  try {
    globalThis.Element = class { animate() {} }
    globalThis.getComputedStyle = element => ({ overflowY: element === scroller ? 'auto' : 'visible' })
    globalThis.document = { hidden: false, hasFocus: () => true, addEventListener() {}, removeEventListener() {} }
    globalThis.window = {
      innerWidth: 900, matchMedia: () => ({ matches: false }),
      performance: { now: () => fakeNow },
      requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id }, cancelAnimationFrame: id => frames.delete(id),
      setTimeout: () => 0, clearTimeout() {}, addEventListener() {}, removeEventListener() {},
    }
    const stop = playDrawingReveal(content)
    assert.equal(animations[0].keyframes[0].filter, undefined)
    assert.equal(scroller.scrollTop, 0)
    assert.equal(frames.size, 1)
    assert.equal(animations[0].playState, 'paused')
    stop()
    assert.equal(playDrawingReveal(content, { followScroll: false }), undefined)
    assert.equal(animations.length, 1, 'an offscreen block remains readable when followScroll is disabled')
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
    globalThis.getComputedStyle = previous.getComputedStyle
    globalThis.document = previous.document
  }
})

test('SectionV2 paragraphs wait for the viewport and reveal separately', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element, getComputedStyle: globalThis.getComputedStyle, document: globalThis.document }
  const frames = new Map()
  const animations = []
  let now = 0
  let nextFrame = 0
  const scroller = {
    scrollTop: 0, scrollHeight: 2200, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, right: 900, top: 0, bottom: 600, height: 600 }),
  }
  const makeBlock = (className, textContent, top, height) => ({
    className, textContent, children: [],
    getBoundingClientRect: () => ({ left: 80, right: 580, top: top - scroller.scrollTop, bottom: top + height - scroller.scrollTop, width: 500, height }),
    animate(keyframes, options) {
      const animation = { keyframes, options, playState: 'running', currentTime: 0, pause() { this.playState = 'paused' }, play() { this.playState = 'running' }, cancel() {} }
      animations.push(animation)
      return animation
    },
  })
  const header = makeBlock('openui-section-v2-header', '① 原罪', 250, 50)
  const first = makeBlock('', '美元债务的本币重估。'.repeat(12), 820, 110)
  const second = makeBlock('', '短期外债需要不断展期。'.repeat(12), 960, 110)
  const sectionContent = { children: [first, second] }
  const section = makeBlock('openui-section-v2', '完整章节', 250, 820)
  section.children = [{}]
  section.matches = selector => selector === '.openui-section-v2'
  section.querySelector = selector => selector === '.openui-section-v2-header' ? header : selector === '.openui-section-v2-content' ? sectionContent : null
  const content = {
    dataset: {}, parentElement: scroller,
    querySelector: selector => selector === '.openui-native'
      ? { firstElementChild: { firstElementChild: { firstElementChild: section } } }
      : null,
    getBoundingClientRect: () => ({ left: 60, top: 80 }),
  }
  const advanceTo = target => {
    while (now < target) {
      now = Math.min(target, now + 32)
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach(callback => callback(now))
    }
  }
  try {
    globalThis.Element = class { animate() {} }
    globalThis.getComputedStyle = element => ({ overflowY: element === scroller ? 'auto' : 'visible' })
    globalThis.document = { hidden: false, hasFocus: () => true, addEventListener() {}, removeEventListener() {} }
    globalThis.window = {
      innerWidth: 900, performance: { now: () => now }, matchMedia: () => ({ matches: false }),
      requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id },
      cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 0, clearTimeout() {},
      addEventListener() {}, removeEventListener() {},
    }
    const stop = playDrawingReveal(content)
    assert.equal(animations.length, 3, 'the section heading and paragraphs should be separate tasks')
    assert.equal(animations[1].keyframes[0].clipPath, 'inset(0 0 100% 0)')
    assert.equal(animations[2].keyframes[0].clipPath, 'inset(0 0 100% 0)')
    advanceTo(900)
    assert.equal(animations[1].playState, 'paused', 'offscreen prose should stay hidden')
    advanceTo(3100)
    assert.equal(animations[1].playState, 'running')
    assert.equal(animations[2].playState, 'running')
    assert.ok(scroller.scrollTop > 300)
    stop()
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
    globalThis.getComputedStyle = previous.getComputedStyle
    globalThis.document = previous.document
  }
})

test('text cursor clamps a just-started negative progress to a valid DOM range', () => {
  const node = { textContent: '正文', parentElement: {} }
  let start = -1
  const doc = {
    defaultView: { NodeFilter: { SHOW_TEXT: 4 } },
    createTreeWalker: () => { let read = false; return { nextNode: () => read ? null : (read = true, node) } },
    createRange: () => ({
      setStart: (_node, offset) => { start = offset; if (offset < 0 || offset >= node.textContent.length) throw new RangeError('invalid text offset') },
      setEnd() {},
      getBoundingClientRect: () => ({ left: 10, right: 20, top: 30, height: 20 }),
    }),
  }
  assert.deepEqual(textPoint({ ownerDocument: doc }, -.01), { left: 20, top: 30 })
  assert.equal(start, 0)
})

test('a visible final block starts even when the scroll container is already at its end', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element, getComputedStyle: globalThis.getComputedStyle, document: globalThis.document }
  const frames = new Map()
  let now = 0
  let nextFrame = 0
  let started = false
  const scroller = { scrollTop: 100, scrollHeight: 700, clientHeight: 600, getBoundingClientRect: () => ({ top: 0, bottom: 600, height: 600 }) }
  const block = {
    className: 'openui-text-content', textContent: '最后一段', children: [],
    getBoundingClientRect: () => ({ left: 20, top: 540, bottom: 590, width: 400, height: 50 }),
    animate: () => ({ pause() {}, set currentTime(_) {}, play() { started = true }, cancel() {} }),
  }
  const content = {
    dataset: {}, parentElement: scroller,
    querySelector: selector => selector === '.openui-native' ? { firstElementChild: { firstElementChild: { firstElementChild: block } } } : null,
  }
  try {
    globalThis.Element = class { animate() {} }
    globalThis.getComputedStyle = element => ({ overflowY: element === scroller ? 'auto' : 'visible' })
    globalThis.document = { hidden: false, hasFocus: () => true, addEventListener() {}, removeEventListener() {} }
    globalThis.window = {
      innerWidth: 900, performance: { now: () => now }, matchMedia: () => ({ matches: false }),
      requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id },
      cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 0, clearTimeout() {},
      addEventListener() {}, removeEventListener() {},
    }
    const stop = playDrawingReveal(content)
    now = 224
    const pending = [...frames.values()]
    frames.clear()
    pending.forEach(callback => callback(now))
    assert.equal(started, true)
    stop()
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
    globalThis.getComputedStyle = previous.getComputedStyle
    globalThis.document = previous.document
  }
})

test('reduced motion skips document playback', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element }
  try {
    globalThis.Element = class { animate() {} }
    globalThis.window = { matchMedia: () => ({ matches: true }) }
    assert.equal(playDrawingReveal({}), undefined)
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
  }
})

test('a new answer stays readable when DSH is in the background', () => {
  const previous = { window: globalThis.window, Element: globalThis.Element, document: globalThis.document }
  try {
    globalThis.Element = class { animate() {} }
    globalThis.window = { matchMedia: () => ({ matches: false }) }
    globalThis.document = { hidden: false, hasFocus: () => false }
    assert.equal(playDrawingReveal({}, { requireFocus: true }), undefined)
  } finally {
    globalThis.window = previous.window
    globalThis.Element = previous.Element
    globalThis.document = previous.document
  }
})

test('top-level charts animate their real SVG shapes after mounting', () => {
  const effects = []
  const shapes = ['rect', 'path'].map(tagName => ({
    tagName,
    getBoundingClientRect: () => ({ width: 120, height: 80 }),
    animate(frames, options) { effects.push({ frames, options }); return { cancel() {} } },
  }))
  const chart = {
    matches: selector => selector === '[data-openui-chart]',
    dataset: { openuiChart: 'area' },
    querySelectorAll: selector => selector === '.openui-area-chart-area-path, .openui-area-chart-area-line' ? shapes : [],
  }
  assert.equal(chartAnimationsFor(chart, 1200).length, 2)
  assert.equal(effects[0].frames[0].clipPath, 'inset(0 100% 0 0)')
  assert.ok(effects[1].options.delay > effects[0].options.delay)
})

test('ImageText and ImageTextLarge resize their layout image containers', () => {
  let imageFrames
  let bannerFrames
  const image = {
    getBoundingClientRect: () => ({ width: 128, height: 128 }),
    animate(frames) { imageFrames = frames; return { cancel() {} } },
  }
  const banner = {
    getBoundingClientRect: () => ({ height: 180 }),
    animate(frames) { bannerFrames = frames; return { cancel() {} } },
  }
  const block = {
    matches: () => false,
    querySelectorAll: selector => selector === '.openui-image-text--horizontal'
      ? [{ querySelector: () => image }]
      : selector === '.openui-image-text-large__image-wrap' ? [banner] : [],
  }
  assert.equal(imageReflowAnimations(block, 1200).length, 2)
  assert.deepEqual(imageFrames.map(frame => frame.width), ['74px', '128px'])
  assert.deepEqual(bannerFrames.map(frame => frame.maxHeight), ['99px', '180px'])
})
