import { scrollContainer } from './drawing/viewport.js'
import { translate } from './i18n.js'
import { SwarmRebuild } from './vendor/swarm-rebuild.js'

export function playSwarmReveal(content, { requireFocus = false, followScroll = true, debug = false, onDebugComplete } = {}) {
  const skipped = reason => {
    if (debug) onDebugComplete?.([{ at: 0, event: 'session-skipped', reason }])
  }
  if (!content?.isConnected) { skipped('renderer-unavailable'); return }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { skipped('reduced-motion'); return }
  if (requireFocus && (document.hidden || !document.hasFocus())) { skipped('background'); return }
  if (!followScroll) { skipped('follow-scroll-disabled'); return }
  const target = content.querySelector('.openui-native')
  if (!target) { skipped('no-visible-content'); return }
  const scroller = scrollContainer(content) ?? document.scrollingElement
  const startedAt = performance.now()
  const events = [{ at: 0, event: 'session-start' }]
  let reported = false
  content.dataset.openuiDrawing = 'active'
  const cleanup = SwarmRebuild.start(target, {
    scroller,
    followScroll,
    labels: Object.fromEntries([
      'scanning', 'touring', 'tour', 'tourTitle', 'speedTitle', 'closeTitle',
      'soundOn', 'soundOff', 'tapSound', 'agentsReady', 'agents', 'layers', 'scroll',
    ].map(key => [key, translate(`swarm.${key}`)])),
    onComplete: details => events.push({ at: Math.round(performance.now() - startedAt), event: 'scene-complete', ...details }),
    onExit: reason => {
      delete content.dataset.openuiDrawing
      if (reported) return
      events.push({ at: Math.round(performance.now() - startedAt), event: 'session-finish', reason })
      if (debug) onDebugComplete?.(events)
      reported = true
    },
  })
  return cleanup
}
