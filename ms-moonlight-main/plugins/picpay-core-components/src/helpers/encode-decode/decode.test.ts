import { decode } from './decode';

describe('Base64', () => {
  test('Should Decode Empty', () => {
    expect(decode()).toEqual('');
  });

  test('Should Decode String', () => {
    expect(decode('Zm9vPWJhcg==')).toEqual('foo=bar');
  });
});
