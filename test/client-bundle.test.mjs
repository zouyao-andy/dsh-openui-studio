import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

test('browser bundle loads Lucide with the React instance provided by DSH', () => {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /__require\("react"\)/)
  assert.doesNotMatch(source, /react\.transitional\.element/)
  let registration
  runInNewContext(source, {
    window: { __ModuleLoader__: { load(value) { registration = value } } },
    document: { createElement: () => ({ innerHTML: '', textContent: '' }) },
  })
  assert.equal(registration?.id, '@local/dsh-openui-studio')
  const plugin = registration.factory(name => {
    if (name === 'react') return React
    if (name === 'react-dom') return ReactDOM
    assert.fail(`unexpected DSH module: ${name}`)
  })
  assert.equal(typeof plugin.apply, 'function')
})
