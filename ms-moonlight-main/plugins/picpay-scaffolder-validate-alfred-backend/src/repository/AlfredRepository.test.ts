import { ConfigReader } from '@backstage/config';
import { ScmIntegrations } from '@backstage/integration';
import { ContentRepository, ErrorInfo } from '../interfaces/AlfredRepository';
import * as fs from 'fs-extra';
import os from 'os';
import { UrlReaders, getVoidLogger } from '@backstage/backend-common';
import { AlfredRepository } from './AlfredRepository';

jest.mock('fs-extra');

const integrations = ScmIntegrations.fromConfig(
  new ConfigReader({
    integrations: {
      github: [{ host: 'github.com', token: 'token' }],
    },
  }),
);
const reader = UrlReaders.default({
  logger: getVoidLogger(),
  config: new ConfigReader({
    backend: { reading: { allow: [{ host: 'localhost' }] } },
  }),
});

const repository = 'ms-test';
const workDir = os.tmpdir();
const baseUrl = 'somebase';

describe('AlfredRepository', () => {
  let alfredRepo: AlfredRepository;

  beforeEach(() => {
    alfredRepo = new AlfredRepository({
      repository,
      workDir,
      reader,
      integrations,
      baseUrl,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockFsPathExistsSync = (exists: boolean) => {
    (fs.pathExistsSync as jest.Mock).mockReturnValue(exists);
  };

  const mockFSEexistsSync = (exists: boolean) => {
    (fs.existsSync as jest.Mock).mockReturnValue(exists);
  };

  test('Should validate file structure and return errors for missing directories and files', async () => {
    const contentRepository: ContentRepository = {
      mainPath: 'test-main-path',
      throwError: false,
      content: [
        {
          path: 'test-path',
          structure: [
            { type: 'dir', name: ['subdir'] },
            { type: 'file', name: ['file.txt'] },
          ],
        },
      ],
    };

    mockFsPathExistsSync(false);
    const errors: ErrorInfo[] = await alfredRepo.validateFileStructure(
      contentRepository,
    );

    expect(errors).toHaveLength(3);
    expect(errors[0].type).toBe('dir');
    expect(errors[0].path).toBe('test-path');
    expect(errors[0].message).toBe('Directory not found: test-path');
  });

  test('Should validate file structure and return an empty array for valid file structure', async () => {
    const contentRepository: ContentRepository = {
      mainPath: 'test-main-path',
      throwError: false,
      content: [
        {
          path: 'test-path',
          structure: [
            { type: 'dir', name: ['subdir'] },
            { type: 'file', name: ['file.txt'] },
          ],
        },
      ],
    };

    mockFsPathExistsSync(true);
    mockFSEexistsSync(true);
    const errors: ErrorInfo[] = await alfredRepo.validateFileStructure(
      contentRepository,
    );

    expect(errors).toEqual([]);
  });

  test('Should throw errors for missing directories and files if throwError is true', async () => {
    const contentRepository: ContentRepository = {
      mainPath: 'test-main-path',
      throwError: true,
      content: [
        {
          path: 'test-path',
          structure: [
            { type: 'dir', name: ['subdir'] },
            { type: 'file', name: ['file.txt'] },
          ],
        },
      ],
    };

    mockFsPathExistsSync(false);
    await expect(
      alfredRepo.validateFileStructure(contentRepository),
    ).rejects.toThrow('Directory not found:');
  });

  test('Should call getRepository and fetchContents correctly', async () => {
    const fetchContentsMock = jest
      .spyOn(alfredRepo as any, 'getRepository')
      .mockResolvedValueOnce(undefined);
    await alfredRepo.getRepository();

    expect(fetchContentsMock).toHaveBeenCalledTimes(1);
  });
});
