export interface Write<T> {
  create(item: Partial<T>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T[]>;
  delete(id: string): Promise<boolean>;
}
