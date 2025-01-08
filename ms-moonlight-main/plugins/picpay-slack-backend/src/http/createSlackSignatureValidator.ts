import { RequestDetails, RequestValidationContext, RequestValidator } from '@backstage/plugin-events-node';
import { Config } from '@backstage/config';
import { trace } from '@opentelemetry/api';

export const createSlackSignatureValidator = (config: Config): RequestValidator => {
  const signingSecret = config.getString('slack.signingSecret');

  return async (
    request: RequestDetails,
    context: RequestValidationContext,
  ): Promise<void> => {
    const signature = request.headers['x-slack-signature'] as string | undefined;
    const timestamp = request.headers['x-slack-request-timestamp'] as string | undefined;
    
    const params = new URLSearchParams();
    if (typeof request.body === 'object' && request.body !== null) {
      Object.entries(request.body).forEach(([key, value]) => {
        params.append(key, value as string);
      });
    }

    const rawBody = params.toString();
    const span = trace.getActiveSpan();

    if (!signature) {
      span?.addEvent('Request rejected', {
        reason: 'Missing signature',
      });
      context.reject({
        status: 403,
        payload: { message: 'Missing signature' },
      });
      return;
    }

    if (!timestamp) {
      span?.addEvent('Request rejected', {
        reason: 'Missing timestamp',
      });
      context.reject({
        status: 403,
        payload: { message: 'Missing timestamp' },
      });
      return;
    }

    if (!rawBody) {
      span?.addEvent('Request rejected', {
        reason: 'Missing body',
      });
      context.reject({
        status: 403,
        payload: { message: 'Missing body' },
      });
      return;
    }

    const isValid = verifySlackRequest(
      signingSecret,
      rawBody,
      timestamp,
      signature
    );
    if (!isValid) {
      span?.addEvent('Request rejected', {
        reason: 'Invalid signature',
      });
      context.reject({
        status: 403,
        payload: { message: 'Invalid signature' },
      });
    }
  };
};

// Helper function to verify Slack request signature
function verifySlackRequest(
  signingSecret: string,
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  const crypto = require('crypto');
  const version = 'v0';
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;

  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    return false;
  }

  const sigBasestring = `${version}:${timestamp}:${body}`;
  
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBasestring);
  const mySignature = `v0=${hmac.digest('hex')}`;
  

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}
