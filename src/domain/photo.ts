export type PhotoId = string;
export type EventId = string;
export type UserId = string;

export interface PhotoProps {
  id: PhotoId;
  eventId: EventId;
  uploadedByUserId: UserId;
  filename: string;
  createdAt?: Date;
}

export class Photo {
  public readonly id: PhotoId;
  public readonly eventId: EventId;
  public readonly uploadedByUserId: UserId;
  public readonly filename: string;
  public readonly createdAt: Date;

  private constructor(props: Required<PhotoProps>) {
    this.id = props.id;
    this.eventId = props.eventId;
    this.uploadedByUserId = props.uploadedByUserId;
    this.filename = props.filename;
    this.createdAt = props.createdAt;
  }
}

export function createPhoto(props: PhotoProps): Photo {
  const id = normalizeRequiredText(props.id, "photo id");
  const eventId = normalizeRequiredText(props.eventId, "photo event id");
  const uploadedByUserId = normalizeRequiredText(props.uploadedByUserId, "photo uploader id");
  const filename = normalizeRequiredText(props.filename, "photo filename");

  return new Photo({
    id,
    eventId,
    uploadedByUserId,
    filename,
    createdAt: props.createdAt ?? new Date()
  });
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}
