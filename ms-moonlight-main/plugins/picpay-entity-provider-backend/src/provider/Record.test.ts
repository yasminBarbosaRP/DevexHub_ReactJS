import { EntityRef } from "./Record";

describe('EntityRef', () => {
    describe('constructor', () => {
      it('should set the type, name, and namespace properties', () => {
        const entityRef = new EntityRef({
          type: 'user',
          name: 'john-doe',
          namespace: 'example',
        });
  
        expect(entityRef.type).toBe('user');
        expect(entityRef.name).toBe('john-doe');
        expect(entityRef.namespace).toBe('example');
      });
  
      it('should set the namespace property to undefined if args is null', () => {
        const entityRef = new EntityRef(null);
  
        expect(entityRef.namespace).toBeUndefined();
      });
    });
  
    describe('equals', () => {
      it('should return true if the properties of two EntityRef objects are equal', () => {
        const entityRef1 = new EntityRef({
          type: 'user',
          name: 'john-doe',
          namespace: 'example',
        });
  
        const entityRef2 = new EntityRef({
          type: 'user',
          name: 'john-doe',
          namespace: 'example',
        });
  
        expect(entityRef1.equals(entityRef2)).toBe(true);
      });
  
      it('should return false if the properties of two EntityRef objects are not equal', () => {
        const entityRef1 = new EntityRef({
          type: 'user',
          name: 'john-doe',
          namespace: 'example',
        });
  
        const entityRef2 = new EntityRef({
          type: 'group',
          name: 'Jane Smith',
          namespace: 'example',
        });
  
        expect(entityRef1.equals(entityRef2)).toBe(false);
      });
    });
  
    describe('toString', () => {
      it('should return a string representation of the EntityRef object', () => {
        const entityRef = new EntityRef({
          type: 'user',
          name: 'john-doe',
          namespace: 'example',
        });
  
        expect(entityRef.toString()).toBe('user:example/john-doe');
      });
    });
  });
  