import { removeProblematicLocationsScheduler } from './EntityCleanUp';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { PluginTaskScheduler } from '@backstage/backend-tasks';

// Mocking the dependencies
const mockLogger: Logger = jest.fn() as any;
const mockConfig: Config = {
  getString: jest.fn().mockReturnValue('mocked value'), // Add this line
} as any;
const mockScheduler: PluginTaskScheduler = {
  createScheduledTaskRunner: jest.fn().mockReturnValue({
    run: jest.fn(), // Add this line
  }),
} as any;

describe('EntityCleanUp', () => {
  it('should call removeProblematicLocationsScheduler without error', async () => {
    const options = {
      logger: mockLogger,
      config: mockConfig,
      scheduler: mockScheduler,
    };

    await expect(removeProblematicLocationsScheduler(options)).resolves.not.toThrow();
  });
});