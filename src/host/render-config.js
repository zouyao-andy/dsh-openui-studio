import { fileURLToPath, pathToFileURL } from 'node:url'
import bundledConfig from '../../render.js'
import { normalizeRenderConfig } from '../shared/render-config.js'

const DEFAULT_PATH = typeof __OPENUI_RENDER_JS_PATH__ === 'string'
  ? __OPENUI_RENDER_JS_PATH__
  : fileURLToPath(new URL('../../render.js', import.meta.url))
let loaderId = 0

export function createRenderConfigLoader(path = DEFAULT_PATH) {
  const fallback = normalizeRenderConfig(bundledConfig)
  const url = `${pathToFileURL(path).href}?loader=${++loaderId}`
  let pending = null

  function load() {
    if (pending) return pending
    pending = import(url)
      .then(module => ({ config: normalizeRenderConfig(module.default), error: null }))
      .catch(cause => ({ config: fallback, error: (cause?.message ?? String(cause)).slice(0, 500) }))
    return pending
  }

  return { load }
}
