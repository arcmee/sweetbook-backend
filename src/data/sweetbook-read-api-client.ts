import type {
  SweetBookBookSpec,
  SweetBookCreditsBalance,
  SweetBookReadClient,
  SweetBookTemplateListOptions,
  SweetBookTemplateListResult,
  SweetBookTemplatePagination,
  SweetBookTemplateSummary,
} from "../application/ports/sweetbook-read-client";
import type { SweetBookApiConfig } from "./sweetbook-api-config";

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
};

type TemplateListEnvelopeData = {
  templates: SweetBookTemplateSummary[];
  pagination: SweetBookTemplatePagination;
};

export function createSweetBookReadApiClient(
  config: SweetBookApiConfig,
  fetchImpl: typeof fetch = fetch,
): SweetBookReadClient {
  return {
    async listBookSpecs(): Promise<SweetBookBookSpec[]> {
      const payload = await request<Envelope<SweetBookBookSpec[]>>(
        config,
        "/book-specs",
        fetchImpl,
      );

      return payload.data;
    },

    async listTemplates(
      options: SweetBookTemplateListOptions = {},
    ): Promise<SweetBookTemplateListResult> {
      const searchParams = new URLSearchParams();

      if (options.bookSpecUid) {
        searchParams.set("bookSpecUid", options.bookSpecUid);
      }

      if (typeof options.limit === "number") {
        searchParams.set("limit", `${options.limit}`);
      }

      if (typeof options.offset === "number") {
        searchParams.set("offset", `${options.offset}`);
      }

      if (options.templateKind) {
        searchParams.set("templateKind", options.templateKind);
      }

      const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      const payload = await request<Envelope<TemplateListEnvelopeData>>(
        config,
        `/templates${suffix}`,
        fetchImpl,
      );

      return payload.data;
    },

    async getCredits(): Promise<SweetBookCreditsBalance> {
      const payload = await request<Envelope<SweetBookCreditsBalance>>(
        config,
        "/credits",
        fetchImpl,
      );

      return payload.data;
    },
  };
}

async function request<T>(
  config: SweetBookApiConfig,
  path: string,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await fetchImpl(`${config.baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SweetBook request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Envelope<unknown>;

  if (!payload.success) {
    const detail = payload.errors?.join(", ");
    throw new Error(detail ? `${payload.message}: ${detail}` : payload.message);
  }

  return payload as T;
}
