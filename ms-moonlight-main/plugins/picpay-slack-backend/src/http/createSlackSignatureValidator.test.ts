import { createSlackSignatureValidator } from './createSlackSignatureValidator';
import { RequestDetails, RequestValidationContext } from '@backstage/plugin-events-node';
import { ConfigReader } from '@backstage/config';
import crypto from 'crypto';

describe('createSlackSignatureValidator', () => {
  const signingSecret = 'test-signing-secret';
  const config = new ConfigReader({ slack: { signingSecret } });
  const validator = createSlackSignatureValidator(config);
  const currentTimestamp = Math.floor(Date.now() / 1000).toString();

  let context: RequestValidationContext;

  beforeEach(() => {
    context = {
      reject: jest.fn(),
    } as unknown as RequestValidationContext;
    jest.spyOn(Date, 'now').mockReturnValue(parseInt(currentTimestamp, 10) * 1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('header validation', () => {
    it('should reject when signature is missing', async () => {
      const request = {
        headers: {
          'x-slack-request-timestamp': '12345',
        },
        body: 'test body',
      } as unknown as RequestDetails;

      await validator(request, context);

      expect(context.reject).toHaveBeenCalledWith({
        status: 403,
        payload: { message: 'Missing signature' },
      });
    });

    it('should reject when timestamp is missing', async () => {
      const request = {
        headers: {
          'x-slack-signature': 'v0=fakesignature',
        },
        body: 'test body',
      } as unknown as RequestDetails;

      await validator(request, context);

      expect(context.reject).toHaveBeenCalledWith({
        status: 403,
        payload: { message: 'Missing timestamp' },
      });
    });
  });

  describe('body validation', () => {
    it('should reject when body is missing', async () => {
      const request = {
        headers: {
          'x-slack-signature': 'v0=fakesignature',
          'x-slack-request-timestamp': currentTimestamp,
        },
      } as unknown as RequestDetails;

      await validator(request, context);
      expect(context.reject).toHaveBeenCalledWith({
        status: 403,
        payload: { message: 'Missing body' },
      });
    });

    it('should handle slack form-encoded payload', async () => {
      const bodyObj = { payload: '{"test":"value"}' };
      const encodedBody = new URLSearchParams(bodyObj).toString();
      const sigBasestring = `v0:${currentTimestamp}:${encodedBody}`;
      const validSignature = `v0=${crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex')}`;

      const request = {
        headers: {
          'x-slack-signature': validSignature,
          'x-slack-request-timestamp': currentTimestamp,
        },
        body: bodyObj,  // Using the object directly as body
      } as unknown as RequestDetails;

      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);
      await validator(request, context);
      expect(context.reject).not.toHaveBeenCalled();
    });

    it('should handle raw form-encoded string as object', async () => {
      // Convert the raw string into an object format
      const bodyObj = { payload: '{"test":"value"}' };
      const sigBasestring = `v0:${currentTimestamp}:${new URLSearchParams(bodyObj).toString()}`;
      const validSignature = `v0=${crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex')}`;

      const request = {
        headers: {
          'x-slack-signature': validSignature,
          'x-slack-request-timestamp': currentTimestamp,
        },
        body: bodyObj,  // Using the object format instead of raw string
      } as unknown as RequestDetails;

      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);
      await validator(request, context);
      expect(context.reject).not.toHaveBeenCalled();
    });
  });

  describe('signature validation', () => {
    it('should reject request with old timestamp', async () => {
      const oldTimestamp = (parseInt(currentTimestamp, 10) - 301).toString();
      const bodyObj = { payload: 'test' };
      const request = {
        headers: {
          'x-slack-signature': 'v0=anysignature',
          'x-slack-request-timestamp': oldTimestamp,
        },
        body: bodyObj,
      } as unknown as RequestDetails;

      await validator(request, context);
      expect(context.reject).toHaveBeenCalledWith({
        status: 403,
        payload: { message: 'Invalid signature' },
      });
    });

    it('should reject invalid signature', async () => {
      const bodyObj = { payload: 'test' };
      const request = {
        headers: {
          'x-slack-signature': 'v0=invalidsignature',
          'x-slack-request-timestamp': currentTimestamp,
        },
        body: bodyObj,
      } as unknown as RequestDetails;

      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);
      await validator(request, context);
      expect(context.reject).toHaveBeenCalledWith({
        status: 403,
        payload: { message: 'Invalid signature' },
      });
    });

    it('should pass when signature is valid', async () => {
      const bodyObj = { payload: 'test body' };
      const encodedBody = new URLSearchParams(bodyObj).toString();
      const sigBasestring = `v0:${currentTimestamp}:${encodedBody}`;
      const validSignature = `v0=${crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex')}`;

      const request = {
        headers: {
          'x-slack-signature': validSignature,
          'x-slack-request-timestamp': currentTimestamp,
        },
        body: bodyObj,  // Using the object format
      } as unknown as RequestDetails;

      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      await validator(request, context);

      expect(context.reject).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });
});