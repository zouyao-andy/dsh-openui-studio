import { sectionTitle } from './dom.js'
import { translate } from '../i18n.js'

export function activity(block, key) {
  const subject = sectionTitle(block)
  return subject ? translate(key).replace('{subject}', subject) : translate('activity.building')
}

export function timingFor(mode, block) {
  const height = block.getBoundingClientRect().height
  const characters = Array.from(block.textContent || block.innerText || '').length
  const duration = mode === 'heading' ? Math.min(1500, Math.max(650, 300 + characters * 45))
    : mode === 'outline' ? Math.min(1900, Math.max(850, 420 + characters * 24))
      : mode === 'prose' ? Math.min(5800, Math.max(720, Math.round(420 + height * 1.2)))
      : Math.min(1400, Math.max(720, Math.round(460 + height * .3)))
  const pace = mode === 'heading' ? Math.min(1200, Math.max(650, Math.round(duration * .8)))
    : mode === 'outline' ? Math.min(1300, Math.max(650, Math.round(duration * .72)))
      : mode === 'prose' ? Math.round(duration * .82)
      : Math.min(760, Math.max(420, Math.round(360 + height * .18)))
  return { duration, pace }
}

export function entranceFrames(mode) {
  if (mode === 'heading') return [
    { opacity: 0, offset: 0 },
    { opacity: 1, offset: .08 },
    { opacity: 1, offset: 1 },
  ]
  if (mode === 'prose') return [
    { opacity: 0, clipPath: 'inset(0 0 100% 0)', offset: 0 },
    { opacity: 1, clipPath: 'inset(0 0 90% 0)', offset: .1 },
    { opacity: 1, clipPath: 'inset(0 0 0 0)', offset: 1 },
  ]
  if (mode === 'image') return [
    { opacity: 0, transform: 'scale(.96)', offset: 0 },
    { opacity: 1, transform: 'scale(1)', offset: .6 },
    { opacity: 1, transform: 'scale(1)', offset: 1 },
  ]
  return [
    { opacity: 0, transform: 'translateY(8px)', offset: 0 },
    { opacity: 1, transform: 'translateY(0)', offset: .32 },
    { opacity: 1, transform: 'translateY(0)', offset: 1 },
  ]
}

export function staggeredAnimations(targets, frames, task, duration) {
  const visible = targets.slice(0, 32)
  const stagger = Math.min(200, Math.max(35, (task.duration - duration - 120) / Math.max(1, visible.length - 1)))
  return visible.map((element, index) => element.animate(frames, {
    delay: 80 + index * stagger,
    duration,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'both',
  }))
}

export function defineStrategy({ id, kind, match, label, timingMode = id, frames = id, milestones, plan, frameTarget, start, point, dispose }) {
  return {
    id, kind, match, label,
    plan(block) {
      return plan?.(block) ?? {
        ...timingFor(timingMode, block),
        frames: Array.isArray(frames) ? frames : entranceFrames(frames),
        milestones,
      }
    },
    frameTarget: frameTarget ?? (task => task.block),
    start: start ?? (() => {}),
    point: point ?? (() => null),
    dispose: dispose ?? (() => {}),
  }
}
