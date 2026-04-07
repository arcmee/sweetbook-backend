import { Buffer } from "node:buffer";

import { mapPlannerSelectionToSweetBookPayload } from "./payload/sweetbook-payload-mapper";
import type { PrototypeWorkspaceSnapshot } from "./prototype-workspace-snapshot";
import type { SweetBookReadClient } from "./ports/sweetbook-read-client";
import type {
  SweetBookClient,
  SweetBookContentsUploadResult,
  SweetBookOrderEstimateResult,
  SweetBookOrderResult,
  SweetBookShippingAddressInput,
} from "./ports/sweetbook-client";

const COVER_TEMPLATE_UID = "4MY2fokVjkeY";
const CONTENT_TEMPLATE_UID = "4slyauW5rkUE";
const BOOK_SPEC_UID = "SQUAREBOOK_HC";
const TARGET_PAGE_COUNT = 24;

export interface PrototypeSweetBookEstimateResult {
  status: "ready_for_order" | "blocked_insufficient_credit";
  bookUid: string;
  uploadedPhotoFileName: string;
  pageCount: number;
  contentInsertions: Array<
    SweetBookContentsUploadResult & {
      attempt: number;
    }
  >;
  estimate: SweetBookOrderEstimateResult;
}

export type PrototypeSweetBookEstimateRunner =
  (input?: { eventId?: string }) => Promise<PrototypeSweetBookEstimateResult>;

export interface PrototypeSweetBookSubmitResult {
  status: "submitted";
  bookUid: string;
  uploadedPhotoFileName: string;
  pageCount: number;
  contentInsertions: Array<
    SweetBookContentsUploadResult & {
      attempt: number;
    }
  >;
  estimate: SweetBookOrderEstimateResult;
  order: SweetBookOrderResult;
}

export type PrototypeSweetBookSubmitRunner =
  (input?: { eventId?: string }) => Promise<PrototypeSweetBookSubmitResult>;

export interface PrototypeSweetBookEstimateServiceDependencies {
  readClient: SweetBookReadClient;
  writeClient: SweetBookClient;
  workspaceSnapshotLoader?: () => Promise<PrototypeWorkspaceSnapshot>;
  now?: () => number;
}

export function createPrototypeSweetBookEstimateRunner(
  dependencies: PrototypeSweetBookEstimateServiceDependencies,
): PrototypeSweetBookEstimateRunner {
  const now = dependencies.now ?? Date.now;

  return async (input) => {
    const prepared = await preparePrototypeSweetBookOrder(dependencies, now, input);

    return {
      status:
        prepared.estimate.creditSufficient === false
          ? "blocked_insufficient_credit"
          : "ready_for_order",
      bookUid: prepared.bookUid,
      uploadedPhotoFileName: prepared.uploadedPhotoFileName,
      pageCount: prepared.pageCount,
      contentInsertions: prepared.contentInsertions,
      estimate: prepared.estimate,
    };
  };
}

export function createPrototypeSweetBookSubmitRunner(
  dependencies: PrototypeSweetBookEstimateServiceDependencies,
): PrototypeSweetBookSubmitRunner {
  const now = dependencies.now ?? Date.now;

  return async (input) => {
    const prepared = await preparePrototypeSweetBookOrder(dependencies, now, input);

    if (prepared.estimate.creditSufficient === false) {
      throw new Error("SweetBook credits are insufficient for order submission");
    }

    const order = await dependencies.writeClient.submitOrder({
      items: [
        {
          bookUid: prepared.bookUid,
          quantity: 1,
        },
      ],
      shipping: createPrototypeShippingAddress(),
      externalRef: `prototype-submit-${now()}`,
      idempotencyKey: `prototype-submit-order-${now()}`,
    });

    return {
      status: "submitted",
      bookUid: prepared.bookUid,
      uploadedPhotoFileName: prepared.uploadedPhotoFileName,
      pageCount: prepared.pageCount,
      contentInsertions: prepared.contentInsertions,
      estimate: prepared.estimate,
      order,
    };
  };
}

async function preparePrototypeSweetBookOrder(
  dependencies: PrototypeSweetBookEstimateServiceDependencies,
  now: () => number,
  input?: { eventId?: string },
) {
  const plannerContext = await resolvePlannerContext(
    dependencies.workspaceSnapshotLoader,
    input?.eventId,
  );
  const createdBook = await dependencies.writeClient.createBook({
    title:
      plannerContext?.bookTitle ??
      `SweetBook Prototype Estimate ${new Date(now()).toISOString()}`,
    bookSpecUid: BOOK_SPEC_UID,
    idempotencyKey: `prototype-estimate-book-${now()}`,
  });

  await dependencies.writeClient.uploadCover({
    bookUid: createdBook.bookUid,
    templateUid: COVER_TEMPLATE_UID,
    parameters: {
      dateRange: plannerContext?.dateRange ?? "2026.04",
      spineTitle: plannerContext?.spineTitle ?? "SweetBook Prototype",
    },
    frontPhoto: createBmpPart(
      plannerContext?.coverPhotoFileName ?? "prototype-cover.bmp",
      1200,
      1200,
    ),
  });

  const uploadedPhotos =
    plannerContext?.selectedPhotos.length && plannerContext.selectedPhotos.length > 0
      ? plannerContext.selectedPhotos
      : [
          {
            photoId: "prototype-photo",
            fileName: "prototype-photo.bmp",
            caption: "Prototype photo",
          },
        ];
  const uploadedPhotoFileNames = new Map<string, string>();

  for (const photo of uploadedPhotos) {
    const uploadedPhoto = await dependencies.writeClient.uploadPhoto({
      bookUid: createdBook.bookUid,
      file: createBmpPart(photo.fileName, 1200, 1200),
    });
    uploadedPhotoFileNames.set(photo.photoId, uploadedPhoto.fileName);
  }

  const contentInsertions: PrototypeSweetBookEstimateResult["contentInsertions"] =
    [];
  const plannerPages =
    plannerContext?.pages.length && plannerContext.pages.length > 0
      ? plannerContext.pages
      : [
          {
            pageId: "spread-1",
            layout: "Single-photo spotlight",
            note: "Prototype draft page.",
            photoIds: [uploadedPhotos[0].photoId],
          },
        ];
  let lastContentResult: SweetBookContentsUploadResult | undefined;
  let attempt = 0;

  for (const page of plannerPages) {
    attempt += 1;
    const contentResult = await dependencies.writeClient.uploadContents({
      bookUid: createdBook.bookUid,
      templateUid: CONTENT_TEMPLATE_UID,
      breakBefore: "page",
      parameters: createContentParameters({
        eventTitle: plannerContext?.spineTitle ?? "SweetBook Prototype",
        dateRange: plannerContext?.dateRange ?? "2026.04",
        page,
        uploadedPhotoFileNames,
      }),
    });

    contentInsertions.push({
      attempt,
      ...contentResult,
    });
    lastContentResult = contentResult;

    if ((contentResult.pageCount ?? 0) >= TARGET_PAGE_COUNT) {
      break;
    }
  }

  while ((lastContentResult?.pageCount ?? 0) < TARGET_PAGE_COUNT) {
    attempt += 1;
    const fallbackPage =
      plannerPages[Math.min(plannerPages.length - 1, Math.max(0, attempt - 2))] ??
      plannerPages[0];
    const contentResult = await dependencies.writeClient.uploadContents({
      bookUid: createdBook.bookUid,
      templateUid: CONTENT_TEMPLATE_UID,
      breakBefore: "page",
      parameters: createContentParameters({
        eventTitle: plannerContext?.spineTitle ?? "SweetBook Prototype",
        dateRange: plannerContext?.dateRange ?? "2026.04",
        page: fallbackPage,
        uploadedPhotoFileNames,
      }),
    });

    contentInsertions.push({
      attempt,
      ...contentResult,
    });
    lastContentResult = contentResult;
  }

  const pageCount = lastContentResult?.pageCount ?? 0;
  if (pageCount < TARGET_PAGE_COUNT) {
    throw new Error(
      `SweetBook content loop did not reach minimum pages (last pageCount=${pageCount})`,
    );
  }

  await dependencies.writeClient.finalizeBook({
    bookUid: createdBook.bookUid,
  });

  const estimate = await dependencies.writeClient.estimateOrder({
    items: [
      {
        bookUid: createdBook.bookUid,
        quantity: 1,
      },
    ],
  });

  return {
    bookUid: createdBook.bookUid,
    uploadedPhotoFileName:
      uploadedPhotoFileNames.get(uploadedPhotos[0].photoId) ?? uploadedPhotos[0].fileName,
    pageCount,
    contentInsertions,
    estimate,
  };
}

async function resolvePlannerContext(
  workspaceSnapshotLoader: PrototypeSweetBookEstimateServiceDependencies["workspaceSnapshotLoader"],
  eventId: string | undefined,
): Promise<
  | {
      bookTitle: string;
      spineTitle: string;
      dateRange: string;
      coverPhotoFileName?: string;
      selectedPhotos: Array<{
        photoId: string;
        fileName: string;
        caption: string;
      }>;
      pages: Array<{
        pageId: string;
        layout: string;
        note: string;
        photoIds: string[];
      }>;
    }
  | undefined
> {
  if (!workspaceSnapshotLoader || !eventId) {
    return undefined;
  }

  const snapshot = await workspaceSnapshotLoader();
  const event = snapshot.workspace.events.find((item) => item.id === eventId);
  const orderEntry = snapshot.orderEntries.find((item) => item.activeEventId === eventId);
  const photoWorkflow = snapshot.photoWorkflows.find((item) => item.activeEventId === eventId);

  if (!event || !orderEntry || !photoWorkflow) {
    return undefined;
  }

  const eventDate = event.votingEndsAt ?? event.votingStartsAt ?? new Date().toISOString();
  const parsedDate = new Date(eventDate);
  const year = Number.isNaN(parsedDate.valueOf())
    ? "2026"
    : `${parsedDate.getUTCFullYear()}`;
  const month = Number.isNaN(parsedDate.valueOf())
    ? "04"
    : `${parsedDate.getUTCMonth() + 1}`.padStart(2, "0");

  const payload = mapPlannerSelectionToSweetBookPayload({
    albumTitle: `${event.name} SweetBook Draft`,
    selection: {
      selectedPhotos: orderEntry.pagePlanner.selectedPhotoIds
        .map((photoId) => photoWorkflow.photos.find((photo) => photo.id === photoId))
        .filter((photo): photo is NonNullable<typeof photoWorkflow.photos[number]> => Boolean(photo))
        .map((photo) => ({
          photoId: photo.id,
          caption: photo.caption,
          assetFileName: photo.assetFileName,
        })),
      coverPhotoId: orderEntry.pagePlanner.coverPhotoId,
      pageLayouts: orderEntry.pagePlanner.pageLayouts,
      pageNotes: orderEntry.pagePlanner.pageNotes,
    },
  });

  return {
    bookTitle: payload.albumTitle,
    spineTitle: event.name,
    dateRange: `${year}.${month}`,
    coverPhotoFileName: sanitizePlannerFileName(
      payload.selectedPhotos.find((photo) => photo.photoId === payload.coverPhotoId)?.assetFileName,
      payload.coverPhotoId ?? "prototype-cover",
    ),
    selectedPhotos: payload.selectedPhotos.map((photo) => ({
      photoId: photo.photoId,
      caption: photo.caption,
      fileName: sanitizePlannerFileName(photo.assetFileName, photo.photoId),
    })),
    pages: payload.pages,
  };
}

function createBmpPart(fileName: string, width: number, height: number) {
  const bytes = createSolidBmp(width, height, {
    red: 255,
    green: 111,
    blue: 97,
  });

  return {
    fileName,
    contentType: "image/bmp",
    bytes: new Blob([bytes], {
      type: "image/bmp",
    }),
  };
}

function createContentParameters(input: {
  eventTitle: string;
  dateRange: string;
  page: {
    pageId: string;
    layout: string;
    note: string;
    photoIds: string[];
  };
  uploadedPhotoFileNames: Map<string, string>;
}) {
  const [year, month = "01"] = input.dateRange.split(".");
  const photoFileNames = input.page.photoIds
    .map((photoId) => input.uploadedPhotoFileNames.get(photoId))
    .filter((value): value is string => Boolean(value));

  return {
    year,
    month,
    bookTitle: input.eventTitle,
    date: "06",
    weatherLabelX: 0,
    weatherValueX: 0,
    mealLabelX: 0,
    mealValueX: 0,
    napLabelX: 0,
    napValueX: 0,
    pointColor: "#FF6F61",
    hasParentComment: false,
    hasTeacherComment: false,
    parentComment: input.page.note,
    teacherComment: `${input.page.layout} | ${input.page.pageId}`,
    photos: photoFileNames.length > 0 ? photoFileNames : ["prototype-photo.bmp"],
  };
}

function sanitizePlannerFileName(assetFileName: string | undefined, fallbackId: string): string {
  const baseName = assetFileName?.trim() || `${fallbackId}.bmp`;
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function createPrototypeShippingAddress(): SweetBookShippingAddressInput {
  return {
    recipientName: "SweetBook Tester",
    recipientPhone: "010-1234-5678",
    postalCode: "06236",
    address1: "Seoul Test Road 123",
    address2: "Suite 4",
    memo: "prototype-submit",
  };
}

function createSolidBmp(
  width: number,
  height: number,
  color: { red: number; green: number; blue: number },
): Buffer {
  const bytesPerPixel = 3;
  const rowStride = width * bytesPerPixel;
  const rowPadding = (4 - (rowStride % 4)) % 4;
  const pixelArraySize = (rowStride + rowPadding) * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelArraySize, 34);

  let offset = 54;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      buffer[offset] = color.blue;
      buffer[offset + 1] = color.green;
      buffer[offset + 2] = color.red;
      offset += bytesPerPixel;
    }

    offset += rowPadding;
  }

  return buffer;
}
