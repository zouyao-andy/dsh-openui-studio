// Client half entry (imported by src/client/entry.js, which installs React into
// the shared binding before returning this module's `inject`/`apply`).
//
// Render completed OpenUI tool results in DSH's ordinary conversation. DSH
// remains the owner of history, the message list, and the native composer.
import { OpenUITurnAnswer, OpenUIToolStatus } from './chat-answer.js'
import { installOpenUICommandIcon } from './command-menu.js'
import { OpenUICommandToken } from './user-command.js'
import { openUICommandRule } from '../shared/user-command.js'
import { NS, en, zh, bindLocale, translate } from './i18n.js'
import { STYLES } from './styles.js'
import { bindRenderConnection } from './render-settings.js'

export const inject = ['slots', 'locale', 'uiConversation', 'connection']

export function apply(ctx) {
  ctx.effect(() => bindRenderConnection(ctx.connection), 'openui-studio: render settings connection')
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const style = document.createElement('style')
    style.dataset.plugin = '@local/dsh-openui-studio'
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => style.remove()
  }, 'openui-studio: chat answer styles')

  ctx.effect(() => {
    let disposeDictionary = () => {}
    const locale = ctx.locale
    if (locale && typeof locale.register === 'function') {
      const disposers = [locale.register(NS, 'en', en), locale.register(NS, 'zh', zh)]
      disposeDictionary = () => disposers.forEach(dispose => dispose?.())
    }
    const unbind = bindLocale(locale)
    return () => {
      unbind()
      disposeDictionary()
    }
  }, 'openui-studio: locale dictionaries')

  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    return installOpenUICommandIcon(() => translate('command.name'), () => translate('command.description'), document)
  }, 'openui-studio: native command presentation')

  ctx.effect(() => ctx.uiConversation.userText.register(openUICommandRule), 'openui-studio: sent command matcher')
  ctx.slots.inject('conversation.user.text.node', () =>
    ctx.slots.register({ name: 'conversation.user.text.node', key: openUICommandRule.id }, OpenUICommandToken),
  )

  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register(
      {
        name: 'tool.call.toolview',
        key: 'openui_generate',
        locale: NS,
      },
      OpenUIToolStatus,
    ),
  )

  ctx.slots.inject('conversation.chat.turnTail', () =>
    ctx.slots.register(
      {
        name: 'conversation.chat.turnTail',
        id: 'openui-studio',
        order: 10,
        locale: NS,
      },
      OpenUITurnAnswer,
    ),
  )

}
