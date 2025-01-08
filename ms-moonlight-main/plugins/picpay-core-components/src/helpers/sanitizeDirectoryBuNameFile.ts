export const sanitizeDirectoryBuNameFile = (bu: string): string => {
  if (!bu) {
    throw new Error('Invalid BU name');
  }

  return bu.replace(/[_ ]/g, '-');
};
