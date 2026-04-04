import type { PhotoLikeRepository } from "../ports/photo-like-repository";
import type { PhotoRepository } from "../ports/photo-repository";

export interface AlbumSelectionEngineDependencies {
  photoRepository: PhotoRepository;
  photoLikeRepository: PhotoLikeRepository;
}

export interface SelectForEventInput {
  eventId: string;
  selectionSize: number;
  pageSize: number;
}

export interface SelectedPhoto {
  photoId: string;
  likeCount: number;
}

export interface PageCandidate {
  pageNumber: number;
  photoIds: string[];
}

export interface AlbumSelectionResult {
  selectedPhotos: SelectedPhoto[];
  pageCandidates: PageCandidate[];
}

export class AlbumSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlbumSelectionError";
  }
}

export function createAlbumSelectionEngine(
  dependencies: AlbumSelectionEngineDependencies
) {
  return {
    async selectForEvent(input: SelectForEventInput): Promise<AlbumSelectionResult> {
      validatePositiveInteger(input.selectionSize, "selectionSize");
      validatePositiveInteger(input.pageSize, "pageSize");

      const photos = await dependencies.photoRepository.findByEventId(input.eventId);
      const scoredPhotos = await Promise.all(
        photos.map(async (photo) => ({
          photo,
          likeCount: await dependencies.photoLikeRepository.countByPhotoId(photo.id)
        }))
      );

      scoredPhotos.sort((left, right) => {
        if (right.likeCount !== left.likeCount) {
          return right.likeCount - left.likeCount;
        }

        const createdAtDiff = left.photo.createdAt.getTime() - right.photo.createdAt.getTime();
        if (createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return left.photo.id.localeCompare(right.photo.id);
      });

      const selectedPhotos = scoredPhotos.slice(0, input.selectionSize).map((item) => ({
        photoId: item.photo.id,
        likeCount: item.likeCount
      }));

      const pageCandidates: PageCandidate[] = [];
      for (let index = 0; index < selectedPhotos.length; index += input.pageSize) {
        pageCandidates.push({
          pageNumber: pageCandidates.length + 1,
          photoIds: selectedPhotos.slice(index, index + input.pageSize).map((photo) => photo.photoId)
        });
      }

      return {
        selectedPhotos,
        pageCandidates
      };
    }
  };
}

function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AlbumSelectionError(`${fieldName} must be a positive integer`);
  }
}
