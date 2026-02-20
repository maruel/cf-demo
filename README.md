# cf-demo

Real-time chat app on Cloudflare Workers with Durable Objects.

Messages are pushed to all connected clients over WebSocket (Durable Object Hibernation API). New posts go through `POST /api/messages`; the DO broadcasts the updated message list to every open socket.

## Architecture

- **Worker** (`src/index.ts`) — routes HTTP and WebSocket upgrade requests to the DO
- **Durable Object** (`MyDurableObject`) — owns the SQLite message table, accepts WebSocket connections via `ctx.acceptWebSocket()`, broadcasts on insert
- **Client** (`public/index.html`) — single-page app, connects to `/api/ws`, reconnects with exponential backoff

### Wire protocol (server → client)

```
{ type: "version",  version: string }   // sent on connect; client reloads if version changes
{ type: "messages", data: Message[] }    // full message list; sent on connect and after each insert
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- A Cloudflare account (for deployment)

## Setup

```sh
pnpm install
```

## Local Development

```sh
pnpm dev
```

## Deploy

### Manual

```sh
pnpm run deploy
```

### Workers Builds (dashboard git integration)

In **Workers > Settings > Builds > Build configuration**:

| Field | Value |
|-------|-------|
| Build command | *(leave empty)* |
| Deploy command | `pnpm run deploy` |
| Non-production branch deploy command | `pnpm run upload` |
| Root directory | `/` |

`BUILD_VERSION` is set automatically to the short git SHA via the `deploy` script in `package.json`. Non-production branches upload a version without promoting it to the default.

## Generate Types

After changing bindings in `wrangler.jsonc`:

```sh
pnpm cf-typegen
```

## Links

- Live: https://demo.caic.xyz
- Admin: https://dash.cloudflare.com/?to=/:account/workers/services/view/cf-demo
