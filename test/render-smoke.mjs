import { createParser } from '@openuidev/lang-core'
import { renderToStaticMarkup } from 'react-dom/server'
import * as ReactImpl from 'react'
import { setReact } from '../src/client/react.js'
import { NativeOpenUIRenderer, NATIVE_STYLES } from '../src/client/native-answer.js'
import { apply } from '../src/client/app.js'
import { OpenUICommandToken } from '../src/client/user-command.js'
import { openuiResultsForTurn } from '../src/client/tool-results.js'
import { LIBRARY_SCHEMA } from '../src/generated/library.js'
import renderConfig from '../render.js'

setReact(ReactImpl)
const program = [
  'root = Card([head, intro, table])',
  'head = CardHeader("宋代印刷与知识传播")',
  'intro = TextContent("书籍供给扩大，但读者范围仍需验证。")',
  'table = Table([period, effect])',
  'period = Col("阶段", ["唐代", "宋代"])',
  'effect = Col("变化", ["初步使用", "商业出版扩大"])',
].join('\n')
const parsed = createParser(LIBRARY_SCHEMA, 'Card').parse(program)
if (!parsed.root || parsed.meta.errors.length) throw new Error(`official parser rejected program: ${JSON.stringify(parsed.meta.errors)}`)
const html = renderToStaticMarkup(ReactImpl.createElement(NativeOpenUIRenderer, { source: program }))
if (!html.includes('宋代印刷与知识传播') || !html.includes('商业出版扩大') || !NATIVE_STYLES.includes('table')) {
  throw new Error('official OpenUI renderer or styles did not load')
}

const registrations = []
const dictionaries = []
const userTextRules = []
apply({
  slots: {
    inject: (_key, callback) => { callback(); return () => {} },
    register: (options, component) => { registrations.push({ options, component }); return () => {} },
  },
  locale: {
    register: (ns, language, dict) => { dictionaries.push({ ns, language, dict }); return () => {} },
    bind: () => key => key,
    getLocale: () => ({ active: 'zh-CN' }),
  },
  uiConversation: { userText: { register: rule => { userTextRules.push(rule); return () => {} } } },
  connection: { rpc: { call: async () => ({ ok: true, value: null }) } },
  effect: fn => { const dispose = fn(); return () => dispose?.() },
})
const tail = registrations.find(item => item.options.name === 'conversation.chat.turnTail')
const tool = registrations.find(item => item.options.name === 'tool.call.toolview')
if (!tail || tool?.options.key !== 'openui_generate') throw new Error('DSH answer slots are missing')
if (!userTextRules.some(rule => rule.id === 'openui-command')) throw new Error('sent command matcher is missing')
if (!registrations.some(item => item.options.name === 'conversation.user.text.node')) throw new Error('sent command slot is missing')
if (!dictionaries.some(item => item.ns === 'openui-studio' && item.language === 'en')
  || !dictionaries.some(item => item.ns === 'openui-studio' && item.language === 'zh')) throw new Error('locale dictionaries are missing')
const command = renderToStaticMarkup(ReactImpl.createElement(OpenUICommandToken, { raw: '/openui' }))
if (!command.includes('role="img"') || !command.includes('title="/openui"') || !command.includes('aria-label="交互界面"') || !command.includes('<svg')) throw new Error('localized command icon was not rendered')

const node = { kind: 'tool-call', location: { turn: { turn: 3 } }, data: { root: {
  kind: 'tool-result', callId: 'call-1', call: { name: 'openui_generate' }, isError: false,
  content: [{ type: 'text', text: program }], subCalls: [],
} } }
if (openuiResultsForTurn([node], 3).length !== 1) throw new Error('recorded DSH result was not found')
const nodeStore = new Map([['call-1', node]])
const answer = renderToStaticMarkup(ReactImpl.createElement(tail.component, {
  turn: { turn: 3, status: 'closed' }, seq: 25,
  useChat: selector => selector({ nodes: nodeStore }),
  useInput: selector => selector({ draft: '' }),
  inputActions: { captureInsertion: () => ({}), insertText: () => true },
}))
if (!answer.includes('openui-answer-header') || !answer.includes('openui-answer-edit') || !answer.includes('OpenUI Studio') || !answer.includes('openui-native') || !answer.includes('商业出版扩大')) {
  throw new Error('framed saved result did not render in DSH chat')
}
if (!answer.includes('openui-answer-replay') || !answer.includes('重播构建动画')) {
  throw new Error('saved answers must offer a replay control')
}
if (!answer.includes('打开 OpenUI 渲染配置')) throw new Error('render.js editor control is missing')
if (answer.includes('录制并重播绘制动画') !== renderConfig.toolbar.includes('debug')) {
  throw new Error('debug control does not match render.js toolbar settings')
}
if (openuiResultsForTurn([node], 4).length) throw new Error('another turn inherited the UI')
console.log('official OpenUI render and DSH turn-tail integration -> OK')
