export const REPO_RULES = 'repo_rules';

export type RepoRules = {
  id: string;
  repository: string;
  team: string;
  until_date: Date;
};
