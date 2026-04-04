export type PhotoId = string;
export type UserId = string;

export interface PhotoLikeRepository {
  countByPhotoId(photoId: PhotoId): Promise<number>;
  hasUserLikedPhoto(photoId: PhotoId, userId: UserId): Promise<boolean>;
}

export const PhotoLikeRepository = Symbol("PhotoLikeRepository");
