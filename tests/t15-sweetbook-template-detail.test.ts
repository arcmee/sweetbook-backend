import { describe, expect, it, vi } from "vitest";

import { createSweetBookReadApiClient } from "../src/data/sweetbook-read-api-client";

describe("SweetBook template detail client", () => {
  it("loads template detail and exposes parameter definitions", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Success",
        data: {
          templateUid: "4MY2fokVjkeY",
          templateName: "Probe Cover",
          templateKind: "cover",
          bookSpecUid: "SQUAREBOOK_HC",
          parameters: {
            definitions: {
              frontPhoto: {
                binding: "file",
                type: "string",
                required: true,
              },
              spineTitle: {
                binding: "text",
                type: "string",
                required: true,
              },
            },
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

    const template = await client.getTemplateDetail("4MY2fokVjkeY");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/templates/4MY2fokVjkeY",
      expect.any(Object),
    );
    expect(template.parameters?.definitions?.frontPhoto?.binding).toBe("file");
  });
});
