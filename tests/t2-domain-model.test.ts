import { describe, expect, it } from "vitest";

describe("T2 core domain model and ports", () => {
  it("exposes a Group domain module with basic invariants", async () => {
    const module = await import("../src/domain/group");

    expect(module).toHaveProperty("Group");
    expect(module).toHaveProperty("createGroup");
  });

  it("exposes an Event domain module tied to a group", async () => {
    const module = await import("../src/domain/event");

    expect(module).toHaveProperty("Event");
    expect(module).toHaveProperty("createEvent");
  });

  it("defines application ports for repositories used by later tasks", async () => {
    const groupPorts = await import("../src/application/ports/group-repository");
    const photoPorts = await import("../src/application/ports/photo-like-repository");

    expect(groupPorts).toHaveProperty("GroupRepository");
    expect(photoPorts).toHaveProperty("PhotoLikeRepository");
  });
});
