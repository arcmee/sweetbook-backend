import multipart from "@fastify/multipart";
import fastify, { type FastifyInstance } from "fastify";

import { createPrototypeAuthService } from "../application/auth/prototype-auth-service";
import type { PrototypeAuthUserStore } from "../application/auth/prototype-auth-user-store";
import {
  getPrototypeWorkspaceSnapshot,
  type PrototypeWorkspaceSnapshot,
} from "../application/prototype-workspace-snapshot";
import type {
  PrototypeSweetBookEstimateRunner,
  PrototypeSweetBookSubmitRunner,
} from "../application/prototype-sweetbook-estimate";

export interface BuildAppOptions {
  prototypeAuthUserStore?: PrototypeAuthUserStore;
  prototypeGroupInviteCreator?: (input: {
    groupId: string;
    userId: string;
    invitedByUserId: string;
  }) => Promise<void>;
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
  prototypeOrderSelectionUpdater?: (input: {
    eventId: string;
    selectedPhotoIds: string[];
  }) => Promise<void>;
  prototypeOrderCoverUpdater?: (input: {
    eventId: string;
    coverPhotoId: string;
  }) => Promise<void>;
  prototypeOrderPageLayoutUpdater?: (input: {
    eventId: string;
    pageId: string;
    layout: string;
  }) => Promise<void>;
  prototypeOrderPageNoteUpdater?: (input: {
    eventId: string;
    pageId: string;
    note: string;
  }) => Promise<void>;
  prototypeGroupCreator?: (input: { name: string; userId: string }) => Promise<void>;
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
  prototypeWorkspaceSnapshotLoader?: (input?: {
    viewerUserId?: string;
  }) => Promise<PrototypeWorkspaceSnapshot>;
  prototypeSweetBookEstimateRunner?: PrototypeSweetBookEstimateRunner;
  prototypeSweetBookSubmitRunner?: PrototypeSweetBookSubmitRunner;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = fastify({ logger: false });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  const authService = createPrototypeAuthService(options.prototypeAuthUserStore);
  const resolveBearerToken = (authorizationHeader?: string): string =>
    authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : "";
  const resolveRequestUserId = async (authorizationHeader?: string): Promise<string | null> => {
    const token = resolveBearerToken(authorizationHeader);
    if (!token) {
      return null;
    }
    const session = await authService.getSession(token);
    return session?.user.userId ?? null;
  };

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

  app.post("/api/prototype/auth/signup", async (request, reply) => {
    const body = (request.body ?? {}) as {
      displayName?: string;
      username?: string;
      password?: string;
    };

    try {
      const session = await authService.signup({
        displayName: body.displayName ?? "",
        username: body.username ?? "",
        password: body.password ?? "",
      });

      return reply.code(201).send(session);
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/prototype/auth/session", async (request, reply) => {
    const authorizationHeader = request.headers.authorization;
    const query = request.query as {
      token?: string;
    };
    const bearerToken = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : undefined;
    const token = bearerToken ?? query.token;

    if (!token) {
      return reply.code(401).send({
        message: "Prototype auth token is required",
      });
    }

    const session = await authService.getSession(token);

    if (!session) {
      return reply.code(401).send({
        message: "Prototype auth session was not found",
      });
    }

    return reply.code(200).send(session);
  });

  app.post("/api/prototype/auth/logout", async (request, reply) => {
    await authService.logout();

    return reply.code(204).send();
  });

  app.post("/api/prototype/account/password", async (request, reply) => {
    const authorizationHeader = request.headers.authorization;
    const body = (request.body ?? {}) as {
      currentPassword?: string;
      nextPassword?: string;
    };
    const token = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : "";

    try {
      await authService.changePassword({
        token,
        currentPassword: body.currentPassword ?? "",
        nextPassword: body.nextPassword ?? "",
      });
      return reply.code(204).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/prototype/workspace", async (request) => {
    if (options.prototypeWorkspaceSnapshotLoader) {
      const viewerUserId = await resolveRequestUserId(request.headers.authorization);
      return options.prototypeWorkspaceSnapshotLoader({
        viewerUserId: viewerUserId ?? undefined,
      });
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
    const viewerUserId = await resolveRequestUserId(request.headers.authorization);

    try {
      await options.prototypeGroupCreator({
        name: body.name ?? "",
        userId: viewerUserId ?? "user-demo",
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
    const viewerUserId = await resolveRequestUserId(request.headers.authorization);

    try {
      await options.prototypeGroupInviteCreator({
        groupId: params.groupId ?? "",
        userId: body.userId ?? "",
        invitedByUserId: viewerUserId ?? "user-demo",
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

  app.post("/api/prototype/events/:eventId/page-plan/selection", async (request, reply) => {
    if (!options.prototypeOrderSelectionUpdater) {
      return reply.code(503).send({
        message: "Prototype order selection updater is not configured",
      });
    }

    const params = request.params as { eventId?: string };
    const body = (request.body ?? {}) as { selectedPhotoIds?: string[] };

    try {
      await options.prototypeOrderSelectionUpdater({
        eventId: params.eventId ?? "",
        selectedPhotoIds: Array.isArray(body.selectedPhotoIds) ? body.selectedPhotoIds : [],
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/page-plan/cover", async (request, reply) => {
    if (!options.prototypeOrderCoverUpdater) {
      return reply.code(503).send({
        message: "Prototype order cover updater is not configured",
      });
    }

    const params = request.params as { eventId?: string };
    const body = (request.body ?? {}) as { coverPhotoId?: string };

    try {
      await options.prototypeOrderCoverUpdater({
        eventId: params.eventId ?? "",
        coverPhotoId: body.coverPhotoId ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/page-plan/pages/:pageId/layout", async (request, reply) => {
    if (!options.prototypeOrderPageLayoutUpdater) {
      return reply.code(503).send({
        message: "Prototype order page layout updater is not configured",
      });
    }

    const params = request.params as { eventId?: string; pageId?: string };
    const body = (request.body ?? {}) as { layout?: string };

    try {
      await options.prototypeOrderPageLayoutUpdater({
        eventId: params.eventId ?? "",
        pageId: params.pageId ?? "",
        layout: body.layout ?? "",
      });
      return reply.code(200).send();
    } catch (error: unknown) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/prototype/events/:eventId/page-plan/pages/:pageId/note", async (request, reply) => {
    if (!options.prototypeOrderPageNoteUpdater) {
      return reply.code(503).send({
        message: "Prototype order page note updater is not configured",
      });
    }

    const params = request.params as { eventId?: string; pageId?: string };
    const body = (request.body ?? {}) as { note?: string };

    try {
      await options.prototypeOrderPageNoteUpdater({
        eventId: params.eventId ?? "",
        pageId: params.pageId ?? "",
        note: body.note ?? "",
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
      let uploadedFile:
        | {
            filename: string;
            mimetype: string;
            fileBytes: Buffer;
          }
        | undefined;
      let eventId = "";
      let caption = "";

      for await (const part of request.parts()) {
        if (part.type === "file") {
          uploadedFile = {
            filename: part.filename,
            mimetype: part.mimetype,
            fileBytes: await part.toBuffer(),
          };
          continue;
        }

        if (part.fieldname === "eventId") {
          eventId = `${part.value ?? ""}`;
          continue;
        }

        if (part.fieldname === "caption") {
          caption = `${part.value ?? ""}`;
        }
      }

      if (!uploadedFile) {
        throw new Error("Prototype photo file is required");
      }

      await options.prototypePhotoUploader({
        eventId,
        caption,
        originalFileName: uploadedFile.filename,
        mediaType: uploadedFile.mimetype,
        fileBytes: uploadedFile.fileBytes,
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
    try {
      const result = await options.prototypeSweetBookEstimateRunner({
        eventId: body.eventId,
      });
      return reply.code(200).send(result);
    } catch (error: unknown) {
      request.log.error(error, "Prototype SweetBook estimate failed");
      return reply.code(500).send({
        message:
          error instanceof Error
            ? error.message
            : "SweetBook prototype estimate failed",
      });
    }
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
    try {
      const result = await options.prototypeSweetBookSubmitRunner({
        eventId: body.eventId,
      });
      return reply.code(200).send(result);
    } catch (error: unknown) {
      request.log.error(error, "Prototype SweetBook submit failed");
      return reply.code(500).send({
        message:
          error instanceof Error
            ? error.message
            : "SweetBook prototype submit failed",
      });
    }
  });

  return app;
}
