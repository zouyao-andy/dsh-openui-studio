// DSH's user-text matcher decorates only the leading slash command. The saved
// user message remains the original /openui text for editing, copying and AI.
export const openUICommandRule = {
  id: 'openui-command',
  order: 20,
  match(text, from) {
    if (from !== 0 || !/^\/openui(?=\s|$)/u.test(text)) return undefined
    return { id: 'openui-command', start: 0, end: '/openui'.length, data: {} }
  },
}
