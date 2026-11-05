import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, inject } from '../src/host/index.js'
import { SYSTEM_PROMPT, LIBRARY_SCHEMA } from '../src/generated/library.js'

const valid = 'root = Card([t])\nt = TextContent("hi")'

function harness({ chunksByCall, selection = { provider: 'test-provider', model: 'test-model' }, config = {} } = {}) {
  const tools = []
  const commands = []
  const events = new Map()
  const calls = []
  const routes = []
  const toolsService = { register: def => { tools.push(def); return () => {} } }
  const ctx = {
    agentDefaultModel: { currentSelection: () => selection },
    llm: { async *stream(options) {
      calls.push(options)
      yield* chunksByCall?.[calls.length - 1] ?? [
        { type: 'text-delta', text: valid },
        { type: 'finish', reason: { kind: 'stop' } },
      ]
    } },
    get: name => name === 'tools' ? toolsService : undefined,
    tools: toolsService,
    commands: { register: def => { commands.push(def); return () => {} } },
    connection: { rpc: { handle: (channel, handler) => { routes.push({ channel, handler }); return () => {} } } },
    inject: (_deps, callback) => callback(ctx),
    on: (name, handler) => events.set(name, handler),
    effect: fn => { const dispose = fn(); return () => dispose?.() },
  }
  apply(ctx, config)
  return { tools, commands, events, calls, routes }
}

async function activate(harness, agent = { steer() {} }) {
  const messages = []
  agent.steer = message => messages.push(message)
  const decision = harness.commands[0].handler({ agent, rawInput: 'show a chart' })
  assert.equal(decision.kind, 'success')
  await harness.events.get('agent/pre-step')({ agent, turn: 1 }, async () => ({ kind: 'enter', messages }))
  return agent
}

test('uses the official OpenUI chat schema and a read-only render config route', () => {
  assert.deepEqual(inject, ['llm', 'agentDefaultModel'])
  assert.ok(Object.keys(LIBRARY_SCHEMA.$defs).length >= 50)
  assert.match(SYSTEM_PROMPT, /Every response is a single Card/)
  assert.doesNotMatch(SYSTEM_PROMPT, /source-linked text selection|persistent highlighting/)
  const h = harness()
  assert.equal(h.commands.length, 1)
  assert.equal(h.commands[0].name, 'openui')
  assert.deepEqual(h.commands[0].input, { hint: '<question>', attachments: true })
  assert.deepEqual(h.tools.map(tool => tool.name), ['openui_generate'])
  assert.deepEqual(h.routes.map(route => route.channel), ['/openui-studio-render'])
})

test('registers the tool when the tools service activates after the plugin', () => {
  const pending = []
  const registered = []
  const ctx = {
    agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    llm: { async *stream() {} },
    commands: { register() {} },
    connection: { rpc: { handle() { return () => {} } } },
    inject: (deps, callback) => {
      if (deps[0] === 'tools') pending.push(callback)
      else callback(ctx)
    },
    on() {},
  }
  apply(ctx)
  assert.equal(registered.length, 0)
  assert.equal(pending.length, 1)
  pending[0]({
    tools: { register: definition => { registered.push(definition); return () => {} } },
    effect: fn => fn(),
  })
  assert.deepEqual(registered.map(tool => tool.name), ['openui_generate'])
})

test('render config route only serves the fixed local configuration to the owner', async () => {
  const h = harness()
  const route = h.routes[0].handler
  const owner = { principal: { kind: 'owner' } }
  const response = await route('config', {}, undefined, owner)
  assert.equal(response.ok, true)
  assert.match(response.value.config.css, /\.openui-native/)
  assert.match(response.value.path, /render\.js$/)
  assert.equal((await route('config', {}, undefined, { principal: { kind: 'api' } })).ok, false)
  assert.equal((await route('other', {}, undefined, owner)).ok, false)
})

test('only an accepted /openui turn may call the tool', async () => {
  const h = harness()
  const agent = { steer() {} }
  const exec = { agent, signal: new AbortController().signal }
  await assert.rejects(h.tools[0].execute({ question: 'q' }, exec), /Use \/openui/)
  await activate(h, agent)
  assert.equal(await h.tools[0].execute({ question: 'show a chart' }, exec), valid)
  assert.equal(h.tools[0].output.render({}, valid)[0].text, valid)
  h.events.get('agent/turn-stopping')({ agent, turn: 1 })
  await assert.rejects(h.tools[0].execute({ question: 'q' }, exec), /Use \/openui/)
})

test('uses the selected DSH model and strips a Markdown fence', async () => {
  const h = harness({ chunksByCall: [[
    { type: 'text-delta', text: '```openui\n' + valid + '\n```' },
    { type: 'finish', reason: { kind: 'stop' } },
  ]] })
  const agent = await activate(h)
  assert.equal(await h.tools[0].execute({ question: 'show revenue' }, { agent }), valid)
  assert.equal(h.calls[0].provider, 'test-provider')
  assert.equal(h.calls[0].model, 'test-model')
  assert.equal(h.calls[0].system, SYSTEM_PROMPT)
  assert.deepEqual(h.calls[0].messages, [{ role: 'user', content: [{ type: 'text', text: 'show revenue' }] }])
})

test('invalid OpenUI is repaired once before saving', async () => {
  const h = harness({ chunksByCall: [
    [{ type: 'text-delta', text: 'root = Card([a])\na = Nope("x")' }, { type: 'finish', reason: { kind: 'stop' } }],
    [{ type: 'text-delta', text: valid }, { type: 'finish', reason: { kind: 'stop' } }],
  ] })
  const agent = await activate(h)
  assert.equal(await h.tools[0].execute({ question: 'q' }, { agent }), valid)
  assert.equal(h.calls.length, 2)
  assert.equal(h.calls[1].temperature, 0)
})

test('unrepairable or failed generation cannot become a saved UI', async () => {
  const invalid = { type: 'text-delta', text: 'root = Stack([a])\na = Text("x")' }
  const h = harness({ chunksByCall: [
    [invalid, { type: 'finish', reason: { kind: 'stop' } }],
    [invalid, { type: 'finish', reason: { kind: 'stop' } }],
  ] })
  const agent = await activate(h)
  await assert.rejects(h.tools[0].execute({ question: 'q' }, { agent }), /could not be repaired/)
  assert.equal(h.calls.length, 2)

  const failed = harness({ chunksByCall: [[{ type: 'finish', reason: { kind: 'error', failure: { message: 'rate limited', code: 'RATE_LIMIT' } } }]] })
  const failedAgent = await activate(failed)
  await assert.rejects(failed.tools[0].execute({ question: 'q' }, { agent: failedAgent }), /rate limited/)
})

test('rejects empty and oversized questions', async () => {
  const h = harness({ config: { maxQuestionChars: 201 } })
  const agent = await activate(h)
  await assert.rejects(h.tools[0].execute({ question: ' ' }, { agent }), /Ask a question/)
  await assert.rejects(h.tools[0].execute({ question: 'x'.repeat(202) }, { agent }), /too long/)
  assert.equal(h.calls.length, 0)
})
