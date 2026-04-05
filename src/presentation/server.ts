import { buildApp } from "./app";

const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  const app = await buildApp();
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
