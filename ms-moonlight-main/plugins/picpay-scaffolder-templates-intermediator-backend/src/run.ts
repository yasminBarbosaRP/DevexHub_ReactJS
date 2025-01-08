import { getRootLogger } from '@backstage/backend-common';
import { standAlone } from './standAlone';

const port = 10000;
const enableCors = true
const logger = getRootLogger();

standAlone({ port, enableCors, logger }).catch(err => {
  logger.error(err);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('CTRL+C pressed; exiting.');
  process.exit(0);
});