import assert from 'node:assert/strict'
import test from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createParser, Renderer } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import { openuiRenderLibrary } from '../src/client/render-library.js'
import { setReact } from '../src/client/react.js'

test('render library expands SectionBlock without changing the saved program or official schema', () => {
  setReact(React)
  const source = 'root = Card([sections])\nsections = SectionBlock([item], true)\nitem = SectionItem("one", "First", [body])\nbody = TextContent("Hello")'
  const parse = createParser(openuiRenderLibrary.toJSONSchema(), 'Card').parse(source)
  assert.equal(parse.root?.typeName, 'Card')
  assert.deepEqual(parse.meta.errors, [])
  assert.notEqual(openuiChatLibrary.components.SectionBlock.component, openuiRenderLibrary.components.SectionBlock.component)
  const rendered = openuiRenderLibrary.components.SectionBlock.component({ props: { sections: [], isFoldable: true }, renderNode: () => null })
  assert.equal(rendered.props.props.isFoldable, false)
  assert.equal(openuiChatLibrary.components.SectionBlock.name, openuiRenderLibrary.components.SectionBlock.name)
  const html = renderToStaticMarkup(React.createElement(Renderer, { response: source, library: openuiRenderLibrary, isStreaming: false }))
  assert.match(html, /openui-section-v2/)
  assert.doesNotMatch(html, /openui-foldable-section/)
  assert.match(html, /Hello/)
})
