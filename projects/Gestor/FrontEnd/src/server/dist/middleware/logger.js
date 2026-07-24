"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("../config");
const format = config_1.config.nodeEnv === 'production' ? 'combined' : 'dev';
exports.requestLogger = (0, morgan_1.default)(format, {
    skip: (req) => req.url === '/health',
});
//# sourceMappingURL=logger.js.map