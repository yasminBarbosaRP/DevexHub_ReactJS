export type CatalogComponent = {
  id?: string;
  ms: string;
  description: string | null;
  owner: string;
  lifecycle: string;
  bu?: string | null;
  language?: string;
  framework?: string;
  tags?: string;
  cluster_prd?: string;
  cluster_hom?: string;
  repository_id?: string;
  repository_created_at?: string;
};

export enum RelationsType {
  CHILDOF = 'CHILDOF',
  OWNEROF = 'OWNEROF',
  HASMEMBER = 'HASMEMBER',
  PARENTOF = 'PARENTOF',
}
