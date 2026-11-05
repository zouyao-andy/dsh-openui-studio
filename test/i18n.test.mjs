import assert from 'node:assert/strict'
import test from 'node:test'
import { bindLocale, en, translate, zh } from '../src/client/i18n.js'
import { activity } from '../src/client/drawing/strategy.js'

test('drawing labels and controls use the active DSH locale', () => {
  const block = { className: 'openui-header', innerText: '执行流程', previousElementSibling: null }
  const unbind = bindLocale({ bind: () => key => zh[key] })
  try {
    assert.equal(activity(block, 'activity.heading'), '正在整理「执行流程」章节')
    assert.equal(translate('toolbar.replay'), '重播构建动画')
    assert.equal(translate('agent.writing'), '内容')
  } finally {
    unbind()
  }
  assert.equal(activity(block, 'activity.heading'), 'Organizing section "执行流程"')
  for (const key of Object.keys(en)) assert.equal(typeof zh[key], 'string', `${key} needs a Chinese translation`)
})

test('the active DSH language wins over a stale bound translator', () => {
  let active = 'zh-CN'
  const unbind = bindLocale({ getLocale: () => ({ active }), bind: () => () => en['command.name'] })
  try {
    assert.equal(translate('command.name'), '交互界面')
    assert.equal(translate('command.description'), '在当前对话中生成交互图表与可视化回答')
    active = 'en-US'
    assert.equal(translate('command.name'), 'Interactive view')
  } finally {
    unbind()
  }
})
