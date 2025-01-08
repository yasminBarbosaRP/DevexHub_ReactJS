export const pluralize = (
  word: string,
  count: number,
  pluralSuffix: string = 's',
): string => {
  return count === 1 ? word : `${word}${pluralSuffix}`;
};
