import { COMMAND_DESCRIPTION } from '../shared/command-copy.js'

const COMMAND_NAME = 'openui'
const MENU_SELECTOR = '[data-trigger-menu]'
const ICON_MARKER = 'data-openui-command-icon'
const NAME_MARKER = 'data-openui-command-name'
const ALIAS_MARKER = 'data-openui-command-alias'
const DESCRIPTION_MARKER = 'data-openui-command-description'
const DESCRIPTION_ORIGINAL = 'data-openui-command-description-original'
const LEGACY_DESCRIPTION = '在当前对话中生成交互图表与可视化回答'

function makeIcon(doc) {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = doc.createElementNS(ns, 'svg')
  svg.setAttribute(ICON_MARKER, '')
  svg.setAttribute('class', 'openui-command-icon')
  svg.setAttribute('viewBox', '0 0 20 20')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  for (const [tag, attributes] of [
    ['rect', { x: '2.75', y: '3.25', width: '14.5', height: '13.5', rx: '2.25' }],
    ['path', { d: 'M2.75 6.9h14.5' }],
    ['rect', { x: '5.1', y: '9.2', width: '4.4', height: '2.2', rx: '0.6' }],
    ['path', { d: 'M11.4 9.75h3.5' }],
    ['path', { d: 'M5.1 13.6h9.8' }],
  ]) {
    const child = doc.createElementNS(ns, tag)
    for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value)
    svg.appendChild(child)
  }
  return svg
}

export function decorateOpenUICommandMenu(menu, getLabel, getDescription) {
  for (const option of menu.querySelectorAll('button[role="option"]')) {
    const name = [...option.children].find(child => child.tagName === 'SPAN' && (
      child.hasAttribute(NAME_MARKER) || (!child.hasAttribute(ALIAS_MARKER) && child.textContent?.trim() === COMMAND_NAME)
    ))
    if (!name) continue
    if (!option.querySelector(`[${ICON_MARKER}]`)) option.insertBefore(makeIcon(menu.ownerDocument), name)
    name.setAttribute(NAME_MARKER, '')
    const label = getLabel()
    if (name.textContent !== label) name.textContent = label
    if (!option.querySelector(`[${ALIAS_MARKER}]`)) {
      const alias = menu.ownerDocument.createElement('span')
      alias.setAttribute(ALIAS_MARKER, '')
      alias.className = 'openui-command-alias'
      alias.textContent = COMMAND_NAME
      name.after(alias)
    }
    const description = [...option.querySelectorAll('span')].find(child =>
      child !== name && !child.hasAttribute(ALIAS_MARKER) && (
        child.hasAttribute(DESCRIPTION_MARKER)
        || [COMMAND_DESCRIPTION, LEGACY_DESCRIPTION].includes(child.textContent?.trim())
      ))
    if (description) {
      if (!description.hasAttribute(DESCRIPTION_MARKER)) {
        description.setAttribute(DESCRIPTION_MARKER, '')
        description.setAttribute(DESCRIPTION_ORIGINAL, description.textContent)
      }
      const copy = getDescription()
      if (description.textContent !== copy) description.textContent = copy
    }
  }
}

export function installOpenUICommandIcon(getLabel, getDescription, doc = document) {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement
      const menu = target?.closest?.(MENU_SELECTOR)
      if (menu) decorateOpenUICommandMenu(menu, getLabel, getDescription)
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue
        if (node.matches?.(MENU_SELECTOR)) decorateOpenUICommandMenu(node, getLabel, getDescription)
        for (const addedMenu of node.querySelectorAll?.(MENU_SELECTOR) ?? []) decorateOpenUICommandMenu(addedMenu, getLabel, getDescription)
      }
    }
  })
  observer.observe(doc.body, { childList: true, subtree: true })
  for (const menu of doc.querySelectorAll(MENU_SELECTOR)) decorateOpenUICommandMenu(menu, getLabel, getDescription)
  return () => {
    observer.disconnect()
    for (const icon of doc.querySelectorAll(`[${ICON_MARKER}]`)) icon.remove()
    for (const alias of doc.querySelectorAll(`[${ALIAS_MARKER}]`)) alias.remove()
    for (const description of doc.querySelectorAll(`[${DESCRIPTION_MARKER}]`)) {
      description.textContent = description.getAttribute(DESCRIPTION_ORIGINAL) ?? COMMAND_DESCRIPTION
      description.removeAttribute(DESCRIPTION_MARKER)
      description.removeAttribute(DESCRIPTION_ORIGINAL)
    }
    for (const name of doc.querySelectorAll(`[${NAME_MARKER}]`)) {
      name.removeAttribute(NAME_MARKER)
      name.textContent = COMMAND_NAME
    }
  }
}
