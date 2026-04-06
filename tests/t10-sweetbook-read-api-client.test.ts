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

  it("lists uploaded book photos from the diagnostic endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: {
          photos: [
            {
              fileName: "photo-1.jpg",
              originalName: "family.jpg",
              mimeType: "image/jpeg",
              width: 1200,
              height: 900,
              createdAt: "2026-04-06T00:00:00.000Z",
            },
          ],
          totalCount: 1,
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

    const result = await client.listBookPhotos("book-123");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books/book-123/photos",
      expect.any(Object),
    );
    expect(result.totalCount).toBe(1);
    expect(result.photos[0]?.fileName).toBe("photo-1.jpg");
  });

  it("lists books for page-count diagnostics", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: {
          books: [
            {
              bookUid: "book-123",
              title: "Probe Book",
              bookSpecUid: "SQUAREBOOK_HC",
              status: "draft",
              pageCount: 24,
            },
          ],
          total: 1,
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

    const result = await client.listBooks({ limit: 5 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books?limit=5",
      expect.any(Object),
    );
    expect(result.total).toBe(1);
    expect(result.books[0]?.pageCount).toBe(24);
    expect(result.books[0]?.status).toBe("draft");
  });
});
