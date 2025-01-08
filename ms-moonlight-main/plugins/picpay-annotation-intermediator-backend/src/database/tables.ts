export const DB_TABLE = 'additional_annotations';
export const ROUTER_MOONLIGHT_GENERAL = 'ms-moonlight-general';

export type RawDbAnnotationRow = {
  id?: string;
  filter: { [k: string]: any };
  annotation?: { [k: string]: any };
  extraFields?: { [k: string]: any };
  error?: string;
  filter_hash?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
};
