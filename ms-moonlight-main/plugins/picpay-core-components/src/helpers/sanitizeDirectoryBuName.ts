export const sanitizeDirectoryBuName = (bu: string): string => {
  if (!bu) {
    throw new Error('Invalid BU name');
  }

  return bu.replace(/[- ]/g, '_');
};
