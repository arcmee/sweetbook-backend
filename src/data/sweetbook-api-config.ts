export type SweetBookEnvironment = "sandbox" | "live";

export interface SweetBookApiConfig {
  environment: SweetBookEnvironment;
  baseUrl: string;
  apiKey: string;
}

const SANDBOX_BASE_URL = "https://api-sandbox.sweetbook.com/v1";
const LIVE_BASE_URL = "https://api.sweetbook.com/v1";

export function resolveSweetBookApiConfig(
  env: NodeJS.ProcessEnv = process.env,
): SweetBookApiConfig {
  const environment = env.SWEETBOOK_ENV === "live" ? "live" : "sandbox";
  const apiKey = env.SWEETBOOK_API_KEY;

  if (!apiKey) {
    throw new Error("SWEETBOOK_API_KEY is required.");
  }

  return {
    environment,
    apiKey,
    baseUrl: environment === "live" ? LIVE_BASE_URL : SANDBOX_BASE_URL,
  };
}
