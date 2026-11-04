// Bundle test/render-smoke.mjs for Node (React external) and run it, so the
// Client half can be rendered without a browser.
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, '.render-smoke.cjs')
await build({
  entryPoints: [join(root, 'test/render-smoke.mjs')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  mainFields: ['module', 'main'],
  external: ['react', 'react-dom'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.js': 'jsx', '.css': 'text' },
  logLevel: 'warning',
})
const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' })
const { rmSync } = await import('node:fs')
rmSync(outfile, { force: true })
process.exit(result.status ?? 1)
