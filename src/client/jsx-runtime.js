// OpenUI's precompiled JSX must create elements with DSH's React instance.
// Bundling the local React JSX runtime can produce elements that the host
// renderer does not recognize when its React version differs.
import * as React from 'react'

export const Fragment = React.Fragment

export function jsx(type, props, key) {
  return React.createElement(type, key === undefined ? props : { ...props, key })
}

export const jsxs = jsx
