# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- https://developers.cloudflare.com/durable-objects/api/websockets/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Project Structure

- `src/index.ts` — Worker fetch handler + `MyDurableObject` (SQLite messages, WebSocket via Hibernation API)
- `public/index.html` — SPA client (WebSocket connect, exponential backoff reconnect)
- `wrangler.jsonc` — config, `define` sets compile-time `BUILD_VERSION`

### Key patterns

- **POST stays HTTP** — form submit → `POST /api/messages` → DO inserts + broadcasts to all WS clients
- **WebSocket is server-push only** — DO broadcasts `{type:"messages"}` and `{type:"version"}`, no client→server messages
- **Hibernation API** — `ctx.acceptWebSocket()` + `webSocketMessage/Close/Error` handlers; DO sleeps between events
- **Version detection** — first WS message is `{type:"version"}`; on reconnect client compares and reloads if changed

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Local development server |
| `pnpm run deploy` | Deploy to Cloudflare (sets `BUILD_VERSION` to git short SHA) |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm cf-typegen` | Generate TypeScript types from bindings |

Run `pnpm cf-typegen` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`
