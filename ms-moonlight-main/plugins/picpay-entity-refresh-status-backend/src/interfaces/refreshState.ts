export type RefreshState = {
  entity_id: string;
  entity_ref: string;
  unprocessed_entity: string;
  unprocessed_hash?: string;
  processed_entity?: string;
  result_hash?: string;
  cache?: string;
  next_update_at: string | Date;
  last_discovery_at: string | Date; // remove?
  errors?: string;
  location_key?: string;
};
