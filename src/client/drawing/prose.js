import { activity, defineStrategy } from './strategy.js'
import { textPoint } from './dom.js'

export const prose = defineStrategy({
  id: 'prose', kind: 'writing',
  match: (_block, kind) => kind === 'writing',
  label: task => activity(task.block, 'activity.prose'),
  milestones: [.2, .75],
  point: (task, progress) => {
    const rect = task.block.getBoundingClientRect()
    if (rect.height <= 500) return textPoint(task.block, progress)
    return { left: rect.left + Math.min(rect.width * .55, 300), top: rect.top + rect.height * progress }
  },
})
