export type PhotoId = string;
export type UserId = string;

export interface PhotoLikeRepository {
  countByPhotoId(photoId: PhotoId): Promise<number>;
  hasUserLikedPhoto(photoId: PhotoId, userId: UserId): Promise<boolean>;
  recordLike(photoId: PhotoId, userId: UserId): Promise<void>;
}

export const PhotoLikeRepository = Symbol("PhotoLikeRepository");
