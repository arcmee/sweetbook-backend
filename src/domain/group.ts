export type GroupId = string;
export type UserId = string;

export interface GroupProps {
  id: GroupId;
  name: string;
  ownerId: UserId;
  createdAt?: Date;
}

export class Group {
  public readonly id: GroupId;
  public readonly name: string;
  public readonly ownerId: UserId;
  public readonly createdAt: Date;

  private constructor(props: Required<GroupProps>) {
    this.id = props.id;
    this.name = props.name;
    this.ownerId = props.ownerId;
    this.createdAt = props.createdAt;
  }
}

export function createGroup(props: GroupProps): Group {
  const id = normalizeRequiredText(props.id, "group id");
  const name = normalizeRequiredText(props.name, "group name");
  const ownerId = normalizeRequiredText(props.ownerId, "group owner id");

  return new Group({
    id,
    name,
    ownerId,
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
