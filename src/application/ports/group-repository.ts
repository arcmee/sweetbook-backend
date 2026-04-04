import type { Group, GroupId } from "../../domain/group";

export interface GroupRepository {
  findById(id: GroupId): Promise<Group | null>;
  save(group: Group): Promise<void>;
}

export const GroupRepository = Symbol("GroupRepository");
