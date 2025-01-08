import { sanitizeMicroserviceName } from './sanitizeMicroserviceName';

describe('Sanitize Microservice Name', () => {
  it('Should throw error when microservicename is empty', () => {
    expect(() => sanitizeMicroserviceName('')).toThrow(
      'Invalid microservice name',
    );
  });

  it('Should to remove picpay-dev of microservice name', () => {
    expect(sanitizeMicroserviceName('picpay-dev-ms-testing')).toEqual(
      'ms-testing',
    );
  });

  it('Should return the same name if it has ms', () => {
    expect(sanitizeMicroserviceName('ms-testing')).toEqual('ms-testing');
  });

  it('Should add ms to microservice name', () => {
    expect(sanitizeMicroserviceName('testing')).toEqual('ms-testing');
  });
});
