import fs from 'fs-extra';
import { makeCommitMsg, writeFileRecursiveTreeSync } from './utils';

jest.mock('fs-extra');

describe('#writeFileRecursiveTreeSync', () => {
  it('should save file successfully', () => {
    const output = 'tmp/apps/hom/filename.json';
    const content = '{"foo":"bar"}';

    writeFileRecursiveTreeSync(output, content);

    expect(fs.mkdirSync).toHaveBeenCalledWith('tmp/apps/hom', {
      recursive: true,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'tmp/apps/hom/filename.json',
      '{"foo":"bar"}',
      { encoding: 'utf-8' },
    );
  });
});

describe('#makeCommitMsg', () => {
  it('should make a commit message correctly', () => {
    const commitMsg = makeCommitMsg('ms-fake-service');

    expect(commitMsg).toEqual(
      'Exclude legacy clusters from ms-fake-service and adding new one.',
    );
  });
});
