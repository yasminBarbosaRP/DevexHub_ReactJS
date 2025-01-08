export const decode = (str?: string): string => {
  if (str === undefined) {
    return '';
  }

  return Buffer.from(str, 'base64').toString();
}