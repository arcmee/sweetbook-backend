import { createEvent, type Event } from "../../domain/event";
import { createGroup, type Group } from "../../domain/group";
import { createPhoto, type Photo } from "../../domain/photo";
import type { EventRepository } from "../ports/event-repository";
import type { GroupRepository } from "../ports/group-repository";
import type { PhotoLikeRepository } from "../ports/photo-like-repository";
import type { PhotoRepository } from "../ports/photo-repository";

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export interface CreateGroupInput {
  id: string;
  name: string;
  ownerId: string;
}

export interface CreateEventInput {
  id: string;
  groupId: string;
  title: string;
  occurredAt?: Date;
  actorId: string;
}

export interface CreatePhotoInput {
  id: string;
  eventId: string;
  uploadedByUserId: string;
  filename: string;
  createdAt?: Date;
  actorId: string;
}

export interface AddLikeInput {
  photoId: string;
  userId: string;
}

export interface GroupEventPhotoLikeWorkflowDependencies {
  groupRepository: GroupRepository;
  eventRepository: EventRepository;
  photoRepository: PhotoRepository;
  photoLikeRepository: PhotoLikeRepository;
}

export interface GroupEventPhotoLikeWorkflow {
  createGroup(input: CreateGroupInput): Promise<Group>;
  createEvent(input: CreateEventInput): Promise<Event>;
  createPhoto(input: CreatePhotoInput): Promise<Photo>;
  addLike(input: AddLikeInput): Promise<number>;
  getLikeCount(photoId: string): Promise<number>;
}

export function createGroupEventPhotoLikeWorkflow(
  dependencies: GroupEventPhotoLikeWorkflowDependencies
): GroupEventPhotoLikeWorkflow {
  return {
    async createGroup(input) {
      const group = createGroup(input);
      await dependencies.groupRepository.save(group);
      return group;
    },
    async createEvent(input) {
      const group = await dependencies.groupRepository.findById(input.groupId);
      if (!group) {
        throw new WorkflowError("group not found");
      }
      if (input.actorId !== group.ownerId) {
        throw new WorkflowError("actor is not allowed to create an event for this group");
      }

      const event = createEvent(input);
      await dependencies.eventRepository.save(event);
      return event;
    },
    async createPhoto(input) {
      const event = await dependencies.eventRepository.findById(input.eventId);
      if (!event) {
        throw new WorkflowError("event not found");
      }
      if (input.actorId !== input.uploadedByUserId) {
        throw new WorkflowError("actor is not allowed to upload this photo");
      }

      const photo = createPhoto(input);
      await dependencies.photoRepository.save(photo);
      return photo;
    },
    async addLike(input) {
      const photo = await dependencies.photoRepository.findById(input.photoId);
      if (!photo) {
        throw new WorkflowError("photo not found");
      }

      const result = await dependencies.photoLikeRepository.addLikeIfAbsent(
        input.photoId,
        input.userId
      );

      return result.count;
    },
    async getLikeCount(photoId) {
      return dependencies.photoLikeRepository.countByPhotoId(photoId);
    }
  };
}
