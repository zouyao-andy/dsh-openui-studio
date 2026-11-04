// Loaded inside DSH's lazy plugin factory. External React belongs to DSH.
import { setReact } from './react.js';
import { inject, apply } from './app.js';

export function bootstrap(require) {
  setReact(require('react'));
  return { inject, apply };
}
