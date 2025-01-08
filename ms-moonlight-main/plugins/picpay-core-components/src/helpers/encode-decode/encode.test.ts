import { encode } from './encode';

describe('Base64', () => {
  test('Should Encode String', () => {
    expect(encode('foo=bar')).toEqual('Zm9vPWJhcg==');
  });
});
