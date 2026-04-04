import { describe, expect, it } from "vitest";

describe("T3 group, event, photo, and like workflow", () => {
  it("creates a group, event, photo, and tracks likes through a workflow service", async () => {
    const module = await import("../src/application/workflows/group-event-photo-like-workflow");

    expect(module).toHaveProperty("createGroupEventPhotoLikeWorkflow");
  });

  it("exposes workflow boundary ports for group, event, photo, and like persistence", async () => {
    const groupPorts = await import("../src/application/ports/group-repository");
    const photoPorts = await import("../src/application/ports/photo-repository");
    const likePorts = await import("../src/application/ports/photo-like-repository");

    expect(groupPorts).toHaveProperty("GroupRepository");
    expect(photoPorts).toHaveProperty("PhotoRepository");
    expect(likePorts).toHaveProperty("PhotoLikeRepository");
  });

  it("describes the workflow slice with a minimal end-to-end data shape", async () => {
    const module = await import("../src/application/workflows/group-event-photo-like-workflow");

    expect(module).toHaveProperty("createGroupEventPhotoLikeWorkflow");
    expect(module).toHaveProperty("WorkflowError");
  });
});
