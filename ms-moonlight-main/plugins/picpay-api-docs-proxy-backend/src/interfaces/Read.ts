export interface Read<T> {
  find(item: Partial<T>): Promise<T[]>;
  findById(id: string): Promise<T[]>;
  findAll(page: number): Promise<T[]>;
  findOne(item: Partial<T>): Promise<T>;
  getMaxCreatedAtByUser(user: string): Promise<T>;
}
