import { Renderer } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import nativeStyles from '@openuidev/react-ui/styles/index.css'
import { React } from './react.js'
import { retainRenderCSS } from './render-css.js'

export const NATIVE_STYLES = nativeStyles

let styleElement = null
let styleUsers = 0

export function useNativeStyles() {
  React.useInsertionEffect(() => {
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.dataset.plugin = '@local/dsh-openui-studio-native'
      styleElement.textContent = NATIVE_STYLES
      document.head.appendChild(styleElement)
    }
    const releaseRenderCSS = retainRenderCSS()
    styleUsers++
    return () => {
      releaseRenderCSS()
      styleUsers--
      if (styleUsers === 0) { styleElement.remove(); styleElement = null }
    }
  }, [])
}

export function NativeOpenUIRenderer({ source, onAction }) {
  useNativeStyles()
  const handleAction = React.useCallback(event => {
    const message = typeof event.params?.message === 'string' ? event.params.message : event.humanFriendlyMessage
    if (typeof message === 'string' && message.trim()) onAction?.(message.trim())
  }, [onAction])
  return <div className="openui-native">
    <Renderer response={source} library={openuiChatLibrary} isStreaming={false} onAction={handleAction} />
  </div>
}
