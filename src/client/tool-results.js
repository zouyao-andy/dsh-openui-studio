/** Read completed OpenUI tool calls from the durable Chat projection. */
export function openuiResultsForTurn(nodes, turnNumber, bounds = {}) {
  const all = [...(nodes || [])]
  const inTurn = (node, block) => node?.location?.turn?.turn === turnNumber ||
    (Number.isFinite(bounds.startSeq) && Number.isFinite(bounds.endSeq) &&
      Number.isFinite(block?.seq) && block.seq >= bounds.startSeq && block.seq <= bounds.endSeq)
  const callIds = new Set()
  for (const node of all) {
    if (node?.kind !== 'assistant-step' || !inTurn(node, { seq: node.anchorSeq })) continue
    for (const block of node.data?.blocks || []) {
      if (block?.kind === 'tool-call' && block.name === 'openui_generate') callIds.add(block.callId)
    }
  }
  const results = []
  const seen = new Set()
  for (const node of all) {
    if (node?.kind !== 'tool-call') continue
    const pending = [node.data?.root]
    while (pending.length) {
      const block = pending.shift()
      if (!block) continue
      if (block.kind === 'tool-result' && !block.isError && inTurn(node, block) &&
        ((block.call?.name || block.name) === 'openui_generate' || callIds.has(block.callId))) {
        const texts = Array.isArray(block.content) ? block.content.filter(part => part?.type === 'text' && typeof part.text === 'string') : []
        if (texts.length === 1 && texts[0].text.trim() && !seen.has(block.callId)) {
          results.push({ id: block.callId, text: texts[0].text })
          seen.add(block.callId)
        }
      }
      if (Array.isArray(block.subCalls)) pending.push(...block.subCalls)
    }
  }
  return results
}
