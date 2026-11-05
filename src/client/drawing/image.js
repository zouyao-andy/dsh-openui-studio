import { componentPoint, hasImageText } from './dom.js'
import { activity, defineStrategy } from './strategy.js'

export function imageReflowAnimations(block, duration) {
  const animations = []
  const horizontal = [
    ...(block.matches?.('.openui-image-text--horizontal') ? [block] : []),
    ...block.querySelectorAll?.('.openui-image-text--horizontal') ?? [],
  ]
  for (const pair of horizontal) {
    const image = pair.querySelector('.openui-image-text__image-container')
    const rect = image?.getBoundingClientRect()
    if (!rect || rect.width < 28 || rect.height < 28) continue
    animations.push(image.animate([
      { width: `${Math.round(rect.width * .58)}px`, height: `${Math.round(rect.height * .58)}px` },
      { width: `${rect.width}px`, height: `${rect.height}px` },
    ], { duration: Math.min(1400, duration * .9), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  }
  for (const image of block.querySelectorAll?.('.openui-image-text-large__image-wrap') ?? []) {
    const height = image.getBoundingClientRect().height
    if (height < 90) continue
    animations.push(image.animate([
      { maxHeight: `${Math.round(height * .55)}px` },
      { maxHeight: `${height}px` },
    ], { duration: Math.min(1500, duration), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }))
  }
  return animations
}

export const image = defineStrategy({
  id: 'image', kind: null,
  match: block => hasImageText(block),
  label: task => activity(task.block, 'activity.image'),
  milestones: [.18, .58, .9],
  point: (task, progress) => componentPoint(task.block, progress),
  start: (task, context) => context.track(imageReflowAnimations(task.block, task.duration)),
})
