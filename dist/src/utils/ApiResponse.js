export class ApiResponse {
    statusCode;
    data;
    message;
    success;
    constructor(statusCode, data, message = 'Success', ..._ignored) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}
