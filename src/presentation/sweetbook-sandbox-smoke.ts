import { resolveSweetBookApiConfig } from "../data/sweetbook-api-config";
import { createSweetBookReadApiClient } from "../data/sweetbook-read-api-client";

async function main(): Promise<void> {
  const config = resolveSweetBookApiConfig();
  const client = createSweetBookReadApiClient(config);

  const [bookSpecs, templates, credits] = await Promise.all([
    client.listBookSpecs(),
    client.listTemplates({ limit: 3 }),
    client.getCredits(),
  ]);

  console.log(
    JSON.stringify(
      {
        environment: config.environment,
        baseUrl: config.baseUrl,
        bookSpecs: {
          count: bookSpecs.length,
          first: bookSpecs[0]?.bookSpecUid ?? null,
        },
        templates: {
          count: templates.templates.length,
          total: templates.pagination.total,
          first: templates.templates[0]?.templateUid ?? null,
        },
        credits: {
          accountUid: credits.accountUid,
          balance: credits.balance,
          currency: credits.currency,
          env: credits.env ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
