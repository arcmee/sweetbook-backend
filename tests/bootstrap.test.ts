import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("backend bootstrap baseline", () => {
  it("keeps the clean architecture folders in place", () => {
    const root = resolve(process.cwd());

    expect(existsSync(resolve(root, "src", "presentation"))).toBe(true);
    expect(existsSync(resolve(root, "src", "domain"))).toBe(true);
    expect(existsSync(resolve(root, "src", "data"))).toBe(true);
  });

  it("exports an app bootstrap entrypoint", async () => {
    const module = await import("../src/presentation/app");

    expect(module).toHaveProperty("buildApp");
  });

  it("exposes a health route on the bootstrapped app", async () => {
    const module = await import("../src/presentation/app");
    const app = await module.buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
  });
});
