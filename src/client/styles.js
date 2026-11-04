// DSH command chrome stays fixed; OpenUI answer styles live in render.css.
export const STYLES = `
.openui-command-icon {
  display: block;
  flex: none;
  width: 14px;
  height: 14px;
  margin-right: 2px;
  color: currentColor;
}

.openui-command-alias {
  flex: none;
  max-width: 20%;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.openui-command-token {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 6px;
  color: var(--dsw-alias-state-business-primary);
  vertical-align: -0.24em;
}
.openui-command-token svg { flex: none; }

[data-composer-command="openui"] > span {
  padding: 1px 5px;
  border-radius: var(--dsw-radius-sm, 4px);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 75%, var(--dsw-alias-label-primary));
  font-weight: 600;
  transition: background-color 160ms ease-out;
}
[data-composer-command="openui"] > span:hover,
[data-composer-command="openui"][data-selected] > span {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 23%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  [data-composer-command="openui"] > span { transition: none; }
}

.openui-tool-status { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.openui-tool-status[role="alert"] { color: var(--dsw-alias-state-error-primary); }
`
