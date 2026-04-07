import { Buffer } from "node:buffer";

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
    frontPhoto: createBmpPart("prototype-cover.bmp", 1200, 1200),
  });

  const uploadedPhoto = await dependencies.writeClient.uploadPhoto({
    bookUid: createdBook.bookUid,
    file: createBmpPart("prototype-photo.bmp", 1200, 1200),
  });

  const contentInsertions: PrototypeSweetBookEstimateResult["contentInsertions"] =
    [];

  let lastContentResult: SweetBookContentsUploadResult | undefined;
  for (let attempt = 1; attempt <= TARGET_PAGE_COUNT; attempt += 1) {
    const contentResult = await dependencies.writeClient.uploadContents({
      bookUid: createdBook.bookUid,
      templateUid: CONTENT_TEMPLATE_UID,
      breakBefore: "page",
      parameters: createContentParameters(uploadedPhoto.fileName),
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
    uploadedPhotoFileName: uploadedPhoto.fileName,
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
    }
  | undefined
> {
  if (!workspaceSnapshotLoader || !eventId) {
    return undefined;
  }

  const snapshot = await workspaceSnapshotLoader();
  const event = snapshot.workspace.events.find((item) => item.id === eventId);
  const orderEntry = snapshot.orderEntries.find((item) => item.activeEventId === eventId);

  if (!event || !orderEntry) {
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

  return {
    bookTitle: `${event.name} SweetBook Draft`,
    spineTitle: event.name,
    dateRange: `${year}.${month}`,
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

function createContentParameters(photoFileName: string) {
  return {
    year: "2026",
    month: "04",
    bookTitle: "SweetBook Prototype",
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
    parentComment: "",
    teacherComment: "",
    photos: [photoFileName],
  };
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
