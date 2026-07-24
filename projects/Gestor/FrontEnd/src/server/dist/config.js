"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '..', '.env') });
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    horseApi: {
        baseUrl: process.env.HORSE_API_BASE_URL || 'http://localhost:9000',
        jwtSecret: process.env.HORSE_JWT_SECRET || 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d',
    },
};
//# sourceMappingURL=config.js.map