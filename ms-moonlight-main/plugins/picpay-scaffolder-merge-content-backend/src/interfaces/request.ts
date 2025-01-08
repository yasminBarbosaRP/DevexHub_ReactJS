export type ContentsRepository = {
  getContent(repo: string, filename: string): Promise<any>;
};
