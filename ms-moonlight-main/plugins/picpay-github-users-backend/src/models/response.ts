export type UserInfo = {
  id: string;
  user_id: string;
  personal_email: string;
  username: string;
  sso_email: string;
  joined_at: string | null;
  first_collaboration: {
    commit: string | null;
    commit_id: string | null;
    commit_date: string | null;
    deploy_date: string | null;
    service: {
      id: string | null;
      name: string | null;
    } | null;
  } | null;
  removed_at: string | null;
  is_on_org: boolean;
  last_update: string;
};

export type ResponseModel = {
  page: number;
  has_next_page: boolean;
  data: UserInfo[];
};

export type UserResponse = {
  user_id: string;
  personal_email: string;
  username: string;
  sso_email: string;
  joined_at?: string | null;
  removed_at?: string | null;
  is_on_org?: boolean;
  groups: string[];
};
