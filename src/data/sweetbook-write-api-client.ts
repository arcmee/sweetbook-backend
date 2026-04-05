import type {
  CreateSweetBookBookInput,
  FinalizeSweetBookBookInput,
  EstimateSweetBookOrderInput,
  SubmitSweetBookOrderInput,
  SweetBookBookCreationResult,
  SweetBookClient,
  SweetBookContentsUploadResult,
  SweetBookCoverUploadResult,
  SweetBookFinalizeResult,
  SweetBookOrderEstimateResult,
  SweetBookOrderResult,
  SweetBookPhotoUploadResult,
  UploadSweetBookContentsInput,
  UploadSweetBookCoverInput,
  UploadSweetBookPhotoInput,
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

    async uploadCover(
      input: UploadSweetBookCoverInput,
    ): Promise<SweetBookCoverUploadResult> {
      const formData = new FormData();

      formData.set("templateUid", input.templateUid);
      formData.set("parameters", JSON.stringify(input.parameters));
      formData.set(
        "frontPhoto",
        new File([input.frontPhoto.bytes], input.frontPhoto.fileName, {
          type: input.frontPhoto.contentType,
        }),
      );

      if (input.backPhoto) {
        formData.set(
          "backPhoto",
          new File([input.backPhoto.bytes], input.backPhoto.fileName, {
            type: input.backPhoto.contentType,
          }),
        );
      }

      return multipartRequest<Envelope<SweetBookCoverUploadResult>>(
        config,
        `/books/${input.bookUid}/cover`,
        formData,
        fetchImpl,
      ).then((payload) => payload.data);
    },

    async uploadPhoto(
      input: UploadSweetBookPhotoInput,
    ): Promise<SweetBookPhotoUploadResult> {
      const formData = new FormData();

      formData.set(
        "file",
        new File([input.file.bytes], input.file.fileName, {
          type: input.file.contentType,
        }),
      );

      return multipartRequest<Envelope<SweetBookPhotoUploadResult>>(
        config,
        `/books/${input.bookUid}/photos`,
        formData,
        fetchImpl,
      ).then((payload) => payload.data);
    },

    async uploadContents(
      input: UploadSweetBookContentsInput,
    ): Promise<SweetBookContentsUploadResult> {
      const formData = new FormData();

      formData.set("templateUid", input.templateUid);
      formData.set("parameters", JSON.stringify(input.parameters));

      for (const [fieldName, part] of Object.entries(input.fileParts ?? {})) {
        formData.set(
          fieldName,
          new File([part.bytes], part.fileName, {
            type: part.contentType,
          }),
        );
      }

      const query = input.breakBefore ? `?breakBefore=${input.breakBefore}` : "";

      return multipartRequest<Envelope<SweetBookContentsUploadResult>>(
        config,
        `/books/${input.bookUid}/contents${query}`,
        formData,
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

async function multipartRequest<T>(
  config: SweetBookApiConfig,
  path: string,
  body: FormData,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await fetchImpl(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    body,
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
