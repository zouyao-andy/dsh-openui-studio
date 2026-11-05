import { activity, defineStrategy } from './strategy.js'
import { componentPoint } from './dom.js'
import { restoreTyping, startTyping, typingPoint } from './typing.js'

export const tabs = defineStrategy({
  id: 'tabs', kind: null,
  match: block => Boolean(block.querySelector?.('.openui-tabs-trigger')),
  label: task => activity(task.block, '配置', '标签页'),
  timingMode: 'outline',
  frames: 'component',
  milestones: [.9],
  start: task => startTyping(task),
  point: (task, progress) => typingPoint(task, progress) ?? componentPoint(task.block, progress),
  dispose: task => restoreTyping(task),
})
