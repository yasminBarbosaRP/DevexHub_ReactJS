import { Content } from '../model/Content';

export default interface Github {
  getContents(pathFile: string): Promise<Content>;
  pushFileToBranch(
    bu: string,
    owner: string,
    repository: string,
    path: string,
    file: string,
  ): Promise<void>;
}
