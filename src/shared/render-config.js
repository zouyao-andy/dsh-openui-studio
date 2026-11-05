export const TOOLBAR_ACTIONS = ['replay', 'debug', 'download-log']

export function normalizeRenderConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('render.js must export a configuration object')
  if (typeof value.css !== 'string') throw new TypeError('render.js css must be a string')
  const toolbar = value.toolbar ?? TOOLBAR_ACTIONS
  if (!Array.isArray(toolbar) || toolbar.some(id => !TOOLBAR_ACTIONS.includes(id))) {
    throw new TypeError(`render.js toolbar accepts: ${TOOLBAR_ACTIONS.join(', ')}`)
  }
  if (value.showEditButton !== undefined && typeof value.showEditButton !== 'boolean') {
    throw new TypeError('render.js showEditButton must be a boolean')
  }
  const animation = value.animation ?? {}
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) {
    throw new TypeError('render.js animation must be an object')
  }
  for (const key of ['autoPlay', 'followScroll']) {
    if (animation[key] !== undefined && typeof animation[key] !== 'boolean') {
      throw new TypeError(`render.js animation.${key} must be a boolean`)
    }
  }
  return {
    css: value.css,
    showEditButton: value.showEditButton ?? true,
    toolbar: [...new Set(toolbar)],
    animation: {
      autoPlay: animation.autoPlay ?? true,
      followScroll: animation.followScroll ?? true,
    },
  }
}
