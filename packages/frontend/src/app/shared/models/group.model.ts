export interface GroupMember {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  ownerId: string;
  members: GroupMember[];
  memberCount: number;
}
