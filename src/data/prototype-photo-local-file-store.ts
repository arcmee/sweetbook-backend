import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const DEFAULT_EXTENSION = ".bin";

export type PrototypeStoredPhotoAsset = {
  mediaType: string;
  originalFileName: string;
  storagePath: string;
};

export async function savePrototypePhotoAsset(input: {
  uploadDirectory: string;
  photoId: string;
  originalFileName: string;
  mediaType: string;
  fileBytes: Uint8Array;
}): Promise<PrototypeStoredPhotoAsset> {
  const extension = sanitizeFileExtension(input.originalFileName);
  const fileName = `${input.photoId}${extension}`;

  await mkdir(input.uploadDirectory, { recursive: true });
  const storagePath = join(input.uploadDirectory, fileName);
  await writeFile(storagePath, input.fileBytes);

  return {
    mediaType: input.mediaType,
    originalFileName: input.originalFileName,
    storagePath,
  };
}

export async function loadPrototypePhotoAsset(
  storagePath: string,
): Promise<Uint8Array> {
  return readFile(storagePath);
}

function sanitizeFileExtension(fileName: string): string {
  const extension = extname(fileName).toLowerCase();

  if (!extension || /[^a-z0-9.]/i.test(extension)) {
    return DEFAULT_EXTENSION;
  }

  return extension;
}
