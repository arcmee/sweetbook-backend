export type PhotoId = string;
export type UserId = string;

export interface AddLikeResult {
  added: boolean;
  count: number;
}

export interface PhotoLikeRepository {
  countByPhotoId(photoId: PhotoId): Promise<number>;
  addLikeIfAbsent(photoId: PhotoId, userId: UserId): Promise<AddLikeResult>;
}

export const PhotoLikeRepository = Symbol("PhotoLikeRepository");
