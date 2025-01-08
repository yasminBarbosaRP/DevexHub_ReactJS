export interface Read<T> {
  find(item: Partial<T>): Promise<T[]>;
  findById(id: string): Promise<T[]>;
  findAll(): Promise<T[]>;
  findOne(item: Partial<T>): Promise<T>;
  getMaxCreatedAtByUser(user: string): Promise<T>;
}
