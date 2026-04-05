import fastify, { type FastifyInstance } from "fastify";

import { getPrototypeWorkspaceSnapshot } from "../application/prototype-workspace-snapshot";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/prototype/workspace", async () => {
    return getPrototypeWorkspaceSnapshot();
  });

  return app;
}
