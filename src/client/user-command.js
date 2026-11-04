import { PanelsTopLeft } from 'lucide-react'
import { React } from './react.js'
import { translate } from './i18n.js'

export function OpenUICommandToken({ raw }) {
  return <span className="openui-command-token" role="img" title={raw} aria-label={translate('command.name')}>
    <PanelsTopLeft size={16} strokeWidth={1.8} aria-hidden="true" />
  </span>
}
