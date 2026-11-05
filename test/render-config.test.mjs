import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRenderConfigLoader } from '../src/host/render-config.js'
import { normalizeRenderConfig } from '../src/shared/render-config.js'

test('render.js config validates toolbar and animation controls', () => {
  assert.deepEqual(normalizeRenderConfig({ css: '.x{}', toolbar: ['debug', 'replay', 'debug'], animation: { autoPlay: false } }), {
    css: '.x{}', showEditButton: true, toolbar: ['debug', 'replay'],
    animation: { autoPlay: false, followScroll: true },
  })
  assert.throws(() => normalizeRenderConfig({ css: '', toolbar: ['unknown'] }), /toolbar accepts/)
  assert.throws(() => normalizeRenderConfig({ css: '', animation: { followScroll: 'no' } }), /followScroll must be a boolean/)
})

test('render.js is read once per loader and only a new loader sees edited settings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'openui-render-config-'))
  const file = join(dir, 'render.mjs')
  try {
    const loader = createRenderConfigLoader(file)
    assert.equal(loader.path, file)
    await writeFile(file, 'export default { css: ".first{}", toolbar: ["debug"], animation: { autoPlay: false } }\n')
    const first = await loader.load()
    assert.equal(first.error, null)
    assert.equal(first.config.css, '.first{}')
    assert.deepEqual(first.config.toolbar, ['debug'])
    assert.equal(first.config.animation.autoPlay, false)

    await writeFile(file, 'export default { css: ".broken{}", toolbar: ["oops"] }\n')
    assert.deepEqual(await loader.load(), first, 'the current process keeps its startup settings')

    const invalid = await createRenderConfigLoader(file).load()
    assert.match(invalid.error, /toolbar accepts/)
    assert.match(invalid.config.css, /\.openui-native/)

    await writeFile(file, 'export default { css: "unfinished"\n')
    const syntaxError = await createRenderConfigLoader(file).load()
    assert.ok(syntaxError.error)
    assert.match(syntaxError.config.css, /\.openui-native/)

    await writeFile(file, 'export default { css: ".recovered{}", toolbar: ["replay", "debug"], animation: { followScroll: false } }\n')
    const recovered = await createRenderConfigLoader(file).load()
    assert.equal(recovered.error, null)
    assert.equal(recovered.config.css, '.recovered{}')
    assert.equal(recovered.config.animation.followScroll, false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
