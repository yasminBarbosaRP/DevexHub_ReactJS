import { NoResultError, ValidationError,MultipleResultError } from './errors';

describe('Error classes', () => {
  it('should create a NoResultError with a message', () => {
    const msg = 'No result found';
    const error = new NoResultError(msg);
    expect(error.message).toBe(msg);
    expect(error).toBeInstanceOf(NoResultError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create a ValidationError with a message', () => {
    const msg = 'Validation failed';
    const error = new ValidationError(msg);
    expect(error.message).toBe(msg);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(Error);
  });
  
  it('should create a MultipleResultError with a message', () => {
    const msg = 'Multiple Result error';
    const error = new MultipleResultError(msg);
    expect(error.message).toBe(msg);
    expect(error).toBeInstanceOf(MultipleResultError);
    expect(error).toBeInstanceOf(Error);
  });
});