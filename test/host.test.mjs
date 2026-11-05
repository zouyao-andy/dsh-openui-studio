import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, inject } from '../src/host/index.js'
import { SYSTEM_PROMPT, LIBRARY_SCHEMA } from '../src/generated/library.js'
import { RENDER_CONFIG_ROUTE } from '../src/shared/render-route.js'

const valid = 'root = Card([t])\nt = TextContent("hi")'

function harness({ chunksByCall, selection = { provider: 'test-provider', model: 'test-model' }, modelInfo, config = {} } = {}) {
  const tools = []
  const commands = []
  const events = new Map()
  const calls = []
  const routes = []
  const injections = []
  const toolsService = { register: def => { tools.push(def); return () => {} } }
  const ctx = {
    agentDefaultModel: { currentSelection: () => selection },
    llm: { async *stream(options) {
      calls.push(options)
      yield* chunksByCall?.[calls.length - 1] ?? [
        { type: 'text-delta', text: valid },
        { type: 'finish', reason: { kind: 'stop' } },
      ]
    }, async resolveModelInfo() { return modelInfo } },
    get: name => name === 'tools' ? toolsService : undefined,
    tools: toolsService,
    commands: { register: def => { commands.push(def); return () => {} } },
    connection: { fetch: { register: route => { routes.push(route); return () => {} } } },
    inject: (deps, callback) => { injections.push(deps); callback(ctx) },
    on: (name, handler) => events.set(name, handler),
    effect: fn => { const dispose = fn(); return () => dispose?.() },
  }
  apply(ctx, config)
  return { tools, commands, events, calls, routes, injections }
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
  assert.deepEqual(h.routes.map(route => route.path), [RENDER_CONFIG_ROUTE])
  assert.ok(h.injections.some(deps => deps.join(',') === 'connection'))
})

test('render config uses the existing authenticated Connection Fetch channel', () => {
  let registerRoute
  const pending = []
  const ctx = {
    agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    llm: { async *stream() {} },
    commands: { register() {} },
    tools: { register() { return () => {} } },
    inject: (deps, callback) => {
      if (deps.includes('connection')) pending.push(callback)
      else callback(ctx)
    },
    on() {},
    effect: fn => fn(),
  }
  apply(ctx)
  assert.equal(pending.length, 1)
  pending[0]({ connection: { fetch: { register: route => { registerRoute = route } } } })
  assert.equal(registerRoute.path, RENDER_CONFIG_ROUTE)
  assert.deepEqual(registerRoute.methods, ['GET'])
})

test('registers the tool when the tools service activates after the plugin', () => {
  const pending = []
  const registered = []
  const ctx = {
    agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    llm: { async *stream() {} },
    commands: { register() {} },
    connection: { fetch: { register() { return () => {} } } },
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

test('render config route serves only the fixed local configuration', async () => {
  const h = harness()
  const route = h.routes[0]
  assert.equal(route.requestBody, 'buffered')
  const response = await route.fetch()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const result = await response.json()
  assert.match(result.config.css, /\.openui-native/)
  assert.match(result.path, /render\.js$/)
})

test('only an accepted /openui turn may call the tool', async () => {
  const h = harness()
  const agent = { steer() {} }
  const exec = { agent, signal: new AbortController().signal }
  await assert.rejects(h.tools[0].execute({ question: 'q' }, exec), /Use \/openui/)
  await activate(h, agent)
  assert.equal(await h.tools[0].execute({ question: 'show a chart' }, exec), valid)
  assert.equal(h.tools[0].output.render({}, valid)[0].text, valid)
  await assert.rejects(h.tools[0].execute({ question: 'show a chart' }, exec), /already attempted/)
  await h.events.get('agent/pre-step')({ agent, turn: 2 }, async () => ({ kind: 'enter', messages: [] }))
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

test('OpenUI generation inherits the selected model reasoning effort', async () => {
  const h = harness({ selection: { provider: 'test-provider', model: 'test-model', reasoningEffort: 'high' } })
  const agent = await activate(h)
  await h.tools[0].execute({ question: 'explain KV cache' }, { agent })
  assert.equal(h.calls[0].reasoningEffort, 'high')
  assert.equal(Object.hasOwn(h.calls[0], 'maxTokens'), false)
  assert.equal(Object.hasOwn(h.calls[0], 'temperature'), false)
})

test('the current DSH session controls the model, token budget and reasoning', async () => {
  const h = harness({ selection: { provider: 'other', model: 'other-model', reasoningEffort: 'low' }, modelInfo: { defaultMaxTokens: 9000 } })
  const agent = { session: { requestHeader: () => ({ config: {
    provider: 'session-provider', model: 'session-model', maxTokens: 393216, reasoningEffort: 'high', temperature: 0.35,
  } }) } }
  await activate(h, agent)
  await h.tools[0].execute({ question: 'explain LLM execution' }, { agent })
  assert.equal(h.calls[0].provider, 'session-provider')
  assert.equal(h.calls[0].model, 'session-model')
  assert.equal(h.calls[0].maxTokens, 393216)
  assert.equal(h.calls[0].reasoningEffort, 'high')
  assert.equal(h.calls[0].temperature, 0.35)
})

test('model metadata supplies the budget when the session has none; plugin config can override it', async () => {
  const h = harness({ modelInfo: { defaultMaxTokens: 24000 } })
  const agent = await activate(h)
  await h.tools[0].execute({ question: 'q' }, { agent })
  assert.equal(h.calls[0].maxTokens, 24000)

  const overridden = harness({ modelInfo: { defaultMaxTokens: 24000 }, config: {
    provider: 'custom', model: 'choice', maxTokens: 64000, temperature: 0.25,
    reasoningEffort: 'medium', promptSuffix: 'Use concise section titles.',
  } })
  const overriddenAgent = await activate(overridden)
  await overridden.tools[0].execute({ question: 'q' }, { agent: overriddenAgent })
  assert.equal(overridden.calls[0].provider, 'custom')
  assert.equal(overridden.calls[0].model, 'choice')
  assert.equal(overridden.calls[0].maxTokens, 64000)
  assert.equal(overridden.calls[0].temperature, 0.25)
  assert.equal(overridden.calls[0].reasoningEffort, 'medium')
  assert.equal(overridden.calls[0].system, `${SYSTEM_PROMPT}\n\nUse concise section titles.`)
})

test('empty visible output reports the stream shape without assuming its cause', async () => {
  const h = harness({ config: { maxTokens: 32768 }, chunksByCall: [[
    { type: 'reasoning-delta', text: 'private reasoning' },
    { type: 'finish', reason: { kind: 'max-tokens' } },
  ]] })
  const agent = await activate(h)
  await assert.rejects(h.tools[0].execute({ question: 'explain LLM execution' }, { agent }), /finish=max-tokens; output limit=32768; text-delta=0; reasoning-delta=1; raw text chars=0/)
  assert.equal(h.calls.length, 1)
  await h.events.get('agent/pre-step')({ agent, turn: 1 }, async () => ({ kind: 'enter', messages: [] }))
  await assert.rejects(h.tools[0].execute({ question: 'retry' }, { agent }), /already attempted/)
  assert.equal(h.calls.length, 1)
})

test('whitespace text is distinguishable from a stream with no text chunks', async () => {
  const h = harness({ chunksByCall: [[
    { type: 'text-delta', text: '  ' },
    { type: 'finish', reason: { kind: 'stop' } },
  ]] })
  const agent = await activate(h)
  await assert.rejects(h.tools[0].execute({ question: 'q' }, { agent }), /finish=stop; text-delta=1; reasoning-delta=0; raw text chars=2/)
})

test('invalid OpenUI is repaired once before saving', async () => {
  const h = harness({ chunksByCall: [
    [{ type: 'text-delta', text: 'root = Card([a])\na = Nope("x")' }, { type: 'finish', reason: { kind: 'stop' } }],
    [{ type: 'text-delta', text: valid }, { type: 'finish', reason: { kind: 'stop' } }],
  ] })
  const agent = await activate(h)
  assert.equal(await h.tools[0].execute({ question: 'q' }, { agent }), valid)
  assert.equal(h.calls.length, 2)
  assert.equal(h.calls[1].temperature, undefined)
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
