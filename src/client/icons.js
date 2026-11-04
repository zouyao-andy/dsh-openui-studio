// The compact tool status icon matches the /openui command icon.
import { React } from './react.js'

/** OpenUI canvas icon: a small frame with generated blocks. */
export function SidebarIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="openui-icon"
    >
      <rect x="2.75" y="3.25" width="14.5" height="13.5" rx="2.25" />
      <path d="M2.75 6.9h14.5" />
      <rect x="5.1" y="9.2" width="4.4" height="2.2" rx="0.6" />
      <path d="M11.4 9.75h3.5" />
      <path d="M5.1 13.6h9.8" />
    </svg>
  )
}
