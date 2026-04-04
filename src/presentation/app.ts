import fastify, { type FastifyInstance } from "fastify";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
