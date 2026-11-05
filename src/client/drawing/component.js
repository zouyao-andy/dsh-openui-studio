import { activity, defineStrategy } from './strategy.js'
import { componentPoint } from './dom.js'

export const component = defineStrategy({
  id: 'component', kind: null,
  match: () => true,
  label: task => activity(task.block, '构建', '组件'),
  milestones: [.18, .58, .9],
  point: (task, progress) => componentPoint(task.block, progress),
})
