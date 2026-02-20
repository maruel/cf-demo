import { DurableObject } from "cloudflare:workers";

// Set at build time by wrangler's `define` config; falls back for local dev.
declare const BUILD_VERSION: string;

type Message = {
	id: number;
	author: string;
	body: string;
	created_at: string;
};

type WsServerMessage =
	| { type: "version"; version: string }
	| { type: "messages"; data: Message[] };

export class MyDurableObject extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS messages (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				author TEXT NOT NULL,
				body TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);
	}

	async getMessages(): Promise<Message[]> {
		return this.ctx.storage.sql
			.exec<Message>("SELECT id, author, body, created_at FROM messages ORDER BY id DESC LIMIT 50")
			.toArray()
			.reverse();
	}

	async postMessage(author: string, body: string): Promise<Message[]> {
		this.ctx.storage.sql.exec(
			"INSERT INTO messages (author, body) VALUES (?, ?)",
			author,
			body,
		);
		const messages = await this.getMessages();
		this.broadcast({ type: "messages", data: messages });
		return messages;
	}

	async fetch(request: Request): Promise<Response> {
		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader !== "websocket") {
			return new Response("Expected WebSocket upgrade", { status: 426 });
		}

		const pair = new WebSocketPair();
		this.ctx.acceptWebSocket(pair[1]);

		const versionMsg: WsServerMessage = { type: "version", version: BUILD_VERSION };
		pair[1].send(JSON.stringify(versionMsg));

		const messages = await this.getMessages();
		const messagesMsg: WsServerMessage = { type: "messages", data: messages };
		pair[1].send(JSON.stringify(messagesMsg));

		return new Response(null, { status: 101, webSocket: pair[0] });
	}

	private broadcast(msg: WsServerMessage): void {
		const payload = JSON.stringify(msg);
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.send(payload);
			} catch (_) {
				// Socket already closed; hibernation API will clean it up.
			}
		}
	}

	webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
		// Server-push only; ignore client messages.
	}

	webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
		ws.close();
	}

	webSocketError(ws: WebSocket, _error: unknown): void {
		ws.close();
	}
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/version") {
			return Response.json({ version: BUILD_VERSION });
		}

		if (url.pathname === "/api/ws") {
			const stub = env.MY_DURABLE_OBJECT.getByName("chat");
			return stub.fetch(request);
		}

		if (url.pathname === "/api/messages") {
			const stub = env.MY_DURABLE_OBJECT.getByName("chat");

			if (request.method === "GET") {
				const messages = await stub.getMessages();
				return Response.json(messages);
			}

			if (request.method === "POST") {
				const { author, body } = await request.json<{ author: string; body: string }>();
				if (!author || !body) {
					return Response.json({ error: "author and body required" }, { status: 400 });
				}
				const messages = await stub.postMessage(author.slice(0, 64), body.slice(0, 1000));
				return Response.json(messages);
			}

			return new Response("Method not allowed", { status: 405 });
		}

		// Fall through to static assets (configured in wrangler.jsonc)
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
