import test from 'node:test'
import assert from 'node:assert/strict'
import * as ReactImpl from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { setReact } from '../src/client/react.js'
import { bindRenderConnection, loadRenderSettings, retainRenderSettings, useRenderSettings } from '../src/client/render-settings.js'

setReact(ReactImpl)

test('render.js settings are fetched once per DSH connection', async () => {
  function Probe() {
    const { config } = useRenderSettings()
    return ReactImpl.createElement('output', null, JSON.stringify({ toolbar: config.toolbar, animation: config.animation, showEditButton: config.showEditButton }))
  }
  const render = () => renderToStaticMarkup(ReactImpl.createElement(Probe))
  assert.match(render(), /replay/)

  let calls = 0
  const release = bindRenderConnection({ rpc: { call: async () => {
    calls++
    return {
      ok: true,
      value: { config: { css: '.custom{}', showEditButton: false, toolbar: ['debug'], animation: { autoPlay: false, followScroll: false } }, error: null },
    }
  } } })
  try {
    await loadRenderSettings()
    const html = render()
    assert.doesNotMatch(html, /replay/)
    assert.match(html, /debug/)
    assert.match(html, /autoPlay&quot;:false/)
    assert.match(html, /showEditButton&quot;:false/)
    await loadRenderSettings()
    assert.equal(calls, 1)
  } finally {
    release()
  }
})

test('render.js startup settings apply CSS to the mounted answer', async () => {
  const previous = { document: globalThis.document, window: globalThis.window }
  let removed = false
  const style = { textContent: '', dataset: {}, remove() { removed = true } }
  globalThis.document = {
    hidden: false,
    createElement: () => style,
    head: { appendChild() {} },
    addEventListener() {}, removeEventListener() {},
  }
  globalThis.window = { setInterval() { throw new Error('render settings must not poll') } }
  const unbind = bindRenderConnection({ rpc: { call: async () => ({
    ok: true,
    value: { config: { css: '.live{color:red}', toolbar: ['replay'] }, error: null },
  }) } })
  try {
    const release = retainRenderSettings()
    await loadRenderSettings()
    assert.equal(style.textContent, '.live{color:red}')
    assert.equal(removed, false)
    release()
    assert.equal(removed, true)
  } finally {
    unbind()
    globalThis.document = previous.document
    globalThis.window = previous.window
  }
})
