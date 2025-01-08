import { sanitizeDirectoryBuNameFile } from './sanitizeDirectoryBuNameFile';

describe('Sanitize Microservice Name', () => {
  it('Should throw error when bu name is empty', () => {
    expect(() => sanitizeDirectoryBuNameFile('')).toThrow('Invalid BU name');
  });

  it('Should to change underscore to hyphen', () => {
    expect(sanitizeDirectoryBuNameFile('bu_name')).toEqual('bu-name');
  });

  it('Should to chante blanks caracters to hyphen', () => {
    expect(sanitizeDirectoryBuNameFile('bu name')).toEqual('bu-name');
    expect(sanitizeDirectoryBuNameFile('bu name 1')).toEqual('bu-name-1');
    expect(sanitizeDirectoryBuNameFile('bu name 2')).toEqual('bu-name-2');
  });

  it('Should to change underscore and blanks caracters to hyphen', () => {
    expect(sanitizeDirectoryBuNameFile('bu name_1')).toEqual('bu-name-1');
  });
});
