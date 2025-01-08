import { Database } from '../database/Database';
import { RawDbAnnotationRow } from '../database/tables';
import { hashify } from '../helpers/hash';
import { AnnotationUseCase } from '../interfaces/AnnotationUseCase';
import { AnnotationsRepository } from '../repositories/AnnotationsRepository';

type Options = {
  database: Database;
};

export class Annotations implements AnnotationUseCase {
  private readonly annotations: AnnotationsRepository;

  constructor(options: Options) {
    this.annotations = options.database.annotationsRepository();
  }

  public async get(
    filter: Record<string, string>,
  ): Promise<RawDbAnnotationRow[]> {
    const annotations = await this.annotations.find(filter);
    if (!annotations) {
      return Promise.resolve([]);
    }

    return Promise.resolve(annotations);
  }

  public async upsert(
    requestData: RawDbAnnotationRow,
  ): Promise<RawDbAnnotationRow[]> {
    const items = await this.get(requestData.filter);
    requestData.filter_hash = hashify(requestData.filter);

    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        if (!requestData.annotation) requestData.annotation = {};
        if (!requestData.extraFields) requestData.extraFields = {};
        for (const key of Object.keys(requestData.annotation)) {
          if (
            requestData.annotation[key] === null &&
            items[i]?.annotation?.hasOwnProperty(key)
          ) {
            delete items[i]!.annotation![key];
          } else {
            items[i].annotation = {
              ...(items[i].annotation ?? {}),
              [key]: requestData.annotation[key],
            };
          }
        }
        for (const key of Object.keys(requestData.extraFields)) {
          if (
            requestData.extraFields[key] === null &&
            items[i]?.extraFields?.hasOwnProperty(key)
          ) {
            delete items[i]!.extraFields![key];
          } else {
            items[i].extraFields = {
              ...(items[i].extraFields ?? {}),
              [key]: requestData.extraFields[key],
            };
          }
        }
        this.update(items[i].id ?? '', items[i]);
      }
      return Promise.resolve(items);
    }

    requestData.created_at = new Date();
    return [await this.annotations.create(requestData)];
  }

  public async create(data: RawDbAnnotationRow): Promise<RawDbAnnotationRow> {
    data.created_at = new Date();
    data.filter_hash = hashify(data.filter);
    return await this.annotations.create(data);
  }

  public async update(
    id: string,
    data: Partial<RawDbAnnotationRow>,
  ): Promise<RawDbAnnotationRow[]> {
    data.updated_at = new Date();
    data.filter_hash = hashify(data.filter);
    return await this.annotations.update(id, data);
  }

  public async remove(id: string): Promise<boolean> {
    return await this.annotations.delete(id);
  }
}
