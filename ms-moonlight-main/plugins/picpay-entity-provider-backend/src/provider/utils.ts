import _ from 'lodash';

export function removeEspecialCharacter(value: string | null): string {
  if (!value) {
    return value as string;
  }

  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function clearName(name: string): string {
  return removeEspecialCharacter(`${name}`)
    .toLowerCase()
    .replace(/[^0-9a-z]/g, ' ')
    .split(' ')
    .filter(i => i)
    .join('-');
}

export function userRefByEmail(email: string | null | undefined): {
  type: 'user' | 'group';
  name: string;
  namespace: string;
} | null {
  if (!email) {
    return null;
  }

  const res = removeEspecialCharacter(email.toLocaleLowerCase());

  const arr = res.split('@');

  if (!arr || arr.length !== 2) {
    return null;
  }

  const domain = arr[1].split('.');
  if (domain.length < 2) {
    return null;
  }

  return { type: `user`, name: clearName(arr[0]), namespace: domain[0] };
}

export function titleCase(str: string) {
  if (!str) {
    return str;
  }

  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const cleanArray = (o: any) => (_.isArray(o) ? _.compact(o) : o);

export const cleanObject = (o: any) =>
  _.transform(o, (r: any, v: any, k: any) => {
    const isObject = _.isObject(v);
    const val = isObject ? cleanArray(cleanObject(v)) : v;
    const keep = isObject
      ? !_.isUndefined(val) && !_.isEmpty(val)
      : Boolean(val);

    if (keep) r[k] = val;
  });
