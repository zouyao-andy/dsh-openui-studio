import { blockKind } from './dom.js'
import { heading } from './heading.js'
import { tabs } from './tabs.js'
import { outline } from './outline.js'
import { image } from './image.js'
import { table } from './table.js'
import { chart } from './chart.js'
import { cards } from './cards.js'
import { steps } from './steps.js'
import { prose } from './prose.js'
import { component } from './component.js'

// Keep broad container matches after specific matches; each block gets one strategy.
export const DRAWING_STRATEGIES = [heading, tabs, outline, image, table, chart, cards, steps, prose, component]

export function strategyFor(block) {
  const kind = blockKind(block)
  const strategy = DRAWING_STRATEGIES.find(item => item.match(block, kind))
  return { kind: strategy.kind ?? kind, strategy }
}
