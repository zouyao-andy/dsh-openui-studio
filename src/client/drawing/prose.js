import { activity, defineStrategy } from './strategy.js'
import { textPoint } from './dom.js'

export const prose = defineStrategy({
  id: 'prose', kind: 'writing',
  match: (_block, kind) => kind === 'writing',
  label: task => activity(task.block, '撰写', '内容'),
  milestones: [.2, .75],
  point: (task, progress) => textPoint(task.block, progress),
})
