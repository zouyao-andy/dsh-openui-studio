import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpenUICommandGate, runOpenUICommand } from '../src/host/openui-command.js'
import { openUICommandRule } from '../src/shared/user-command.js'

test('only a leading /openui token receives command presentation', () => {
  assert.deepEqual(openUICommandRule.match('/openui 讲解一下', 0), {
    id: 'openui-command', start: 0, end: 7, data: {},
  })
  assert.equal(openUICommandRule.match('提到 /openui', 0), undefined)
  assert.equal(openUICommandRule.match('/openui2 讲解一下', 0), undefined)
  assert.equal(openUICommandRule.match('/openui 讲解一下', 1), undefined)
})

test('/openui steers one request in the current conversation', () => {
  const messages = []
  const agent = { steer: message => messages.push(message) }
  const result = runOpenUICommand({ agent, rawInput: '  把上面数据画成图  ' }, 8000)

  assert.equal(result.kind, 'success')
  assert.equal(messages.length, 1)
  assert.match(messages[0].id, /^[0-9a-f-]{36}$/)
  assert.equal(messages[0].role, 'user')
  assert.deepEqual(messages[0].source, { kind: 'user' })
  assert.deepEqual(messages[0].content, [{ type: 'text', text: '/openui 把上面数据画成图' }])
})

test('/openui preserves accepted attachments and supports attachment-only requests', () => {
  const messages = []
  const attachment = { type: 'file', name: 'data.csv', id: 'file-1' }
  const result = runOpenUICommand({
    agent: { steer: message => messages.push(message) },
    rawInput: '',
    attachments: [attachment],
  }, 8000)

  assert.equal(result.kind, 'success')
  assert.deepEqual(messages[0].content, [attachment, {
    type: 'text', text: '/openui 请根据附件生成交互式回答。',
  }])
})

test('/openui rejects empty or oversized requests before steering', () => {
  let calls = 0
  const agent = { steer: () => { calls++ } }
  assert.equal(runOpenUICommand({ agent, rawInput: '  ' }, 8000).kind, 'error')
  assert.equal(runOpenUICommand({ agent, rawInput: 'abcd' }, 3).kind, 'error')
  assert.equal(calls, 0)
})

test('command gate follows the accepted request and resets at the turn boundary', () => {
  const gate = createOpenUICommandGate()
  const agent = {}
  gate.queued(agent, 'request-1')
  gate.accepted(agent, 1, [{ id: 'another-message' }])
  assert.equal(gate.allowed(agent), false)
  gate.accepted(agent, 1, [{ id: 'request-1' }])
  assert.equal(gate.allowed(agent), true)
  gate.done(agent, 2)
  assert.equal(gate.allowed(agent), true)
  gate.done(agent, 1)
  assert.equal(gate.allowed(agent), false)
})

test('command authorization is queued before steering and cleared if steering fails', () => {
  const gate = createOpenUICommandGate()
  const agent = {
    steer(message) {
      gate.accepted(agent, 3, [message])
    },
  }
  assert.equal(runOpenUICommand({ agent, rawInput: 'chart' }, 8000, gate).kind, 'success')
  assert.equal(gate.allowed(agent), true)

  let rejectedId
  const failing = { steer(message) { rejectedId = message.id; throw new Error('closed') } }
  assert.throws(() => runOpenUICommand({ agent: failing, rawInput: 'chart' }, 8000, gate), /closed/)
  gate.accepted(failing, 4, [{ id: rejectedId }])
  assert.equal(gate.allowed(failing), false)
})
