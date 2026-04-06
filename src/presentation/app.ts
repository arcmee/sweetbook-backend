import fastify, { type FastifyInstance } from "fastify";

import { getPrototypeWorkspaceSnapshot } from "../application/prototype-workspace-snapshot";
import type { PrototypeSweetBookEstimateRunner } from "../application/prototype-sweetbook-estimate";

export interface BuildAppOptions {
  prototypeSweetBookEstimateRunner?: PrototypeSweetBookEstimateRunner;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/prototype/workspace", async () => {
    return getPrototypeWorkspaceSnapshot();
  });

  app.post("/api/prototype/sweetbook/estimate", async (_, reply) => {
    if (!options.prototypeSweetBookEstimateRunner) {
      return reply.code(503).send({
        message: "SweetBook prototype estimate runner is not configured",
      });
    }

    const result = await options.prototypeSweetBookEstimateRunner();
    return reply.code(200).send(result);
  });

  return app;
}
