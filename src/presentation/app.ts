import fastify, { type FastifyInstance } from "fastify";

import { getPrototypeWorkspaceSnapshot } from "../application/prototype-workspace-snapshot";
import type {
  PrototypeSweetBookEstimateRunner,
  PrototypeSweetBookSubmitRunner,
} from "../application/prototype-sweetbook-estimate";

export interface BuildAppOptions {
  prototypeSweetBookEstimateRunner?: PrototypeSweetBookEstimateRunner;
  prototypeSweetBookSubmitRunner?: PrototypeSweetBookSubmitRunner;
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

  app.post("/api/prototype/sweetbook/submit", async (_, reply) => {
    if (!options.prototypeSweetBookSubmitRunner) {
      return reply.code(503).send({
        message: "SweetBook prototype submit runner is not configured",
      });
    }

    const result = await options.prototypeSweetBookSubmitRunner();
    return reply.code(200).send(result);
  });

  return app;
}
