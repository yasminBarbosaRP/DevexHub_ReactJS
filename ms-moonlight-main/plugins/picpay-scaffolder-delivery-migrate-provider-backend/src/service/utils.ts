import path from 'path';
import fs from 'fs-extra';

export const writeFileRecursiveTreeSync = (
  output: string,
  content: string,
): void => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, content, { encoding: 'utf-8' });
};

export const cleanUp = (workspace: string, files: string[]) => {
  for (const file of files) {
    try {
      const basepath = file.split(path.sep)[0] || '';
      const pathname = path.join(workspace, basepath);
      fs.rmSync(pathname, { recursive: true });
    } catch (e: any) {
      switch (e.code) {
        case 'ENOENT':
          console.warn(`Path ${file} does not found.`);
          break;
        default:
          throw e;
      }
    }
  }
};
export function makeCommitMsg(serviceName: string): string {
  return `Exclude legacy clusters from ${serviceName} and adding new one.`;
}

export enum Environment {
  HOMOLOG = 'homolog',
  PRODUCTION = 'production',
}
