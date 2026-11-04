// One shared React instance for the whole Client bundle. `entry.js` installs the
// instance from the browser module table before the module's apply() runs, so
// every JSX call site can resolve `React.createElement` through this live binding.
export let React;
export function setReact(instance) {
  React = instance;
}
