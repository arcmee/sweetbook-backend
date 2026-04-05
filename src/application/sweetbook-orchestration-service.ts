import type {
  SweetBookClient,
  SweetBookContentsUploadResult,
  SweetBookCoverUploadResult,
  SweetBookFilePart,
  SweetBookFinalizeResult,
  SweetBookOrderEstimateResult,
  SweetBookOrderResult,
  SweetBookPhotoUploadResult,
} from "./ports/sweetbook-client";

export interface PublishAlbumProjectInput {
  albumTitle: string;
  bookSpecUid: string;
  quantity: number;
  cover: {
    templateUid: string;
    parameters: Record<string, unknown>;
    frontPhoto: SweetBookFilePart;
    backPhoto?: SweetBookFilePart;
  };
  photos: SweetBookFilePart[];
  contents: Array<{
    templateUid: string;
    breakBefore?: "page" | "column" | "none";
    parameters: Record<string, unknown>;
    fileParts?: Record<string, SweetBookFilePart>;
  }>;
  idempotency?: {
    createBook?: string;
    submitOrder?: string;
  };
}

export interface PublishAlbumProjectResult {
  bookUid: string;
  cover: SweetBookCoverUploadResult;
  uploadedPhotos: SweetBookPhotoUploadResult[];
  contents: SweetBookContentsUploadResult[];
  finalization: SweetBookFinalizeResult;
  estimate: SweetBookOrderEstimateResult;
  order: SweetBookOrderResult;
}

export interface SweetBookOrchestrationServiceDependencies {
  sweetBookClient: SweetBookClient;
}

export function createSweetBookOrchestrationService(
  dependencies: SweetBookOrchestrationServiceDependencies,
) {
  return {
    async publishAlbumProject(
      input: PublishAlbumProjectInput,
    ): Promise<PublishAlbumProjectResult> {
      const createdBook = await dependencies.sweetBookClient.createBook({
        title: input.albumTitle,
        bookSpecUid: input.bookSpecUid,
        idempotencyKey: input.idempotency?.createBook,
      });

      const cover = await dependencies.sweetBookClient.uploadCover({
        bookUid: createdBook.bookUid,
        templateUid: input.cover.templateUid,
        parameters: input.cover.parameters,
        frontPhoto: input.cover.frontPhoto,
        backPhoto: input.cover.backPhoto,
      });

      const uploadedPhotos: SweetBookPhotoUploadResult[] = [];
      for (const photo of input.photos) {
        uploadedPhotos.push(
          await dependencies.sweetBookClient.uploadPhoto({
            bookUid: createdBook.bookUid,
            file: photo,
          }),
        );
      }

      const contents: SweetBookContentsUploadResult[] = [];
      for (const content of input.contents) {
        contents.push(
          await dependencies.sweetBookClient.uploadContents({
            bookUid: createdBook.bookUid,
            templateUid: content.templateUid,
            breakBefore: content.breakBefore,
            parameters: content.parameters,
            fileParts: content.fileParts,
          }),
        );
      }

      const finalization = await dependencies.sweetBookClient.finalizeBook({
        bookUid: createdBook.bookUid,
      });

      const estimate = await dependencies.sweetBookClient.estimateOrder({
        bookUid: createdBook.bookUid,
        quantity: input.quantity,
      });

      const order = await dependencies.sweetBookClient.submitOrder({
        bookUid: createdBook.bookUid,
        quantity: input.quantity,
        idempotencyKey: input.idempotency?.submitOrder,
      });

      return {
        bookUid: createdBook.bookUid,
        cover,
        uploadedPhotos,
        contents,
        finalization,
        estimate,
        order,
      };
    },
  };
}
