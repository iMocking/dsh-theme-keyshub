/**
 * Assemble the published artifact:
 *   - lib/index.js  — node half (verbatim copy of src/index.js)
 *   - lib/client.js — browser bundle: src/client/index.js wrapped in the
 *                     __ModuleLoader__.load factory contract the DSH shell
 *                     kernel expects (classic script, factory-form CJS).
 *
 * Run: node scripts/build.mjs
 */
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)) + '/..'
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

await mkdir(join(root, 'lib'), { recursive: true })

// ── node half ─────────────────────────────────────────────────────────────
await copyFile(join(root, 'src/index.js'), join(root, 'lib/index.js'))

// ── browser bundle ────────────────────────────────────────────────────────
const src = await readFile(join(root, 'src/client/index.js'), 'utf8')
const bundle = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory: (require) => {
    "use strict";
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");
${src}
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
`
await writeFile(join(root, 'lib/client.js'), bundle)

console.log(`built lib/client.js (${bundle.length} bytes) and lib/index.js`)
