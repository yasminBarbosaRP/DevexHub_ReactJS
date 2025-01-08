import { base64Encode, base64Decode, fixedGitHubURL } from './helpers';

describe('helpers', () => {
  describe('base64Encode', () => {
    it('should encode a string to base64', () => {
      const input = 'test';
      const expectedOutput = 'dGVzdA==';
      expect(base64Encode(input)).toBe(expectedOutput);
    });
  });

  describe('base64Decode', () => {
    it('should decode a base64 string to a string', () => {
      const input = 'dGVzdA==';
      const expectedOutput = 'test';
      expect(base64Decode(input)).toBe(expectedOutput);
    });

    it('should decode a base64 string to JSON', () => {
      const input = Buffer.from(JSON.stringify({ key: 'value' })).toString('base64');
      const expectedOutput = { key: 'value' };
      expect(base64Decode(input, 'json')).toEqual(expectedOutput);
    });

    it('should return an empty string if content is undefined', () => {
      expect(base64Decode(undefined)).toBe('');
    });

    it('should return the original base64 string if output is base64', () => {
      const input = 'dGVzdA==';
      expect(base64Decode(input, 'base64')).toBe(input);
    });
  });

  describe('fixedGitHubURL', () => {
    it('should format GitHub API URL to regular URL', () => {
      const input = 'https://api.github.com/repos/user/repo/pulls/1';
      const expectedOutput = 'https://github.com/user/repo/pull/1';
      expect(fixedGitHubURL(input)).toBe(expectedOutput);
    });
  });
});
