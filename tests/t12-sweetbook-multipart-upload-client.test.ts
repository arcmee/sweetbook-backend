import { Blob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";

import { createSweetBookWriteApiClient } from "../src/data/sweetbook-write-api-client";

describe("SweetBook multipart upload client", () => {
  it("uploads a cover with templateUid and parameters JSON string", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Cover created successfully",
        data: {
          result: "inserted",
        },
      }),
    });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.uploadCover({
      bookUid: "bk_123",
      templateUid: "tmpl-cover",
      parameters: {
        title: "SweetBook Prototype",
      },
      frontPhoto: {
        fileName: "front.jpg",
        contentType: "image/jpeg",
        bytes: new Blob(["front"]),
      },
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books/bk_123/cover",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(formData.get("templateUid")).toBe("tmpl-cover");
    expect(formData.get("parameters")).toBe('{"title":"SweetBook Prototype"}');
    expect(result.result).toBe("inserted");
  });

  it("uploads photos with the file field expected by SweetBook", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: {
          fileName: "photo-1.jpg",
          originalName: "family.jpg",
          size: 12,
          mimeType: "image/jpeg",
          uploadedAt: "2026-04-06T00:00:00.000Z",
          isDuplicate: false,
          hash: "hash-1",
        },
      }),
    });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.uploadPhoto({
      bookUid: "bk_123",
      file: {
        fileName: "family.jpg",
        contentType: "image/jpeg",
        bytes: new Blob(["family"]),
      },
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;

    expect(formData.get("file")).toBeInstanceOf(File);
    expect(result.fileName).toBe("photo-1.jpg");
  });

  it("uploads contents with breakBefore and dynamic file parts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Content created successfully",
        data: {
          result: "inserted",
          breakBefore: "page",
          pageNum: 1,
          pageSide: "right",
          pageCount: 0,
        },
      }),
    });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.uploadContents({
      bookUid: "bk_123",
      templateUid: "tmpl-content",
      breakBefore: "page",
      parameters: {
        childName: "Mina",
      },
      fileParts: {
        coverPhoto: {
          fileName: "cover.jpg",
          contentType: "image/jpeg",
          bytes: new Blob(["cover"]),
        },
      },
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books/bk_123/contents?breakBefore=page",
      expect.any(Object),
    );
    expect(formData.get("templateUid")).toBe("tmpl-content");
    expect(formData.get("parameters")).toBe('{"childName":"Mina"}');
    expect(formData.get("coverPhoto")).toBeInstanceOf(File);
    expect(result.pageSide).toBe("right");
  });
});
