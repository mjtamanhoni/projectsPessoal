"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
//# sourceMappingURL=types.js.map