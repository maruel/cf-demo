# cf-demo

Cloudflare Workers project with Durable Objects and static assets.

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

```sh
pnpm run deploy
```

## Generate Types

After changing bindings in `wrangler.jsonc`:

```sh
pnpm cf-typegen
```

## Links

- Live: https://demo.caic.xyz
- Admin: https://dash.cloudflare.com/?to=/:account/workers/services/view/cf-demo
