const OPENUI_COMMAND = /^\/openui(?=\s|$)/u

export function insertOpenUIFollowUp(inputActions, input, prompt) {
  const question = String(prompt ?? '').trim()
  if (!question || !inputActions?.setDraft || input?.phase === 'adjudicating' || input?.phase === 'submitting') return false

  const draft = input?.draft ?? ''
  const trimmedDraft = draft.trimEnd()
  if (OPENUI_COMMAND.test(draft) && (trimmedDraft === `/openui ${question}` || trimmedDraft.endsWith(`\n${question}`))) return false
  const references = Array.isArray(input?.occurrences) ? input.occurrences : []
  let text
  let offset = 0
  if (OPENUI_COMMAND.test(draft)) {
    const separator = draft === '/openui' ? ' ' : /\s$/u.test(draft) ? '' : '\n'
    text = `${draft}${separator}${question}`
  } else {
    const prefix = `/openui ${question}`
    const remainder = draft.trim() ? `\n${draft}` : ''
    text = `${prefix}${remainder}`
    offset = prefix.length + (remainder ? 1 : 0)
  }

  inputActions.setDraft({
    text,
    references: references.map(reference => ({ ...reference, offset: reference.offset + offset })),
    command: { token: '/openui ' },
  })
  return true
}

export function focusDSHComposer(doc = globalThis.document) {
  const editor = doc?.querySelector?.('[data-composer-input][contenteditable="true"]')
  if (!editor) return false
  editor.focus({ preventScroll: true })
  return true
}
