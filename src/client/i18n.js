export const NS = 'openui-studio'

export const en = {
  'command.name': 'Interactive view',
  'busy.label': 'Generating interface…',
  'status.error': 'Failed',
}

export const zh = {
  'command.name': '交互界面',
  'busy.label': '正在生成界面…',
  'status.error': '失败',
}

let bound = null

export function bindLocale(locale) {
  try { bound = locale?.bind?.(NS) ?? null } catch { bound = null }
  return () => { bound = null }
}

export function translate(key) {
  try {
    const value = bound?.(key)
    if (typeof value === 'string' && value !== key) return value
  } catch { /* use fallback */ }
  return en[key] ?? key
}
