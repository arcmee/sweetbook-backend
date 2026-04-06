import { Buffer } from "node:buffer";

import { resolveSweetBookApiConfig } from "../data/sweetbook-api-config";
import { createSweetBookReadApiClient } from "../data/sweetbook-read-api-client";
import { createSweetBookWriteApiClient } from "../data/sweetbook-write-api-client";

const COVER_TEMPLATE_UID = "4MY2fokVjkeY";
const CONTENT_TEMPLATE_UID = "4slyauW5rkUE";
const BOOK_SPEC_UID = "SQUAREBOOK_HC";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0k0AAAAASUVORK5CYII=";
const TINY_JPG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QDw8PEA8PDw8PDw8PDw8PFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAgMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB6gD/xAAXEAEAAwAAAAAAAAAAAAAAAAABABEh/9oACAEBAAEFAqf/xAAVEQEBAAAAAAAAAAAAAAAAAAABAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwB//8QAGhAAAwEBAQAAAAAAAAAAAAAAAQIRACExQf/aAAgBAQAGPwK1mM7/xAAbEAEAAwEAAwAAAAAAAAAAAAABABEhMUFRcf/aAAgBAQABPyFvW21N0Xc5Gm7kV0Q2n//aAAwDAQACAAMAAAAQ8//EABURAQEAAAAAAAAAAAAAAAAAABAR/9oACAEDAQE/EB//xAAVEQEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAgEBPxAf/8QAHBABAQACAgMAAAAAAAAAAAAAAREAITFBUWFxkaH/2gAIAQEAAT8QCh7AnCM1j403rwhhtjfiPgk41IrTnfjp+1rssZCvGSqtEtFP/9k=";

async function main(): Promise<void> {
  const config = resolveSweetBookApiConfig();
  const readClient = createSweetBookReadApiClient(config);
  const writeClient = createSweetBookWriteApiClient(config);

  const trace: Record<string, unknown> = {
    environment: config.environment,
    baseUrl: config.baseUrl,
  };

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

  const createdBook = await writeClient.createBook({
    title: `SweetBook Isolated Probe ${new Date().toISOString()}`,
    bookSpecUid: BOOK_SPEC_UID,
    idempotencyKey: `isolated-probe-book-${Date.now()}`,
  });

  trace.createBook = createdBook;
  trace.initialPhotoInventory = await readClient.listBookPhotos(createdBook.bookUid);

  const photoAttempts = [];
  const uploadedFileNames: string[] = [];

  photoAttempts.push(
    await runAttempt("photo-png", async () => {
      const uploaded = await writeClient.uploadPhoto({
        bookUid: createdBook.bookUid,
        file: createImagePart("probe-photo.png", "image/png", TINY_PNG_BASE64),
      });
      uploadedFileNames.push(uploaded.fileName);
      return uploaded;
    }),
  );

  photoAttempts.push(
    await runAttempt("photo-jpg", async () => {
      const uploaded = await writeClient.uploadPhoto({
        bookUid: createdBook.bookUid,
        file: createImagePart("probe-photo.jpg", "image/jpeg", TINY_JPG_BASE64),
      });
      uploadedFileNames.push(uploaded.fileName);
      return uploaded;
    }),
  );

  photoAttempts.push(
    await runAttempt("photo-bmp-1200", async () => {
      const uploaded = await writeClient.uploadPhoto({
        bookUid: createdBook.bookUid,
        file: createBmpPart("probe-photo.bmp", 1200, 1200),
      });
      uploadedFileNames.push(uploaded.fileName);
      return uploaded;
    }),
  );

  trace.photoAttempts = photoAttempts;

  const coverAttempts = [];
  coverAttempts.push(
    await runAttempt("cover-front-png", async () =>
      writeClient.uploadCover({
        bookUid: createdBook.bookUid,
        templateUid: COVER_TEMPLATE_UID,
        parameters: {
          dateRange: "2026.04",
          spineTitle: "SweetBook Probe",
        },
        frontPhoto: createImagePart("front.png", "image/png", TINY_PNG_BASE64),
      }),
    ),
  );

  coverAttempts.push(
    await runAttempt("cover-front-jpg", async () =>
      writeClient.uploadCover({
        bookUid: createdBook.bookUid,
        templateUid: COVER_TEMPLATE_UID,
        parameters: {
          dateRange: "2026.04",
          spineTitle: "SweetBook Probe",
        },
        frontPhoto: createImagePart("front.jpg", "image/jpeg", TINY_JPG_BASE64),
      }),
    ),
  );

  coverAttempts.push(
    await runAttempt("cover-front-back-jpg", async () =>
      writeClient.uploadCover({
        bookUid: createdBook.bookUid,
        templateUid: COVER_TEMPLATE_UID,
        parameters: {
          dateRange: "2026.04",
          spineTitle: "SweetBook Probe",
        },
        frontPhoto: createImagePart("front.jpg", "image/jpeg", TINY_JPG_BASE64),
        backPhoto: createImagePart("back.jpg", "image/jpeg", TINY_JPG_BASE64),
      }),
    ),
  );

  coverAttempts.push(
    await runAttempt("cover-front-bmp-1200", async () =>
      writeClient.uploadCover({
        bookUid: createdBook.bookUid,
        templateUid: COVER_TEMPLATE_UID,
        parameters: {
          dateRange: "2026.04",
          spineTitle: "SweetBook Probe",
        },
        frontPhoto: createBmpPart("front.bmp", 1200, 1200),
      }),
    ),
  );

  trace.coverAttempts = coverAttempts;

  const contentAttempts = [];
  contentAttempts.push(
    await runAttempt("content-photos-binding", async () =>
      writeClient.uploadContents({
        bookUid: createdBook.bookUid,
        templateUid: CONTENT_TEMPLATE_UID,
        breakBefore: "page",
        parameters: {
          photos: uploadedFileNames.slice(0, 1),
        },
      }),
    ),
  );

  contentAttempts.push(
    await runAttempt("content-photos-and-title", async () =>
      writeClient.uploadContents({
        bookUid: createdBook.bookUid,
        templateUid: CONTENT_TEMPLATE_UID,
        breakBefore: "page",
        parameters: {
          photos: uploadedFileNames.slice(0, 1),
          bookTitle: "SweetBook Probe",
          year: "2026",
          month: "04",
          date: "06",
        },
      }),
    ),
  );

  contentAttempts.push(
    await runAttempt("content-required-text-only", async () =>
      writeClient.uploadContents({
        bookUid: createdBook.bookUid,
        templateUid: CONTENT_TEMPLATE_UID,
        breakBefore: "page",
        parameters: {
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
          photos: [],
        },
      }),
    ),
  );

  trace.contentAttempts = contentAttempts;
  trace.finalPhotoInventory = await readClient.listBookPhotos(createdBook.bookUid);
  trace.result = "isolated-probe-complete";

  console.log(JSON.stringify(trace, null, 2));
}

function createImagePart(fileName: string, contentType: string, base64: string) {
  return {
    fileName,
    contentType,
    bytes: new Blob([Buffer.from(base64, "base64")], {
      type: contentType,
    }),
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

async function runAttempt<T>(
  name: string,
  action: () => Promise<T>,
): Promise<Record<string, unknown>> {
  try {
    const result = await action();
    return {
      name,
      success: true,
      result,
    };
  } catch (error: unknown) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
