import { DurableObject } from "cloudflare:workers";

type Message = {
	id: number;
	author: string;
	body: string;
	created_at: string;
};

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
		return this.getMessages();
	}
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);

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
