export class MultipleResultError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, MultipleResultError.prototype);
  }
}

export class NoResultError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, NoResultError.prototype);
  }
}

export class ValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
