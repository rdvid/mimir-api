export class ApiError extends Error {
    data;
    statusCode;
    success;
    errors;
    constructor(statusCode, message = 'Something went wrong', errors = []) {
        super(message);
        this.data = null;
        this.statusCode = statusCode;
        this.message = message;
        this.success = false;
        this.errors = errors;
    }
}
