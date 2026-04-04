import type { Event, EventId } from "../../domain/event";

export interface EventRepository {
  findById(id: EventId): Promise<Event | null>;
  findByGroupId(groupId: string): Promise<Event[]>;
  save(event: Event): Promise<void>;
}

export const EventRepository = Symbol("EventRepository");
