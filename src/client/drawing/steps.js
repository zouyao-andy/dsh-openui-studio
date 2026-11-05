import { activity, defineStrategy, staggeredAnimations } from './strategy.js'
import { componentPoint } from './dom.js'

export const steps = defineStrategy({
  id: 'steps', kind: null,
  match: block => Boolean(block.querySelector?.('.openui-step-item')),
  label: task => activity(task.block, '编排', '步骤'),
  milestones: [.18, .58, .9],
  point: (task, progress) => componentPoint(task.block, progress),
  start: (task, context) => context.track(staggeredAnimations(
    [...task.block.querySelectorAll?.('.openui-step-item') ?? []],
    [{ opacity: 0, transform: 'translateX(-9px)' }, { opacity: 1, transform: 'none' }],
    task, 520,
  )),
})
