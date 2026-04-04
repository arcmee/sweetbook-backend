export type EventId = string;
export type GroupId = string;

export interface EventProps {
  id: EventId;
  groupId: GroupId;
  title: string;
  occurredAt?: Date;
}

export class Event {
  public readonly id: EventId;
  public readonly groupId: GroupId;
  public readonly title: string;
  public readonly occurredAt: Date;

  private constructor(props: Required<EventProps>) {
    this.id = props.id;
    this.groupId = props.groupId;
    this.title = props.title;
    this.occurredAt = props.occurredAt;
  }
}

export function createEvent(props: EventProps): Event {
  const id = normalizeRequiredText(props.id, "event id");
  const groupId = normalizeRequiredText(props.groupId, "event group id");
  const title = normalizeRequiredText(props.title, "event title");

  return new Event({
    id,
    groupId,
    title,
    occurredAt: props.occurredAt ?? new Date()
  });
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}
