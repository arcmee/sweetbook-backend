import { join } from "node:path";

import { createPrototypeSweetBookEstimateRunner } from "../application/prototype-sweetbook-estimate";
import { createPrototypeSweetBookSubmitRunner } from "../application/prototype-sweetbook-estimate";
import {
  createPrototypeAuthUserPostgresStore,
  createPrototypeUserSearch,
  initializePrototypeAuthUserStore,
  seedPrototypeAuthUserStore,
} from "../data/prototype-auth-user-postgres-store";
import { resolveDatabaseConfig } from "../data/database-config";
import { loadLocalEnv } from "../data/local-env-loader";
import { createPostgresPool } from "../data/postgres-pool";
import {
  createPrototypeEventCreator,
  createPrototypeEventVotingCloser,
  createPrototypeEventVotingExtender,
  createPrototypeEventOwnerApprovalUpdater,
  createPrototypeOrderCoverUpdater,
  createPrototypeOrderPageLayoutUpdater,
  createPrototypeOrderPageNoteUpdater,
  createPrototypeOrderSelectionUpdater,
  createPrototypeGroupCreator,
  createPrototypeGroupInviteCreator,
  createPrototypeInvitationAcceptor,
  createPrototypeInvitationDecliner,
  createPrototypeGroupLeaveAction,
  createPrototypeOwnerTransfer,
  createPrototypePhotoAssetLoader,
  createPrototypePhotoCreator,
  createPrototypePhotoUploader,
  createPrototypePhotoLikeAdder,
  createPrototypeWorkspaceSnapshotLoader,
  initializePrototypeWorkspaceStore,
  seedPrototypeWorkspaceStore,
} from "../data/prototype-workspace-postgres-store";
import { resolveSweetBookApiConfig } from "../data/sweetbook-api-config";
import { createSweetBookReadApiClient } from "../data/sweetbook-read-api-client";
import { createSweetBookWriteApiClient } from "../data/sweetbook-write-api-client";
import { buildApp } from "./app";

const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  loadLocalEnv();

  const persistence = await createConfiguredPersistence();
  const prototypeSweetBookEstimateRunner = createConfiguredEstimateRunner(persistence);
  const prototypeSweetBookSubmitRunner = createConfiguredSubmitRunner(persistence);
  const app = await buildApp({
    prototypeAuthUserStore: persistence?.prototypeAuthUserStore,
    prototypeEventCreator: persistence?.prototypeEventCreator,
    prototypeEventVotingCloser: persistence?.prototypeEventVotingCloser,
    prototypeEventVotingExtender: persistence?.prototypeEventVotingExtender,
    prototypeEventOwnerApprovalUpdater: persistence?.prototypeEventOwnerApprovalUpdater,
    prototypeOrderSelectionUpdater: persistence?.prototypeOrderSelectionUpdater,
    prototypeOrderCoverUpdater: persistence?.prototypeOrderCoverUpdater,
    prototypeOrderPageLayoutUpdater: persistence?.prototypeOrderPageLayoutUpdater,
    prototypeOrderPageNoteUpdater: persistence?.prototypeOrderPageNoteUpdater,
    prototypeGroupCreator: persistence?.prototypeGroupCreator,
    prototypeGroupInviteCreator: persistence?.prototypeGroupInviteCreator,
    prototypeGroupInvitationAcceptor: persistence?.prototypeGroupInvitationAcceptor,
    prototypeGroupInvitationDecliner: persistence?.prototypeGroupInvitationDecliner,
    prototypeGroupLeaveAction: persistence?.prototypeGroupLeaveAction,
    prototypeOwnerTransfer: persistence?.prototypeOwnerTransfer,
    prototypePhotoCreator: persistence?.prototypePhotoCreator,
    prototypePhotoUploader: persistence?.prototypePhotoUploader,
    prototypePhotoAssetLoader: persistence?.prototypePhotoAssetLoader,
    prototypePhotoLikeAdder: persistence?.prototypePhotoLikeAdder,
    prototypeUserSearch: persistence?.prototypeUserSearch,
    prototypeWorkspaceSnapshotLoader: persistence?.prototypeWorkspaceSnapshotLoader,
    prototypeSweetBookEstimateRunner,
    prototypeSweetBookSubmitRunner,
  });
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}

async function createConfiguredPersistence() {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  const databaseConfig = resolveDatabaseConfig(process.env);
  const pool = createPostgresPool(databaseConfig);
  await initializePrototypeAuthUserStore(pool);
  await seedPrototypeAuthUserStore(pool);
  await initializePrototypeWorkspaceStore(pool);
  await seedPrototypeWorkspaceStore(pool);
  const uploadDirectory =
    process.env.PROTOTYPE_UPLOAD_DIR ?? join(process.cwd(), "var", "prototype-uploads");

  return {
    prototypeAuthUserStore: createPrototypeAuthUserPostgresStore(pool),
    prototypeEventCreator: createPrototypeEventCreator(pool),
    prototypeEventVotingCloser: createPrototypeEventVotingCloser(pool),
    prototypeEventVotingExtender: createPrototypeEventVotingExtender(pool),
    prototypeEventOwnerApprovalUpdater: createPrototypeEventOwnerApprovalUpdater(pool),
    prototypeOrderSelectionUpdater: createPrototypeOrderSelectionUpdater(pool),
    prototypeOrderCoverUpdater: createPrototypeOrderCoverUpdater(pool),
    prototypeOrderPageLayoutUpdater: createPrototypeOrderPageLayoutUpdater(pool),
    prototypeOrderPageNoteUpdater: createPrototypeOrderPageNoteUpdater(pool),
    prototypeGroupCreator: createPrototypeGroupCreator(pool),
    prototypeGroupInviteCreator: createPrototypeGroupInviteCreator(pool),
    prototypeGroupInvitationAcceptor: createPrototypeInvitationAcceptor(pool),
    prototypeGroupInvitationDecliner: createPrototypeInvitationDecliner(pool),
    prototypeGroupLeaveAction: createPrototypeGroupLeaveAction(pool),
    prototypeOwnerTransfer: createPrototypeOwnerTransfer(pool),
    prototypePhotoCreator: createPrototypePhotoCreator(pool),
    prototypePhotoUploader: createPrototypePhotoUploader(pool, {
      uploadDirectory,
    }),
    prototypePhotoAssetLoader: createPrototypePhotoAssetLoader(pool),
    prototypePhotoLikeAdder: createPrototypePhotoLikeAdder(pool),
    prototypeUserSearch: createPrototypeUserSearch(pool),
    prototypeWorkspaceSnapshotLoader: createPrototypeWorkspaceSnapshotLoader(pool),
  };
}

function createConfiguredEstimateRunner(
  persistence: Awaited<ReturnType<typeof createConfiguredPersistence>>,
) {
  if (!process.env.SWEETBOOK_API_KEY) {
    return undefined;
  }

  const config = resolveSweetBookApiConfig(process.env);
  const readClient = createSweetBookReadApiClient(config);
  const writeClient = createSweetBookWriteApiClient(config);

  return createPrototypeSweetBookEstimateRunner({
    readClient,
    writeClient,
    workspaceSnapshotLoader: persistence?.prototypeWorkspaceSnapshotLoader,
  });
}

function createConfiguredSubmitRunner(
  persistence: Awaited<ReturnType<typeof createConfiguredPersistence>>,
) {
  if (!process.env.SWEETBOOK_API_KEY) {
    return undefined;
  }

  const config = resolveSweetBookApiConfig(process.env);
  const readClient = createSweetBookReadApiClient(config);
  const writeClient = createSweetBookWriteApiClient(config);

  return createPrototypeSweetBookSubmitRunner({
    readClient,
    writeClient,
    workspaceSnapshotLoader: persistence?.prototypeWorkspaceSnapshotLoader,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
