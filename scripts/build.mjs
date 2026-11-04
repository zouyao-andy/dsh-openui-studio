// Build both halves of the bundle:
//   index.js  — Host half (Node ESM, self-contained)
//   client.js — Web UI half (IIFE registering itself into window.__ModuleLoader__)
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
await import('./gen.mjs')
const common = { bundle: true, logLevel: 'info', minify: false, sourcemap: false }

const host = {
  ...common,
  entryPoints: [join(root, 'src/host/index.js')],
  outfile: join(root, 'index.js'),
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: { js: '// Built from src/host by scripts/build.mjs. Do not edit by hand.' },
}

const client = {
  ...common,
  minify: true,
  entryPoints: [join(root, 'src/client/entry.js')],
  outfile: join(root, 'client.js'),
  write: false,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  external: ['react-dom'],
  plugins: [{
    name: 'dsh-react-external',
    setup(bundle) {
      bundle.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }))
      bundle.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: join(root, 'src/client/jsx-runtime.js') }))
    },
  }],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.js': 'jsx', '.json': 'json', '.css': 'text' },
  define: {
    'process.env.NODE_ENV': '"production"',
    __OPENUI_RENDER_CSS_PATH__: JSON.stringify(join(root, 'render.css')),
  },
}

const [, clientBuild] = await Promise.all([build(host), build(client)])
const bundle = clientBuild.outputFiles[0]?.text
if (!bundle) throw new Error('client bundle is empty')
writeFileSync(client.outfile, `// Built from src/client by scripts/build.mjs. Do not edit by hand.\nwindow.__ModuleLoader__.load({ id: '@local/dsh-openui-studio', factory(require) {\nconst module = { exports: {} };\n${bundle}\nreturn module.exports.bootstrap(require);\n} });\n`)
console.log('built index.js + client.js')
