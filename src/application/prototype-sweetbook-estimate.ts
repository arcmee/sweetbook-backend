import { Buffer } from "node:buffer";

import type { SweetBookReadClient } from "./ports/sweetbook-read-client";
import type {
  SweetBookClient,
  SweetBookContentsUploadResult,
  SweetBookOrderEstimateResult,
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
  () => Promise<PrototypeSweetBookEstimateResult>;

export interface PrototypeSweetBookEstimateServiceDependencies {
  readClient: SweetBookReadClient;
  writeClient: SweetBookClient;
  now?: () => number;
}

export function createPrototypeSweetBookEstimateRunner(
  dependencies: PrototypeSweetBookEstimateServiceDependencies,
): PrototypeSweetBookEstimateRunner {
  const now = dependencies.now ?? Date.now;

  return async () => {
    const createdBook = await dependencies.writeClient.createBook({
      title: `SweetBook Prototype Estimate ${new Date(now()).toISOString()}`,
      bookSpecUid: BOOK_SPEC_UID,
      idempotencyKey: `prototype-estimate-book-${now()}`,
    });

    await dependencies.writeClient.uploadCover({
      bookUid: createdBook.bookUid,
      templateUid: COVER_TEMPLATE_UID,
      parameters: {
        dateRange: "2026.04",
        spineTitle: "SweetBook Prototype",
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
      status:
        estimate.creditSufficient === false
          ? "blocked_insufficient_credit"
          : "ready_for_order",
      bookUid: createdBook.bookUid,
      uploadedPhotoFileName: uploadedPhoto.fileName,
      pageCount,
      contentInsertions,
      estimate,
    };
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
