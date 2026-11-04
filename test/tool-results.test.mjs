import test from 'node:test'
import assert from 'node:assert/strict'
import { openuiResultsForTurn } from '../src/client/tool-results.js'

const completed = (id, text, name = 'openui_generate') => ({
  kind: 'tool-result', callId: id, call: { name }, content: [{ type: 'text', text }],
  isError: false, subCalls: [],
})
const node = (turn, root) => ({ kind: 'tool-call', location: { kind: 'step', turn: { turn } }, data: { root } })

test('finds recorded results only in their own turn', () => {
  const nodes = [node(1, completed('a', 'root = Text("first")')),
    node(2, completed('b', 'root = Text("second")'))]
  assert.deepEqual(openuiResultsForTurn(nodes, 1), [{ id: 'a', text: 'root = Text("first")' }])
  assert.deepEqual(openuiResultsForTurn(nodes, 3), [])
})

test('includes nested dispatch results without claiming other tools or errors', () => {
  const root = { ...completed('root', 'ordinary', 'run_code'), subCalls: [
    completed('nested', 'root = Text("nested")'),
    { ...completed('failed', 'root = Text("bad")'), isError: true },
    completed('other', 'ordinary', 'read'),
  ] }
  assert.deepEqual(openuiResultsForTurn([node(4, root)], 4), [
    { id: 'nested', text: 'root = Text("nested")' },
  ])
})

test('rejects ambiguous or empty result contents', () => {
  const multi = { ...completed('many', 'one'), content: [{ type: 'text', text: 'one' }, { type: 'text', text: 'two' }] }
  const blank = completed('blank', '   ')
  assert.deepEqual(openuiResultsForTurn([node(1, multi), node(1, blank)], 1), [])
})

test('reads a settled DSH tool result with the recorded call name and turn', () => {
  const callId = 'call_00_0nceyge1zwmn26ixc0h8ao7k'
  const root = {
    kind: 'tool-result', callId, name: 'openui_generate',
    call: { name: 'openui_generate', argsRaw: '{}' },
    content: [{ type: 'text', text: 'root = Card([title])\ntitle = CardHeader("LLM")' }],
    isError: false, subCalls: [],
  }
  const store = new Map([['call', node(1, root)]])
  assert.deepEqual(openuiResultsForTurn(store.values(), 1), [
    { id: callId, text: 'root = Card([title])\ntitle = CardHeader("LLM")' },
  ])
})

test('recovers a result through turn bounds and the assistant call ID', () => {
  const callId = 'call-llm-explainer'
  const assistant = {
    kind: 'assistant-step', location: { kind: 'step', turn: { turn: 7 } }, anchorSeq: 19,
    data: { blocks: [{ kind: 'tool-call', callId, name: 'openui_generate' }] },
  }
  const result = {
    kind: 'tool-result', seq: 21, callId, name: '', call: null,
    content: [{ type: 'text', text: 'root = Card([head])\nhead = CardHeader("LLM")' }],
    isError: false, subCalls: [],
  }
  const unresolved = { kind: 'tool-call', location: { kind: 'unresolved' }, data: { root: result } }
  assert.deepEqual(openuiResultsForTurn([assistant, unresolved], 7, { startSeq: 5, endSeq: 24 }), [
    { id: callId, text: 'root = Card([head])\nhead = CardHeader("LLM")' },
  ])
  assert.deepEqual(openuiResultsForTurn([assistant, unresolved], 8, { startSeq: 25, endSeq: 30 }), [])
})
