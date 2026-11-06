import { COMMAND_DESCRIPTION } from '../shared/command-copy.js'

export const NS = 'openui-studio'

export const en = {
  'command.name': 'Interactive view',
  'command.description': COMMAND_DESCRIPTION,
  'busy.label': 'Generating interface…',
  'status.error': 'Failed',
  'toolbar.replay': 'Replay the drawing animation',
  'toolbar.debug': 'Record and replay the drawing animation',
  'toolbar.download': 'Download drawing log',
  'toolbar.edit': 'Open OpenUI render settings',
  'error.openConfig': 'Could not open render.js',
  'error.configUnavailable': 'OpenUI settings service is unavailable',
  'error.configRead': 'Could not read render.js',
  'error.configLocate': 'Could not locate render.js',
  'agent.structure': 'Structure',
  'agent.writing': 'Content',
  'agent.components': 'Components',
  'activity.building': 'Building the interface',
  'activity.heading': 'Organizing section "{subject}"',
  'activity.prose': 'Writing "{subject}"',
  'activity.component': 'Building component "{subject}"',
  'activity.tabs': 'Arranging tabs for "{subject}"',
  'activity.image': 'Adjusting image for "{subject}"',
  'activity.table': 'Adjusting table for "{subject}"',
  'activity.cards': 'Arranging cards for "{subject}"',
  'activity.steps': 'Arranging steps for "{subject}"',
  'activity.barChart': 'Drawing bar chart for "{subject}"',
  'activity.lineChart': 'Drawing trend chart for "{subject}"',
  'activity.pieChart': 'Drawing proportion chart for "{subject}"',
  'activity.chart': 'Drawing chart for "{subject}"',
  'swarm.scanning': 'Scanning answer…',
  'swarm.touring': 'Touring',
  'swarm.tour': 'Tour',
  'swarm.tourTitle': 'Follow the build',
  'swarm.speedTitle': 'Build speed',
  'swarm.closeTitle': 'Exit (Esc)',
  'swarm.soundOn': 'Sound on (M)',
  'swarm.soundOff': 'Sound off (M)',
  'swarm.tapSound': 'Tap for sound',
  'swarm.agentsReady': 'agents ready',
  'swarm.agents': 'agents',
  'swarm.layers': 'layers',
  'swarm.scroll': 'scroll to keep building',
}

export const zh = {
  'command.name': '交互界面',
  'command.description': '在当前对话中生成交互图表与可视化回答',
  'busy.label': '正在生成界面…',
  'status.error': '失败',
  'toolbar.replay': '重播构建动画',
  'toolbar.debug': '录制并重播绘制动画',
  'toolbar.download': '下载绘制日志',
  'toolbar.edit': '打开 OpenUI 渲染配置',
  'error.openConfig': '无法打开 render.js',
  'error.configUnavailable': 'OpenUI 配置服务不可用',
  'error.configRead': '无法读取 render.js',
  'error.configLocate': '无法定位 render.js',
  'agent.structure': '结构',
  'agent.writing': '内容',
  'agent.components': '组件',
  'activity.building': '正在构建界面',
  'activity.heading': '正在整理「{subject}」章节',
  'activity.prose': '正在撰写「{subject}」内容',
  'activity.component': '正在构建「{subject}」组件',
  'activity.tabs': '正在配置「{subject}」标签页',
  'activity.image': '正在调整「{subject}」配图',
  'activity.table': '正在调整「{subject}」表格',
  'activity.cards': '正在排版「{subject}」卡片',
  'activity.steps': '正在编排「{subject}」步骤',
  'activity.barChart': '正在绘制「{subject}」柱状图',
  'activity.lineChart': '正在绘制「{subject}」趋势图',
  'activity.pieChart': '正在绘制「{subject}」比例图',
  'activity.chart': '正在绘制「{subject}」图表',
  'swarm.scanning': '正在扫描回答…',
  'swarm.touring': '自动巡航',
  'swarm.tour': '巡航',
  'swarm.tourTitle': '跟随构建进度',
  'swarm.speedTitle': '构建速度',
  'swarm.closeTitle': '退出（Esc）',
  'swarm.soundOn': '声音已开启（M）',
  'swarm.soundOff': '声音已关闭（M）',
  'swarm.tapSound': '点击开启声音',
  'swarm.agentsReady': '个光标就绪',
  'swarm.agents': '个光标',
  'swarm.layers': '层',
  'swarm.scroll': '继续滚动以完成构建',
}

let bound = null
let service = null

export function bindLocale(locale) {
  service = locale ?? null
  try { bound = locale?.bind?.(NS) ?? null } catch { bound = null }
  return () => {
    if (service === locale) { service = null; bound = null }
  }
}

export function translate(key) {
  const active = service?.getLocale?.()?.active
  if (typeof active === 'string') {
    const dictionary = active.toLowerCase().startsWith('zh') ? zh : en
    return dictionary[key] ?? en[key] ?? key
  }
  try {
    const value = bound?.(key)
    if (typeof value === 'string' && value !== key) return value
  } catch { /* use fallback */ }
  return en[key] ?? key
}
