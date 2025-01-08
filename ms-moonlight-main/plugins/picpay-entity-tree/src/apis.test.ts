import { getBusinessUnit } from './apis';

describe('getBusinessUnit', () => {
  it('should return the name if the type is business-unit', async () => {
    const parent = {
      name: 'Test',
      type: 'business-unit',
      kind: 'some-kind',
      parents: [],
    };

    const result = await getBusinessUnit(parent);

    expect(result).toBe('Test');
  });

  it('should return the name of the first parent that is a business-unit', async () => {
    const parent = {
      name: 'Test',
      type: 'not-business-unit',
      kind: 'some-kind',
      parents: [
        {
          name: 'Parent',
          type: 'business-unit',
          kind: 'some-kind',
          parents: [],
        },
      ],
    };

    const result = await getBusinessUnit(parent);

    expect(result).toBe('Parent');
  });

  it('should continue to the next parent if an error is thrown', async () => {
    const parent = {
      name: 'Test',
      type: 'not-business-unit',
      kind: 'some-kind',
      parents: [
        {
          name: 'Parent',
          type: 'not-business-unit',
          kind: 'some-kind',
          parents: [],
        },
        {
          name: 'Parent2',
          type: 'business-unit',
          kind: 'some-kind',
          parents: [],
        },
      ],
    };

    const result = await getBusinessUnit(parent);

    expect(result).toBe('Parent2');
  });
});