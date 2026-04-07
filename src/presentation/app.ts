import multipart from "@fastify/multipart";
import fastify, { type FastifyInstance } from "fastify";

import { createPrototypeAuthService } from "../application/auth/prototype-auth-service";
import type { PrototypeAuthSessionStore } from "../application/auth/prototype-auth-session-store";
import {
  getPrototypeWorkspaceSnapshot,
  type PrototypeWorkspaceSnapshot,
} from "../application/prototype-workspace-snapshot";
import type {
  PrototypeSweetBookEstimateRunner,
  PrototypeSweetBookSubmitRunner,
} from "../application/prototype-sweetbook-estimate";

export interface BuildAppOptions {
  prototypeAuthSessionStore?: PrototypeAuthSessionStore;
  prototypeGroupInviteCreator?: (input: { groupId: string; userId: string }) => Promise<void>;
  prototypeGroupInvitationAcceptor?: (input: { invitationId: string; userId: string }) => Promise<void>;
  prototypeGroupInvitationDecliner?: (input: { invitationId: string; userId: string }) => Promise<void>;
  prototypeGroupLeaveAction?: (input: { groupId: string; userId: string }) => Promise<void>;
  prototypeOwnerTransfer?: (input: {
    groupId: string;
    nextOwnerUserId: string;
  }) => Promise<void>;
  prototypeUserSearch?: (input: {
    query: string;
  }) => Promise<Array<{ userId: string; username: string; displayName: string }>>;
  prototypeEventCreator?: (input: {
    groupId: string;
    title: string;
    description: string;
    votingStartsAt: string;
    votingEndsAt: string;
  }) => Promise<void>;
  prototypeEventVotingCloser?: (input: { eventId: string }) => Promise<void>;
  prototypeEventVotingExtender?: (input: {
    eventId: string;
    votingEndsAt: string;
  }) => Promise<void>;
  prototypeEventOwnerApprovalUpdater?: (input: {
    eventId: string;
    ownerApproved: boolean;
  }) => Promise<void>;
  prototypeGroupCreator?: (input: { name: string }) => Promise<void>;
  prototypePhotoCreator?: (input: { eventId: string; caption: string }) => Promise<void>;
  prototypePhotoUploader?: (input: {
    eventId: string;
    caption: string;
    originalFileName: string;
    mediaType: string;
    fileBytes: Uint8Array;
  }) => Promise<void>;
  prototypePhotoAssetLoader?: (
    photoId: string,
  ) => Promise<{ body: Uint8Array; mediaType: string } | null>;
  prototypePhotoLikeAdder?: (input: { photoId: string; userId: string }) => Promise<void>;
  prototypeWorkspaceSnapshotLoader?: () => Promise<PrototypeWorkspaceSnapshot>;
  prototypeSweetBookEstimateRunner?: PrototypeSweetBookEstimateRunner;
  prototypeSweetBookSubmitRunner?: PrototypeSweetBookSubmitRunner;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = fastify({ logger: false });
  await app.register(multipart);
  const authService = createPrototypeAuthService(options.prototypeAuthSessionStore);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.post("/api/prototype/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as {
      username?: string;
      password?: string;
    };

    try {
      const session = await authService.login({
        username: body.username ?? "",
        password: body.password ?? "",
      });

      return reply.code(200).send(session);
    } catch {
      return reply.code(401).send({
        message: "Invalid prototype credentials",
      });
    }
  });

  app.get("/api/prototype/auth/session", async (request, reply) => {
    const query = request.query as {
      token?: string;
    };

    if (!query.token) {
      return reply.code(401).send({
        message: "Prototype auth token is required",
      });
    }

    const session = await authService.getSession(query.token);

    if (!session) {
      return reply.code(401).send({
        message: "Prototype auth session was not found",
      });
    }

    return reply.code(200).send(session);
  });

  app.post("/api/prototype/auth/logout", async (request, reply) => {
    const body = (request.body ?? {}) as {
      token?: string;
    };

    if (body.token) {
      await authService.logout(body.token);
    }

    return reply.code(204).send();
  });

  app.post("/api/prototype/account/password", async (request, reply) => {
    const body = (request.body ?? {}) as {
      currentPassword?: string;
      nextPassword?: string;
    };

    if ((body.currentPassword ?? "") !== "sweetbook123!") {
      return reply.code(400).send({
        message: "Current prototype password is incorrect",
      });
    }

    if ((body.nextPassword ?? "").trim().length < 8) {
      return reply.code(400).send({
        message: "Next prototype password must be at least 8 characters",
      });
    }

    return reply.code(204).send();
  });

  app.get("/api/prototype/workspace", async () => {
    if (options.prototypeWorkspaceSnapshotLoader) {
      return options.prototypeWorkspaceSnapshotLoader();
    }

    return getPrototypeWorkspaceSnapshot();
  });

  app.get("/api/prototype/users/search", async (request, reply) => {
    if (!options.prototypeUserSearch) {
      return reply.code(503).send({
        message: "Prototype user search is not configured",
      });
    }

    const query = request.query as {
      q?: string;
    };

    return reply.code(200).send(
      await options.prototypeUserSearch({
        query: query.q ?? "",
      }),
    );
  });

  app.post("/api/prototype/groups", async (request, reply) => {
    if (!options.prototypeGroupCreator) {
      return reply.code(503).send({
        message: "Prototype group creator is not configured",
      });
    }

    const body = (request.body ?? {}) as {
      name?: string;
    };

    try {
      await options.prototypeGroupCreator({
        name: body.name ?? "",
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events", async (request, reply) => {
    if (!options.prototypeEventCreator) {
      return reply.code(503).send({
        message: "Prototype event creator is not configured",
      });
    }

    const body = (request.body ?? {}) as {
      groupId?: string;
      title?: string;
      description?: string;
      votingStartsAt?: string;
      votingEndsAt?: string;
    };

    try {
      await options.prototypeEventCreator({
        groupId: body.groupId ?? "",
        title: body.title ?? "",
        description: body.description ?? "",
        votingStartsAt: body.votingStartsAt ?? "",
        votingEndsAt: body.votingEndsAt ?? "",
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/groups/:groupId/invitations", async (request, reply) => {
    if (!options.prototypeGroupInviteCreator) {
      return reply.code(503).send({
        message: "Prototype group invite creator is not configured",
      });
    }

    const params = request.params as { groupId?: string };
    const body = (request.body ?? {}) as { userId?: string };

    try {
      await options.prototypeGroupInviteCreator({
        groupId: params.groupId ?? "",
        userId: body.userId ?? "",
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/invitations/:invitationId/accept", async (request, reply) => {
    if (!options.prototypeGroupInvitationAcceptor) {
      return reply.code(503).send({
        message: "Prototype invitation acceptor is not configured",
      });
    }

    const params = request.params as { invitationId?: string };
    const body = (request.body ?? {}) as { userId?: string };

    try {
      await options.prototypeGroupInvitationAcceptor({
        invitationId: params.invitationId ?? "",
        userId: body.userId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/invitations/:invitationId/decline", async (request, reply) => {
    if (!options.prototypeGroupInvitationDecliner) {
      return reply.code(503).send({
        message: "Prototype invitation decliner is not configured",
      });
    }

    const params = request.params as { invitationId?: string };
    const body = (request.body ?? {}) as { userId?: string };

    try {
      await options.prototypeGroupInvitationDecliner({
        invitationId: params.invitationId ?? "",
        userId: body.userId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/groups/:groupId/owner", async (request, reply) => {
    if (!options.prototypeOwnerTransfer) {
      return reply.code(503).send({
        message: "Prototype owner transfer is not configured",
      });
    }

    const params = request.params as { groupId?: string };
    const body = (request.body ?? {}) as { nextOwnerUserId?: string };

    try {
      await options.prototypeOwnerTransfer({
        groupId: params.groupId ?? "",
        nextOwnerUserId: body.nextOwnerUserId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/groups/:groupId/leave", async (request, reply) => {
    if (!options.prototypeGroupLeaveAction) {
      return reply.code(503).send({
        message: "Prototype leave action is not configured",
      });
    }

    const params = request.params as { groupId?: string };
    const body = (request.body ?? {}) as { userId?: string };

    try {
      await options.prototypeGroupLeaveAction({
        groupId: params.groupId ?? "",
        userId: body.userId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/close-voting", async (request, reply) => {
    if (!options.prototypeEventVotingCloser) {
      return reply.code(503).send({
        message: "Prototype event voting closer is not configured",
      });
    }

    const params = request.params as {
      eventId?: string;
    };

    try {
      await options.prototypeEventVotingCloser({
        eventId: params.eventId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/extend-voting", async (request, reply) => {
    if (!options.prototypeEventVotingExtender) {
      return reply.code(503).send({
        message: "Prototype event voting extender is not configured",
      });
    }

    const params = request.params as {
      eventId?: string;
    };
    const body = (request.body ?? {}) as {
      votingEndsAt?: string;
    };

    try {
      await options.prototypeEventVotingExtender({
        eventId: params.eventId ?? "",
        votingEndsAt: body.votingEndsAt ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/owner-approval", async (request, reply) => {
    if (!options.prototypeEventOwnerApprovalUpdater) {
      return reply.code(503).send({
        message: "Prototype event owner approval updater is not configured",
      });
    }

    const params = request.params as {
      eventId?: string;
    };
    const body = (request.body ?? {}) as {
      ownerApproved?: boolean;
    };

    try {
      await options.prototypeEventOwnerApprovalUpdater({
        eventId: params.eventId ?? "",
        ownerApproved: Boolean(body.ownerApproved),
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/photos", async (request, reply) => {
    if (!options.prototypePhotoCreator) {
      return reply.code(503).send({
        message: "Prototype photo creator is not configured",
      });
    }

    const body = (request.body ?? {}) as {
      eventId?: string;
      caption?: string;
    };

    try {
      await options.prototypePhotoCreator({
        eventId: body.eventId ?? "",
        caption: body.caption ?? "",
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/photo-uploads", async (request, reply) => {
    if (!options.prototypePhotoUploader) {
      return reply.code(503).send({
        message: "Prototype photo uploader is not configured",
      });
    }

    try {
      const file = await request.file();
      const eventId = `${file?.fields.eventId?.value ?? ""}`;
      const caption = `${file?.fields.caption?.value ?? ""}`;

      if (!file) {
        throw new Error("Prototype photo file is required");
      }

      await options.prototypePhotoUploader({
        eventId,
        caption,
        originalFileName: file.filename,
        mediaType: file.mimetype,
        fileBytes: await file.toBuffer(),
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/prototype/photos/:photoId/asset", async (request, reply) => {
    if (!options.prototypePhotoAssetLoader) {
      return reply.code(404).send({
        message: "Prototype photo asset was not found",
      });
    }

    const params = request.params as {
      photoId?: string;
    };
    const asset = await options.prototypePhotoAssetLoader(params.photoId ?? "");

    if (!asset) {
      return reply.code(404).send({
        message: "Prototype photo asset was not found",
      });
    }

    return reply.type(asset.mediaType).send(asset.body);
  });

  app.post("/api/prototype/photos/:photoId/likes", async (request, reply) => {
    if (!options.prototypePhotoLikeAdder) {
      return reply.code(503).send({
        message: "Prototype photo like adder is not configured",
      });
    }

    const params = request.params as {
      photoId?: string;
    };
    const body = (request.body ?? {}) as {
      userId?: string;
    };

    try {
      await options.prototypePhotoLikeAdder({
        photoId: params.photoId ?? "",
        userId: body.userId ?? "",
      });
      return reply.code(201).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/sweetbook/estimate", async (request, reply) => {
    if (!options.prototypeSweetBookEstimateRunner) {
      return reply.code(503).send({
        message: "SweetBook prototype estimate runner is not configured",
      });
    }

    const body = (request.body ?? {}) as {
      eventId?: string;
    };
    const result = await options.prototypeSweetBookEstimateRunner({
      eventId: body.eventId,
    });
    return reply.code(200).send(result);
  });

  app.post("/api/prototype/sweetbook/submit", async (request, reply) => {
    if (!options.prototypeSweetBookSubmitRunner) {
      return reply.code(503).send({
        message: "SweetBook prototype submit runner is not configured",
      });
    }

    const body = (request.body ?? {}) as {
      eventId?: string;
    };
    const result = await options.prototypeSweetBookSubmitRunner({
      eventId: body.eventId,
    });
    return reply.code(200).send(result);
  });

  return app;
}
