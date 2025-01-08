export interface Read<T, U> {
  find(item: Partial<T>): Promise<U[]>;
}
