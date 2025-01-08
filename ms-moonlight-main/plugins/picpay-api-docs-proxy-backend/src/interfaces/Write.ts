export interface Write<T> {
  create(item: Partial<T>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
