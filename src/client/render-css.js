import bundledCSS from '../../render.css'

const FILE_PATH = typeof __OPENUI_RENDER_CSS_PATH__ === 'string' ? __OPENUI_RENDER_CSS_PATH__ : null
const ROUTE = FILE_PATH ? `api/file?path=${encodeURIComponent(FILE_PATH)}` : null
const REFRESH_MS = 3000

let css = bundledCSS
let styleElement = null
let users = 0
let timer = null
let pending = null

export function refreshRenderCSS() {
  if (!ROUTE) return Promise.reject(new Error('render.css 路径不可用'))
  if (pending) return pending
  pending = fetch(ROUTE, { credentials: 'same-origin', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('无法读取 render.css')
      const updated = await response.text()
      if (css !== updated) {
        css = updated
        if (styleElement) styleElement.textContent = css
      }
      return FILE_PATH
    })
    .finally(() => { pending = null })
  return pending
}

export async function getRenderCSSPath() {
  if (!FILE_PATH) throw new Error('无法定位 render.css')
  return FILE_PATH
}

export function retainRenderCSS() {
  users++
  if (users === 1) {
    styleElement = document.createElement('style')
    styleElement.dataset.plugin = '@local/dsh-openui-studio-render-css'
    styleElement.textContent = css
    document.head.appendChild(styleElement)

    const refreshVisible = () => {
      if (!document.hidden) refreshRenderCSS().catch(() => {})
    }
    refreshVisible()
    timer = window.setInterval(refreshVisible, REFRESH_MS)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    stopListening = () => {
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }
  return () => {
    users--
    if (users !== 0) return
    window.clearInterval(timer)
    timer = null
    stopListening?.()
    stopListening = null
    styleElement?.remove()
    styleElement = null
  }
}

let stopListening = null
