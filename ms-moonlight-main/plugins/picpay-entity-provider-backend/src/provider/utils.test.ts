import {
  clearName,
  removeEspecialCharacter,
  titleCase,
  userRefByEmail,
} from './utils';

describe('removeEspecialCharacter', () => {
  it('should remove special characters from a string', () => {
    const input = 'àéîõü';

    const output = removeEspecialCharacter(input);

    expect(output).toBe('aeiou');
  });

  it('should return the same string if there are no special characters', () => {
    const input = 'abc123';

    const output = removeEspecialCharacter(input);

    expect(output).toEqual(input);
  });

  it('should return the input if it is not a string', () => {
    const input = null;

    const output = removeEspecialCharacter(input);

    expect(output).toEqual(input);
  });
});

describe('userRefByEmail', () => {
  it('should return a user reference by email', () => {
    const output = userRefByEmail('NAME@NAMESPACE.COM');

    expect(output).toEqual({
      type: 'user',
      name: 'name',
      namespace: 'namespace',
    });
  });

  it('should return null if the email is not valid', () => {
    const output = userRefByEmail('invalid-email');

    expect(output).toBeNull();
  });

  it('should return null if the email is not provided', () => {
    const undefinedOut = userRefByEmail(undefined);
    const nullOut = userRefByEmail(null);

    expect(undefinedOut).toBeNull();
    expect(nullOut).toBeNull();
  });
});

describe('titleCase', () => {
  it('should convert a string to title case', () => {
    const values = [
      { input: '', output: '' },
      { input: 'hello', output: 'Hello' },
      { input: 'hello world', output: 'Hello World' },
      { input: 'HELLO WORLD', output: 'Hello World' },
    ];

    values.forEach(({ input, output }) => {
      expect(titleCase(input)).toBe(output);
    });
  });
});

describe('groupName', () => {
  it('should return a group name', () => {
    const values = [
      { input: 'Test abc', output: 'test-abc' },
      { input: 'Test abc', output: 'test-abc' },
      { input: 'Test def', output: 'test-def' },
      { input: 'Test ghi', output: 'test-ghi' },
      { input: 'Test jkl', output: 'test-jkl' },
      { input: 'Test ãêí', output: 'test-aei' },
    ];

    values.forEach(({ input, output }) => {
      expect(clearName(input)).toBe(output);
    });
  });
});
