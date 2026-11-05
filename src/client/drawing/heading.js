import { activity, defineStrategy } from './strategy.js'
import { textPoint } from './dom.js'
import { restoreTyping, startTyping, typingPoint } from './typing.js'

export const heading = defineStrategy({
  id: 'heading', kind: 'structure',
  match: (_block, kind) => kind === 'structure',
  label: task => activity(task.block, 'activity.heading'),
  milestones: [.9],
  start: task => startTyping(task),
  point: (task, progress) => typingPoint(task, progress) ?? textPoint(task.block, progress),
  dispose: task => restoreTyping(task),
})
