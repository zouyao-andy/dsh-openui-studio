import { Renderer } from '@openuidev/react-lang'
import nativeStyles from '@openuidev/react-ui/styles/index.css'
import { React } from './react.js'
import { retainRenderSettings } from './render-settings.js'
import { openuiRenderLibrary } from './render-library.js'

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
    const releaseRenderSettings = retainRenderSettings()
    styleUsers++
    return () => {
      releaseRenderSettings()
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
    <Renderer response={source} library={openuiRenderLibrary} isStreaming={false} onAction={handleAction} />
  </div>
}
