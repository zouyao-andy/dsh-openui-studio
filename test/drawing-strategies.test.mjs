import test from 'node:test'
import assert from 'node:assert/strict'
import { DRAWING_STRATEGIES, strategyFor } from '../src/client/drawing/registry.js'
import { blocksIn } from '../src/client/drawing/dom.js'
import { tableAnimationsFor } from '../src/client/drawing/table.js'
import { chartAnimationsFor } from '../src/client/drawing/chart.js'

function block(className, selectors = [], attributes = []) {
  return {
    className, textContent: '章节标题',
    getBoundingClientRect: () => ({ width: 400, height: 120 }),
    matches: selector => attributes.includes(selector) || selector === `.${className}`,
    querySelector: selector => selectors.some(item => selector.split(', ').includes(item)) ? {} : null,
    querySelectorAll: selector => selectors.some(item => selector.split(', ').includes(item)) ? [{}] : [],
  }
}

test('every drawing type has a complete strategy and one unambiguous match', () => {
  const cases = [
    [block('openui-header'), 'heading', 'structure'],
    [block('openui-foldable-section', ['.openui-foldable-section-trigger-content-text']), 'outline', 'writing'],
    [block('openui-text-content'), 'prose', 'writing'],
    [block('openui-image-text', ['.openui-image-text--horizontal']), 'image', 'components'],
    [block('openui-table', ['table']), 'table', 'components'],
    [block('openui-chart', [], ['[data-openui-chart]']), 'chart', 'components'],
    [block('openui-card', ['.openui-medium-card-block__item']), 'cards', 'components'],
    [block('openui-steps', ['.openui-step-item']), 'steps', 'components'],
    [block('openui-tabs', ['.openui-tabs-trigger']), 'tabs', 'components'],
    [block('openui-list'), 'component', 'components'],
  ]
  assert.equal(DRAWING_STRATEGIES.length, cases.length)
  for (const [element, expectedId, expectedKind] of cases) {
    const { kind, strategy } = strategyFor(element)
    assert.equal(strategy.id, expectedId)
    assert.equal(kind, expectedKind)
    const plan = strategy.plan(element)
    assert.ok(plan.duration > 0 && plan.pace > 0)
    assert.ok(plan.frames.length > 0 && plan.milestones.length > 0)
    assert.equal(typeof strategy.label, 'function')
    assert.equal(typeof strategy.start, 'function')
    assert.equal(typeof strategy.point, 'function')
    assert.equal(typeof strategy.dispose, 'function')
    assert.equal(typeof strategy.frameTarget, 'function')
  }
})

test('tabs keep outline timing and reveal, even when nested with other content', () => {
  const element = block('openui-tabs', ['.openui-tabs-trigger', '.openui-inline-header-heading', 'table'])
  const { strategy } = strategyFor(element)
  assert.equal(strategy.id, 'tabs')
  assert.deepEqual(strategy.plan(element).milestones, [.9])
  assert.equal(strategy.plan(element).duration, 850)
  assert.equal(strategy.plan(element).frames[0].transform, 'translateY(8px)')
  assert.match(strategy.label({ block: element }), /标签页/)
})

test('image and table remain ahead of nested charts and cards', () => {
  assert.equal(strategyFor(block('openui-image-text', ['.openui-image-text--horizontal', 'table'])).strategy.id, 'image')
  assert.equal(strategyFor(block('openui-table', ['table', '[data-openui-chart]'])).strategy.id, 'table')
  assert.equal(strategyFor(block('openui-chart', ['[data-openui-chart]', '.openui-medium-card-block__item'])).strategy.id, 'chart')
})

test('SectionV2 yields its header and paragraphs as separate drawing tasks', () => {
  const header = block('openui-section-v2-header')
  const prose = block('openui-text-content')
  const section = block('openui-section-v2')
  section.children = [{}]
  section.matches = selector => selector === '.openui-section-v2'
  section.querySelector = selector => selector === '.openui-section-v2-header' ? header
    : selector === '.openui-section-v2-content' ? { children: [prose] } : null
  assert.deepEqual(blocksIn({ firstElementChild: { firstElementChild: { firstElementChild: section } } }), [header, prose])
})

test('table and card strategies stagger their own elements', () => {
  for (const [className, selector, expectedTransform] of [
    ['openui-table', '.openui-table-row', undefined],
    ['openui-card', '.openui-medium-card-block__item, .openui-small-card-block__item', 'translateY(12px) scale(.94)'],
  ]) {
    const effects = []
    const items = Array.from({ length: 2 }, () => ({ animate: (frames, options) => {
      effects.push({ frames, options })
      return { cancel() {} }
    } }))
    const element = block(className, className === 'openui-table' ? ['table'] : ['.openui-medium-card-block__item'])
    element.querySelectorAll = query => query === selector ? items : []
    const { strategy } = strategyFor(element)
    const tracked = []
    strategy.start({ block: element, duration: 1200 }, { track: value => tracked.push(...value) })
    assert.equal(tracked.length, 2)
    assert.ok(effects[1].options.delay > effects[0].options.delay)
    assert.equal(effects[0].frames[0].transform, expectedTransform)
  }
})

test('table stages its header and rows while its real columns expand', () => {
  const effects = []
  const animated = () => ({ animate: (frames, options) => {
    effects.push({ frames, options })
    return { cancel() {} }
  } })
  const surface = { clientWidth: 500, scrollWidth: 500 }
  const tableNode = {
    ...animated(), parentElement: surface, style: { width: '100%' },
    getBoundingClientRect: () => ({ left: 80, right: 580, top: 100, bottom: 340, width: 500, height: 240 }),
  }
  const header = animated()
  const rows = [animated(), animated()]
  const element = block('openui-table')
  element.querySelector = selector => selector === 'table' ? tableNode : null
  element.querySelectorAll = selector => selector === '.openui-table-header .openui-table-head' ? [header]
    : selector === '.openui-table-body .openui-table-row' ? rows : []
  const { strategy } = strategyFor(element)
  const task = { block: element, duration: 1200, frameTarget: strategy.frameTarget({ block: element }) }
  const tracked = []
  strategy.start(task, { track: value => tracked.push(...value) })
  assert.equal(task.frameTarget, tableNode)
  assert.equal(task.tableResize, true)
  assert.equal(tracked.length, 4)
  assert.equal(effects[0].frames[0].clipPath, 'inset(0 100% 0 0)')
  assert.ok(effects[2].options.delay > effects[1].options.delay)
  assert.deepEqual(effects[3].frames.map(frame => frame.width), ['430px', '500px'])
  assert.deepEqual(strategy.point(task, .5), { left: 578, top: 156 })
  assert.match(strategy.label(task), /调整.*表格/)

  element.querySelectorAll = selector => selector === '.openui-table-body .openui-table-row' ? Array.from({ length: 20 }, animated) : []
  assert.equal(tableAnimationsFor(element, 1200, tableNode).resizable, false, 'long tables should not reflow during playback')
})

test('chart paints axes before bars and moves the frame with a bounded real resize', () => {
  const effects = []
  const makeNode = (className, rect) => ({
    className,
    getBoundingClientRect: () => rect,
    animate(frames, options) { effects.push({ className, frames, options }); return { cancel() {} } },
  })
  const root = makeNode('openui-bar-chart-container', { left: 80, right: 580, top: 100, bottom: 420, width: 500, height: 320 })
  root.matches = selector => selector === '.openui-bar-chart-container'
  const axis = makeNode('axis', { width: 400, height: 200 })
  const bar = makeNode('openui-bar-chart-bar', { left: 100, top: 220, width: 28, height: 90 })
  root.style = { width: '100%' }
  root.clientWidth = 500
  root.scrollWidth = 500
  root.querySelectorAll = selector => selector === '.openui-bar-chart-bar' ? [bar]
    : selector.startsWith('svg [class*="-grid"]') ? [axis] : []
  const { strategy } = strategyFor(root)
  assert.equal(strategy.id, 'chart')
  const task = { block: root, duration: 1200, frameTarget: strategy.frameTarget({ block: root }) }
  const tracked = []
  strategy.start(task, { finished: () => false, delay() {}, track: value => tracked.push(...Array.isArray(value) ? value : [value]) })
  assert.equal(tracked.length, 3)
  assert.equal(effects[0].className, 'axis')
  assert.equal(effects[1].frames[0].clipPath, 'inset(0 0 100% 0)')
  assert.ok(effects[1].options.delay >= effects[0].options.duration / 2)
  assert.deepEqual(effects[2].frames.map(frame => frame.width), ['440px', '500px'])
  assert.deepEqual(strategy.point(task, .5), { left: 578, top: 412 })
})

test('line and pie marks use distinct geometry reveals', () => {
  const line = block('openui-line-chart-container')
  const lineFrames = []
  line.querySelectorAll = selector => selector === '.openui-line-chart-line, .openui-line-chart-dot' ? [{
    getBoundingClientRect: () => ({ width: 120, height: 70 }),
    getTotalLength: () => 240,
    animate: frames => { lineFrames.push(frames); return { cancel() {} } },
  }] : []
  assert.equal(strategyFor(line).strategy.id, 'chart')
  chartAnimationsFor(line, 1200)
  assert.equal(lineFrames[0][0].strokeDashoffset, '240')
  assert.equal(lineFrames[0][1].strokeDashoffset, '0')

  const pie = block('openui-pie-chart-container')
  const pieFrames = []
  pie.querySelectorAll = selector => selector === 'svg[aria-label="Pie chart"] path[fill]' ? [{
    getAttribute: () => '#1677ff',
    getBoundingClientRect: () => ({ width: 90, height: 90 }),
    animate: frames => { pieFrames.push(frames); return { cancel() {} } },
  }] : []
  assert.equal(strategyFor(pie).strategy.id, 'chart')
  chartAnimationsFor(pie, 1200)
  assert.equal(pieFrames[0][0].transform, 'scale(.82)')
})

test('flat trends and horizontal or negative bars reveal from their correct origin', () => {
  const flat = block('openui-line-chart-container')
  const flatFrames = []
  flat.querySelectorAll = selector => selector === '.openui-line-chart-line, .openui-line-chart-dot' ? [{
    tagName: 'path', getTotalLength: () => 90,
    getBoundingClientRect: () => ({ width: 90, height: 0 }),
    animate: frames => { flatFrames.push(frames); return { cancel() {} } },
  }] : []
  assert.equal(chartAnimationsFor(flat, 800).length, 1)
  assert.equal(flatFrames[0][0].strokeDashoffset, '90')

  for (const [className, markClass, origin] of [
    ['openui-horizontal-bar-chart-container', 'openui-horizontal-bar-chart-bar', 'inset(0 100% 0 0)'],
    ['openui-bar-chart-container', 'openui-bar-chart-bar--negative', 'inset(100% 0 0 0)'],
  ]) {
    const root = block(className)
    let frames
    root.querySelectorAll = selector => selector === `.${markClass.replace('--negative', '')}` ? [{
      className: markClass,
      getBoundingClientRect: () => ({ width: 90, height: 50 }),
      animate: value => { frames = value; return { cancel() {} } },
    }] : []
    assert.equal(strategyFor(root).strategy.id, 'chart')
    assert.equal(chartAnimationsFor(root, 800).length, 1)
    assert.equal(frames[0].clipPath, origin)
  }
})

test('chart waits for late SVG marks and registers them for session cleanup', () => {
  const element = block('openui-chart', [], ['[data-openui-chart]'])
  element.dataset = { openuiChart: 'bar' }
  let mounted = false
  let retry
  let canceled = false
  element.querySelectorAll = selector => mounted && selector === '.openui-bar-chart-bar' ? [{
    getBoundingClientRect: () => ({ width: 40, height: 60 }),
    animate: () => ({ cancel() { canceled = true } }),
  }] : []
  const { strategy } = strategyFor(element)
  const tracked = []
  strategy.start({ block: element, duration: 1200 }, {
    finished: () => false,
    delay: callback => { retry = callback },
    track: value => tracked.push(...value),
  })
  assert.equal(tracked.length, 0)
  assert.equal(typeof retry, 'function')
  mounted = true
  retry()
  assert.equal(tracked.length, 1)
  tracked.forEach(animation => animation.cancel())
  assert.equal(canceled, true)
})
