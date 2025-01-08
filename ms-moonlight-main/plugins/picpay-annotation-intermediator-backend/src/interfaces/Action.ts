export interface Action<T> {
  countOf(): Promise<number>;
  add(table: Partial<T>): Promise<T>;
  change(id: string, table: Partial<T>): Promise<boolean>;
}
