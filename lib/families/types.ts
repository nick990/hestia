export type Family = {
  id: string;
  name: string;
  created_at: string;
};

export type FamilyMembership = {
  family_id: string;
  family_name: string;
};

export type FamilyMemberRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  joined_at: string;
};

export type FamilyWithMembers = Family & {
  members: FamilyMemberRow[];
};

export type AssignableMember = {
  auth_user_id: string;
  email: string;
  full_name: string | null;
  family_id: string | null;
  family_name: string | null;
};
