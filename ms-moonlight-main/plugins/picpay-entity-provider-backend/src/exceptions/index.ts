export class BadRequestError extends Error {
    constructor(message: string = "Bad Request") {
        super(message);
        this.name = "BadRequestError";
    }
}