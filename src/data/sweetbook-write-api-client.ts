import type {
  CreateSweetBookBookInput,
  FinalizeSweetBookBookInput,
  EstimateSweetBookOrderInput,
  SubmitSweetBookOrderInput,
  SweetBookBookCreationResult,
  SweetBookClient,
  SweetBookFinalizeResult,
  SweetBookOrderEstimateResult,
  SweetBookOrderResult,
} from "../application/ports/sweetbook-client";
import type { SweetBookApiConfig } from "./sweetbook-api-config";

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
};

export function createSweetBookWriteApiClient(
  config: SweetBookApiConfig,
  fetchImpl: typeof fetch = fetch,
): SweetBookClient {
  return {
    async createBook(
      input: CreateSweetBookBookInput,
    ): Promise<SweetBookBookCreationResult> {
      return request<Envelope<SweetBookBookCreationResult>>(
        config,
        "/books",
        {
          title: input.title,
          bookSpecUid: input.bookSpecUid,
          specProfileUid: input.specProfileUid,
          externalRef: input.externalRef,
        },
        fetchImpl,
        input.idempotencyKey,
      ).then((payload) => payload.data);
    },

    async finalizeBook(
      input: FinalizeSweetBookBookInput,
    ): Promise<SweetBookFinalizeResult> {
      return request<Envelope<SweetBookFinalizeResult>>(
        config,
        `/books/${input.bookUid}/finalization`,
        {},
        fetchImpl,
      ).then((payload) => payload.data);
    },

    async estimateOrder(
      input: EstimateSweetBookOrderInput,
    ): Promise<SweetBookOrderEstimateResult> {
      return request<Envelope<SweetBookOrderEstimateResult>>(
        config,
        "/orders/estimate",
        {
          bookUid: input.bookUid,
          quantity: input.quantity,
        },
        fetchImpl,
      ).then((payload) => payload.data);
    },

    async submitOrder(
      input: SubmitSweetBookOrderInput,
    ): Promise<SweetBookOrderResult> {
      return request<Envelope<SweetBookOrderResult>>(
        config,
        "/orders",
        {
          bookUid: input.bookUid,
          quantity: input.quantity,
        },
        fetchImpl,
        input.idempotencyKey,
      ).then((payload) => payload.data);
    },
  };
}

async function request<T>(
  config: SweetBookApiConfig,
  path: string,
  body: object,
  fetchImpl: typeof fetch,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetchImpl(`${config.baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(stripUndefined(body)),
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

function stripUndefined(body: object): object {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
