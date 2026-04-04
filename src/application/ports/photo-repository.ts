import type { EventId, Photo, PhotoId } from "../../domain/photo";

export interface PhotoRepository {
  findById(id: PhotoId): Promise<Photo | null>;
  findByEventId(eventId: EventId): Promise<Photo[]>;
  save(photo: Photo): Promise<void>;
}

export const PhotoRepository = Symbol("PhotoRepository");
