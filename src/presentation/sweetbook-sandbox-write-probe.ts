import { Buffer } from "node:buffer";

import { resolveSweetBookApiConfig } from "../data/sweetbook-api-config";
import { createSweetBookReadApiClient } from "../data/sweetbook-read-api-client";
import { createSweetBookWriteApiClient } from "../data/sweetbook-write-api-client";

const COVER_TEMPLATE_UID = "4MY2fokVjkeY";
const CONTENT_TEMPLATE_UID = "4slyauW5rkUE";
const BOOK_SPEC_UID = "SQUAREBOOK_HC";

async function main(): Promise<void> {
  const config = resolveSweetBookApiConfig();
  const readClient = createSweetBookReadApiClient(config);
  const client = createSweetBookWriteApiClient(config);

  const trace: Record<string, unknown> = {
    environment: config.environment,
    baseUrl: config.baseUrl,
  };

  let bookUid: string | undefined;
  let uploadedPhotoFileName: string | undefined;

  try {
    const [coverTemplate, contentTemplate] = await Promise.all([
      readClient.getTemplateDetail(COVER_TEMPLATE_UID),
      readClient.getTemplateDetail(CONTENT_TEMPLATE_UID),
    ]);
    trace.coverTemplate = {
      templateUid: coverTemplate.templateUid,
      templateName: coverTemplate.templateName,
      parameterKeys: Object.keys(coverTemplate.parameters?.definitions ?? {}),
    };
    trace.contentTemplate = {
      templateUid: contentTemplate.templateUid,
      templateName: contentTemplate.templateName,
      parameterKeys: Object.keys(contentTemplate.parameters?.definitions ?? {}),
    };

    const createdBook = await client.createBook({
      title: `SweetBook Probe ${new Date().toISOString()}`,
      bookSpecUid: BOOK_SPEC_UID,
      idempotencyKey: `probe-book-${Date.now()}`,
    });
    bookUid = createdBook.bookUid;
    trace.createBook = createdBook;
    trace.initialBookSummary = await findBookSummary(readClient, bookUid);

    const imagePart = createBmpPart("probe-image.bmp", 1200, 1200);

    const cover = await client.uploadCover({
      bookUid,
      templateUid: COVER_TEMPLATE_UID,
      parameters: {
        dateRange: "2026.04",
        spineTitle: "SweetBook Probe",
      },
      frontPhoto: imagePart,
    });
    trace.uploadCover = cover;

    const uploadedPhoto = await client.uploadPhoto({
      bookUid,
      file: createBmpPart("probe-photo.bmp", 1200, 1200),
    });
    uploadedPhotoFileName = uploadedPhoto.fileName;
    trace.uploadPhoto = uploadedPhoto;

    const contentInsertions = [];
    let lastContentResult:
      | Awaited<ReturnType<typeof client.uploadContents>>
      | undefined;

    for (let attempt = 1; attempt <= 24; attempt += 1) {
      const contentResult = await client.uploadContents({
        bookUid,
        templateUid: CONTENT_TEMPLATE_UID,
        breakBefore: "page",
        parameters: createContentParameters(uploadedPhotoFileName),
      });

      contentInsertions.push({
        attempt,
        ...contentResult,
      });
      lastContentResult = contentResult;

      if ((contentResult.pageCount ?? 0) >= 24) {
        break;
      }
    }

    trace.uploadContents = contentInsertions;
    trace.postContentsBookSummary = await findBookSummary(readClient, bookUid);
    trace.postContentsPhotoInventory = await readClient.listBookPhotos(bookUid);

    if ((lastContentResult?.pageCount ?? 0) < 24) {
      throw new Error(
        `SweetBook content loop did not reach minimum pages (last pageCount=${lastContentResult?.pageCount ?? 0})`,
      );
    }

    const finalization = await client.finalizeBook({ bookUid });
    trace.finalizeBook = finalization;

    const estimate = await client.estimateOrder({
      items: [
        {
          bookUid,
          quantity: 1,
        },
      ],
    });
    trace.estimateOrder = estimate;

    if (estimate.creditSufficient === false) {
      trace.result = "probe-blocked-insufficient-credit";
      console.log(JSON.stringify(trace, null, 2));
      return;
    }

    const order = await client.submitOrder({
      items: [
        {
          bookUid,
          quantity: 1,
        },
      ],
      shipping: {
        recipientName: "SweetBook Tester",
        recipientPhone: "010-1234-5678",
        postalCode: "06236",
        address1: "Seoul Test Road 123",
        address2: "Suite 4",
        memo: "sandbox-probe",
      },
      externalRef: `probe-order-${Date.now()}`,
      idempotencyKey: `probe-order-${Date.now()}`,
    });
    trace.submitOrder = order;

    trace.result = "probe-completed";
    console.log(JSON.stringify(trace, null, 2));
  } catch (error: unknown) {
    trace.result = "probe-failed";
    trace.bookUid = bookUid ?? null;
    trace.uploadedPhotoFileName = uploadedPhotoFileName ?? null;
    trace.error = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify(trace, null, 2));
    process.exitCode = 1;
  }
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

function createContentParameters(photoFileName?: string) {
  return {
    year: "2026",
    month: "04",
    bookTitle: "SweetBook Probe",
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
    photos: photoFileName ? [photoFileName] : [],
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function findBookSummary(
  readClient: ReturnType<typeof createSweetBookReadApiClient>,
  bookUid: string,
) {
  const result = await readClient.listBooks({ limit: 20 });
  return result.books.find((book) => book.bookUid === bookUid) ?? null;
}
