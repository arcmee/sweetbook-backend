import { createPrototypeSweetBookEstimateRunner } from "../application/prototype-sweetbook-estimate";
import { loadLocalEnv } from "../data/local-env-loader";
import { resolveSweetBookApiConfig } from "../data/sweetbook-api-config";
import { createSweetBookReadApiClient } from "../data/sweetbook-read-api-client";
import { createSweetBookWriteApiClient } from "../data/sweetbook-write-api-client";
import { buildApp } from "./app";

const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  loadLocalEnv();

  const prototypeSweetBookEstimateRunner = createConfiguredEstimateRunner();
  const app = await buildApp({
    prototypeSweetBookEstimateRunner,
  });
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}

function createConfiguredEstimateRunner() {
  if (!process.env.SWEETBOOK_API_KEY) {
    return undefined;
  }

  const config = resolveSweetBookApiConfig(process.env);
  const readClient = createSweetBookReadApiClient(config);
  const writeClient = createSweetBookWriteApiClient(config);

  return createPrototypeSweetBookEstimateRunner({
    readClient,
    writeClient,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
