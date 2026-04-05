import { describe, expect, it, vi } from "vitest";

import { createSweetBookReadApiClient } from "../src/data/sweetbook-read-api-client";

describe("SweetBook read api client", () => {
  it("requests book specs with bearer auth and parses the envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: [
          {
            bookSpecUid: "SQUAREBOOK_HC",
            name: "Square Book Hardcover",
            pageMin: 24,
            pageMax: 130,
            pageIncrement: 2,
            sandboxPriceBase: 100,
            sandboxPricePerIncrement: 10,
          },
        ],
      }),
    });

    const client = createSweetBookReadApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const specs = await client.listBookSpecs();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/book-specs",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
    expect(specs[0]?.bookSpecUid).toBe("SQUAREBOOK_HC");
  });

  it("requests templates with query filters and maps pagination", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: {
          templates: [
            {
              templateUid: "tmpl-1",
              templateName: "Cover Layout",
              templateKind: "cover",
              category: "baby",
              theme: "warm",
              bookSpecUid: "SQUAREBOOK_HC",
              isPublic: true,
              status: "active",
            },
          ],
          pagination: {
            total: 1,
            limit: 5,
            offset: 0,
            hasNext: false,
          },
        },
      }),
    });

    const client = createSweetBookReadApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.listTemplates({
      bookSpecUid: "SQUAREBOOK_HC",
      limit: 5,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/templates?bookSpecUid=SQUAREBOOK_HC&limit=5",
      expect.any(Object),
    );
    expect(result.templates[0]?.templateUid).toBe("tmpl-1");
    expect(result.pagination.total).toBe(1);
  });

  it("throws when SweetBook returns an unsuccessful envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: "Insufficient Credit",
        data: null,
        errors: ["Credit 부족"],
      }),
    });

    const client = createSweetBookReadApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    await expect(client.getCredits()).rejects.toThrow("Insufficient Credit");
  });
});
