/**
 * dsh-theme-keyshub — node half.
 *
 * Mounts as an ordinary host loader row in the deployment composition. Its one
 * job is serving the three wallpaper images over the deployment's own HTTP
 * carrier (`webServer`) so the browser theme can reference same-origin URLs.
 * The browser half ships through exports["./client"] (see src/client/index.js).
 *
 * The row is a hard injection of `webServer` (same as the client-modules node
 * half): without it the fiber parks until the carrier exists — a bare
 * ctx.get() at apply time races boot order and silently registers nothing.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** Package-root assets directory (lib/../assets). */
const ASSETS_DIR = fileURLToPath(new URL('../assets/', import.meta.url))

/** Route table: URL path → asset file. Keep in sync with src/client/index.js WALLPAPER URLs. */
const ROUTES = [
  { path: '/dsh-theme-keyshub/nexus.jpg', file: 'image_nexus.jpg', contentType: 'image/jpeg' },
  { path: '/dsh-theme-keyshub/comiket.jpg', file: 'image_comiket.jpg', contentType: 'image/jpeg' },
  { path: '/dsh-theme-keyshub/ironcore.jpg', file: 'image_ironcore.jpg', contentType: 'image/jpeg' },
]

/** Hard dependency: the browser HTTP carrier (the fiber waits for it). */
export const inject = ['webServer']

/** Host plugin body. */
export function apply(ctx) {
  const webServer = ctx.webServer
  for (const route of ROUTES) {
    const dispose = webServer.register({
      kind: 'exact',
      path: route.path,
      handler: async (req, res) => {
        try {
          const bytes = await readFile(ASSETS_DIR + route.file)
          res.writeHead(200, {
            'content-type': route.contentType,
            'content-length': String(bytes.length),
            'cache-control': 'public, max-age=86400',
          })
          res.end(bytes)
        } catch (err) {
          try {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('wallpaper not found')
          } catch (err2) {
            /* response already sent or connection gone */
          }
        }
      },
    })
    ctx.effect(() => dispose)
  }
}
