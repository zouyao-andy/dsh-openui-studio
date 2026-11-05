import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
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
    connection: { fetch: { register: () => () => {} } },
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

test('built Host resolves render.js beside a relocated plugin bundle', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openui-installed-bundle-'))
  try {
    await Promise.all([
      copyFile(fileURLToPath(new URL('../index.js', import.meta.url)), join(directory, 'index.js')),
      copyFile(fileURLToPath(new URL('../render.js', import.meta.url)), join(directory, 'render.js')),
      writeFile(join(directory, 'package.json'), '{"type":"module"}\n'),
    ])
    const relocated = await import(pathToFileURL(join(directory, 'index.js')).href)
    let configRoute
    const ctx = {
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
      llm: { async *stream() {} },
      commands: { register: () => () => {} },
      tools: { register: () => () => {} },
      connection: { fetch: { register: route => { configRoute = route; return () => {} } } },
      inject: (_deps, callback) => callback(ctx),
      on() {},
      effect: fn => fn(),
    }
    relocated.apply(ctx)
    const response = await (await configRoute.fetch()).json()
    assert.equal(response.path, join(await realpath(directory), 'render.js'))
    assert.equal(response.error, null)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
