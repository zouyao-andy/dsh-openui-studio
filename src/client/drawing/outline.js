import { activity, defineStrategy } from './strategy.js'
import { componentPoint, textPoint } from './dom.js'
import { restoreTyping, startTyping, typingPoint } from './typing.js'

export const outline = defineStrategy({
  id: 'outline', kind: null,
  match: block => Boolean(block.querySelector?.('.openui-foldable-section-trigger-content-text, .openui-inline-header-heading')),
  label: task => task.kind === 'writing'
    ? activity(task.block, 'activity.prose')
    : activity(task.block, 'activity.component'),
  milestones: [.9],
  start: task => startTyping(task),
  point: (task, progress) => typingPoint(task, progress) ?? (task.kind === 'components'
    ? componentPoint(task.block, progress) : textPoint(task.block, progress)),
  dispose: task => restoreTyping(task),
})
