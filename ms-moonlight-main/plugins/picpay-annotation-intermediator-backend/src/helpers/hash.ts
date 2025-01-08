import { createHash } from 'crypto';

export const hashify = (data: any) =>
  createHash('sha1')
    .update(Buffer.from(JSON.stringify(data)).toString('base64'))
    .digest('hex');
