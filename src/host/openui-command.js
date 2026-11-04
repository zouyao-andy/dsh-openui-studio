import { randomUUID } from 'node:crypto'

export function createOpenUICommandGate() {
  const pending = new WeakMap()
  const active = new WeakMap()

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
      const ids = pending.get(agent)
      const submitted = messages.filter(message => ids?.has(message.id))
      if (submitted.length) {
        for (const message of submitted) ids.delete(message.id)
        active.set(agent, turn)
      } else if (active.get(agent) !== turn) {
        active.delete(agent)
      }
    },
    allowed(agent) {
      return agent !== undefined && active.has(agent)
    },
    done(agent, turn) {
      if (active.get(agent) === turn) active.delete(agent)
    },
  }
}

export function runOpenUICommand({ agent, rawInput, attachments = [] }, maxQuestionChars, gate) {
  const question = String(rawInput ?? '').trim()
  if (!question && attachments.length === 0) {
    return { kind: 'error', text: 'Usage: /openui <question>' }
  }
  if (question.length > maxQuestionChars) {
    return { kind: 'error', text: `Question is too long (limit ${maxQuestionChars} characters).` }
  }

  const message = {
    id: randomUUID(),
    role: 'user',
    content: [
      ...attachments,
      { type: 'text', text: `/openui ${question || '请根据附件生成交互式回答。'}` },
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
