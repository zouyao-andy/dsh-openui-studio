import assert from 'node:assert/strict'
import test from 'node:test'
import { decorateOpenUICommandMenu } from '../src/client/command-menu.js'
import { COMMAND_DESCRIPTION } from '../src/shared/command-copy.js'

const span = textContent => {
  const attrs = new Map()
  return {
    tagName: 'SPAN', textContent,
    hasAttribute: name => attrs.has(name),
    getAttribute: name => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  }
}

test('command menu title and description follow the same locale', () => {
  const name = span('openui')
  const description = span(COMMAND_DESCRIPTION)
  const option = {
    children: [name, description],
    querySelector: () => ({}),
    querySelectorAll: () => [name, description],
  }
  const menu = { querySelectorAll: () => [option] }
  decorateOpenUICommandMenu(menu, () => '交互界面', () => '在当前对话中生成交互图表与可视化回答')
  assert.equal(name.textContent, '交互界面')
  assert.equal(description.textContent, '在当前对话中生成交互图表与可视化回答')
  decorateOpenUICommandMenu(menu, () => 'Interactive view', () => COMMAND_DESCRIPTION)
  assert.equal(name.textContent, 'Interactive view')
  assert.equal(description.textContent, COMMAND_DESCRIPTION)
})
