/**
 * Smoke test — no DSH runtime needed.
 *
 * 1. Materializes lib/client.js through the module-loader contract
 *    (fake window.__ModuleLoader__ + fake react) and asserts the plugin face.
 * 2. Mounts the node half with a fake ctx and exercises each wallpaper route
 *    handler against the real asset files on disk.
 *
 * Run: node test/smoke.mjs  (after npm run build)
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

/* ── 1. client bundle contract ─────────────────────────────────────────── */
let registered
const fakeWindow = {
  __ModuleLoader__: { load: (handoff) => { registered = handoff } },
}
vm.runInContext(bundle, vm.createContext({ window: fakeWindow, console }))
assert.ok(registered, 'bundle must register via window.__ModuleLoader__.load')
assert.equal(registered.id, 'dsh-theme-triptych')

const fakeReact = {
  createElement: () => ({}),
  useState: () => [],
  useEffect: () => {},
  Fragment: Symbol('fragment'),
}
const clientExports = registered.factory((spec) => {
  if (spec === 'react') return fakeReact
  throw new Error('unexpected require: ' + spec)
})
assert.equal(typeof clientExports.apply, 'function', 'client must export apply')
// Cross-realm array (vm context) — compare members, not prototypes.
const injectList = Array.from(clientExports.inject)
assert.equal(injectList.length, 2, 'client must declare two inject deps')
assert.equal(injectList[0], 'theme', 'client must inject theme')
assert.equal(injectList[1], 'slots', 'client must inject slots')
console.log('✓ client bundle: factory registers and exposes apply/inject')

/* ── 2. node half routes ───────────────────────────────────────────────── */
const nodeHalf = await import(new URL('../lib/index.js', import.meta.url))
assert.equal(typeof nodeHalf.apply, 'function')
// The node half must declare webServer as a hard injection (boot-order race
// otherwise silently registers nothing).
assert.equal(typeof nodeHalf.inject, 'object')
assert.equal(nodeHalf.inject[0], 'webServer', 'node half must inject webServer')

const routes = []
const disposers = []
const fakeWebServer = {
  register: (route) => {
    routes.push(route)
    return () => {}
  },
}
const fakeCtx = {
  webServer: fakeWebServer,
  effect: (fn) => { disposers.push(fn) },
}
nodeHalf.apply(fakeCtx)
assert.equal(routes.length, 3, 'three wallpaper routes registered')
assert.ok(disposers.length === 3, 'route disposers are fiber-owned')
for (const route of routes) {
  assert.equal(route.kind, 'exact')
  assert.ok(route.path.startsWith('/dsh-theme-triptych/'), route.path)
}
console.log('✓ node half: 3 exact routes registered:', routes.map((r) => r.path).join(', '))

// Exercise every handler against the real asset file.
for (const route of routes) {
  let status = 0
  let headers = null
  const chunks = []
  const fakeRes = {
    writeHead: (code, h) => { status = code; headers = h },
    end: (body) => { chunks.push(body) },
  }
  await route.handler({}, fakeRes)
  assert.equal(status, 200, `${route.path} must answer 200`)
  assert.equal(headers['content-type'], 'image/jpeg')
  const body = Buffer.concat(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))))
  assert.ok(body.length > 100000, `${route.path} must serve a real image (got ${body.length} bytes)`)
  assert.ok(String(body.slice(0, 3)) === 'ÿØÿ'.replace('ÿ', '\xff').replace('Ø', '\xd8').replace('ÿ', '\xff') || body[0] === 0xff, 'JPEG magic bytes')
  console.log(`  ✓ ${route.path} → 200, ${body.length} bytes, ${headers['content-type']}`)
}

console.log('\nAll smoke tests passed.')
