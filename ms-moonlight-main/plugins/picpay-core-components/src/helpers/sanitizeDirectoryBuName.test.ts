import { sanitizeDirectoryBuName } from './sanitizeDirectoryBuName';

describe('Sanitize Microservice Name', () => {
  it('Should throw error when bu name is empty', () => {
    expect(() => sanitizeDirectoryBuName('')).toThrow('Invalid BU name');
  });

  it('Should to chante hyphen to underscore', () => {
    expect(sanitizeDirectoryBuName('bu-name')).toEqual('bu_name');
  });

  it('Should to chante blanks caracters to underscore', () => {
    expect(sanitizeDirectoryBuName('bu name')).toEqual('bu_name');
    expect(sanitizeDirectoryBuName('bu name 1')).toEqual('bu_name_1');
    expect(sanitizeDirectoryBuName('bu name 2')).toEqual('bu_name_2');
  });

  it('Should to change hyphen and blanks caracters to underscore', () => {
    expect(sanitizeDirectoryBuName('bu name-1')).toEqual('bu_name_1');
  });
});
