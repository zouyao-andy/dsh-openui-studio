import { randomUUID } from 'node:crypto'

const STATE_KEY = Symbol.for('dsh-openui-studio/command-gate')

export function createOpenUICommandGate() {
  // An active turn can outlive a Cordis plugin reactivation.
  const state = globalThis[STATE_KEY] ??= {
    pending: new WeakMap(), active: new WeakMap(), attempted: new WeakMap(),
  }
  const { pending, active, attempted } = state

  return {
    queued(agent, messageId) {
      const ids = pending.get(agent) ?? new Set()
      ids.add(messageId)
      pending.set(agent, ids)
    },
    cancelled(agent, messageId) {
      pending.get(agent)?.delete(messageId)
    },
    accepted(agent, turn, messages) {
      if (active.get(agent) !== turn) {
        active.delete(agent)
        attempted.delete(agent)
      }
      const ids = pending.get(agent)
      const submitted = messages.filter(message => ids?.has(message.id))
      if (submitted.length) {
        for (const message of submitted) ids.delete(message.id)
        active.set(agent, turn)
        attempted.delete(agent)
      }
    },
    allowed(agent) {
      return agent !== undefined && active.has(agent)
    },
    claim(agent) {
      if (agent === undefined || !active.has(agent)) return 'unauthorized'
      const turn = active.get(agent)
      if (attempted.get(agent) === turn) return 'already-attempted'
      attempted.set(agent, turn)
      return 'accepted'
    },
  }
}

export function runOpenUICommand({ agent, rawInput, attachments = [] }, maxQuestionChars, gate) {
  const question = String(rawInput ?? '').trim()
  if (!question && attachments.length === 0) {
    return { kind: 'error', text: 'Usage: /openui <question>' }
  }
  if (Number.isFinite(maxQuestionChars) && question.length > maxQuestionChars) {
    return { kind: 'error', text: `Question is too long (limit ${maxQuestionChars} characters).` }
  }

  const message = {
    id: randomUUID(),
    role: 'user',
    content: [
      ...attachments,
      { type: 'text', text: `/openui ${question || 'Create an interactive answer from the attachments in the language of the conversation or files.'}` },
    ],
    source: { kind: 'user' },
  }
  gate?.queued(agent, message.id)
  try {
    agent.steer(message)
  } catch (error) {
    gate?.cancelled(agent, message.id)
    throw error
  }
  return { kind: 'success', text: 'OpenUI request sent to this conversation.' }
}
