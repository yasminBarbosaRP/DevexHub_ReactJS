import { RawDbAnnotationRow } from '../database/tables';

export interface AnnotationUseCase {
  upsert(data: RawDbAnnotationRow): Promise<RawDbAnnotationRow[]>;
  get(filter: Record<string, string>): Promise<RawDbAnnotationRow[]>;
  create(data: RawDbAnnotationRow): Promise<RawDbAnnotationRow>;
  update(
    id: string,
    data: Partial<RawDbAnnotationRow>,
  ): Promise<RawDbAnnotationRow[]>;
  remove(id: string): Promise<boolean>;
}
