import test from 'node:test'
import assert from 'node:assert/strict'
import { focusDSHComposer, insertOpenUIFollowUp } from '../src/client/follow-up.js'

function actions() {
  const drafts = []
  return { drafts, setDraft: draft => drafts.push(draft) }
}

test('follow-up creates a claimed /openui chip in an empty draft', () => {
  const inputActions = actions()
  assert.equal(insertOpenUIFollowUp(inputActions, { draft: '', occurrences: [], phase: 'plain' }, '  为什么？  '), true)
  assert.deepEqual(inputActions.drafts, [{
    text: '/openui 为什么？', references: [], command: { token: '/openui ' },
  }])
})

test('follow-up reuses an existing command without duplicating it', () => {
  const inputActions = actions()
  assert.equal(insertOpenUIFollowUp(inputActions, { draft: '/openui 现有问题', occurrences: [], phase: 'claimed' }, '追问'), true)
  assert.deepEqual(inputActions.drafts, [{
    text: '/openui 现有问题\n追问', references: [], command: { token: '/openui ' },
  }])
})

test('follow-up preserves text references when prepending the command', () => {
  const inputActions = actions()
  const reference = { source: 'file', ref: 'report.md', offset: 1, length: 4, label: '报告', clipboardText: '报告文件' }
  const input = { draft: '看报告文件', occurrences: [reference], phase: 'plain' }
  assert.equal(insertOpenUIFollowUp(inputActions, input, '解释'), true)
  assert.deepEqual(inputActions.drafts, [{
    text: '/openui 解释\n看报告文件',
    references: [{ ...reference, offset: '/openui 解释\n'.length + 1 }],
    command: { token: '/openui ' },
  }])
})

test('follow-up does not change a draft during submission', () => {
  const inputActions = actions()
  assert.equal(insertOpenUIFollowUp(inputActions, { draft: '', phase: 'submitting' }, '解释'), false)
  assert.deepEqual(inputActions.drafts, [])
})

test('repeated activation of a focused choice does not append the same question again', () => {
  const inputActions = actions()
  const input = { draft: '/openui 为什么？', occurrences: [], phase: 'claimed' }
  assert.equal(insertOpenUIFollowUp(inputActions, input, '为什么？'), false)
  assert.deepEqual(inputActions.drafts, [])
  const next = { ...input, draft: '/openui 前一个问题\n为什么？' }
  assert.equal(insertOpenUIFollowUp(inputActions, next, '为什么？'), false)
  assert.deepEqual(inputActions.drafts, [])
  assert.equal(insertOpenUIFollowUp(inputActions, { ...input, draft: '普通草稿\n为什么？' }, '为什么？'), true)
  assert.equal(inputActions.drafts[0].text.startsWith('/openui 为什么？'), true)
})

test('selecting an interactive question moves focus to the DSH composer', () => {
  let focused = false
  const doc = { querySelector: selector => {
    assert.equal(selector, '[data-composer-input][contenteditable="true"]')
    return { focus: options => { assert.deepEqual(options, { preventScroll: true }); focused = true } }
  } }
  assert.equal(focusDSHComposer(doc), true)
  assert.equal(focused, true)
})
