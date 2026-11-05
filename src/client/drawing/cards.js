import { activity, defineStrategy, staggeredAnimations } from './strategy.js'
import { componentPoint } from './dom.js'

export const cards = defineStrategy({
  id: 'cards', kind: null,
  match: block => Boolean(block.querySelector?.('.openui-medium-card-block__item, .openui-small-card-block__item')),
  label: task => activity(task.block, '排版', '卡片'),
  milestones: [.18, .58, .9],
  point: (task, progress) => componentPoint(task.block, progress),
  start: (task, context) => context.track(staggeredAnimations(
    [...task.block.querySelectorAll?.('.openui-medium-card-block__item, .openui-small-card-block__item') ?? []],
    [{ opacity: 0, transform: 'translateY(12px) scale(.94)' }, { opacity: 1, transform: 'none' }],
    task, 520,
  )),
})
