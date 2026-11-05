import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, inject } from '../index.js'

test('built Host registers the DSH command and tool without a parser route', () => {
  const commands = []
  const tools = []
  const toolsService = { register: def => { tools.push(def); return () => {} } }
  const ctx = {
    agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    llm: { async *stream() {} },
    tools: toolsService,
    commands: { register: def => commands.push(def) },
    connection: { rpc: { handle: () => () => {} } },
    inject: (_deps, callback) => callback(ctx),
    get: name => name === 'tools' ? toolsService : undefined,
    on() {},
    effect: fn => fn(),
  }
  apply(ctx)
  assert.deepEqual(inject, ['llm', 'agentDefaultModel'])
  assert.deepEqual(commands.map(item => item.name), ['openui'])
  assert.deepEqual(tools.map(item => item.name), ['openui_generate'])
})
