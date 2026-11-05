import bundledConfig from '../../render.js'
import { normalizeRenderConfig } from '../shared/render-config.js'
import { React } from './react.js'
import { translate } from './i18n.js'
import { RENDER_CONFIG_ROUTE } from '../shared/render-route.js'

let snapshot = { config: normalizeRenderConfig(bundledConfig), error: null }
let connection = null
let filePath = null
let styleElement = null
let users = 0
let pending = null
let loaded = false
let generation = 0
const listeners = new Set()

const getSnapshot = () => snapshot
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }

export function useRenderSettings() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function bindRenderConnection(value) {
  connection = value
  generation++
  loaded = false
  pending = null
  filePath = null
  return () => { if (connection === value) connection = null }
}

export async function getRenderSettingsPath() {
  const path = await loadRenderSettings()
  if (!path) throw new Error(translate('error.configLocate'))
  return path
}

export function loadRenderSettings() {
  if (loaded) return Promise.resolve(filePath)
  if (pending) return pending
  if (!connection || typeof fetch !== 'function') return Promise.reject(new Error(translate('error.configUnavailable')))
  const source = connection
  const requestGeneration = generation
  const request = fetch(RENDER_CONFIG_ROUTE.slice(1), { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error(`${translate('error.configRead')} (HTTP ${response.status})`)
      const result = await response.json()
      if (source !== connection || requestGeneration !== generation) return null
      if (typeof result?.path !== 'string' || !result.path) throw new Error(translate('error.configLocate'))
      const next = {
        config: normalizeRenderConfig(result.config),
        error: result.error ?? null,
      }
      if (JSON.stringify(next) !== JSON.stringify(snapshot)) {
        snapshot = next
        if (styleElement) styleElement.textContent = next.config.css
        for (const listener of listeners) listener()
      }
      filePath = result.path
      loaded = true
      return filePath
    })
    .finally(() => { if (pending === request) pending = null })
  pending = request
  return request
}

export function retainRenderSettings() {
  users++
  if (users === 1) {
    styleElement = document.createElement('style')
    styleElement.dataset.plugin = 'dsh-openui-studio-render-settings'
    styleElement.textContent = snapshot.config.css
    document.head.appendChild(styleElement)
    loadRenderSettings().catch(() => {})
  }
  return () => {
    users--
    if (users !== 0) return
    styleElement?.remove()
    styleElement = null
  }
}
