"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const SETTINGS_PATH = path_1.default.resolve(__dirname, '../../data/settings.json');
function parseBaseUrl(url) {
    try {
        const parsed = new URL(url);
        return {
            protocol: parsed.protocol.replace(':', ''),
            host: parsed.hostname,
            port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80),
        };
    }
    catch {
        return { protocol: 'http', host: 'localhost', port: 9000 };
    }
}
const envConnection = parseBaseUrl(config_1.config.horseApi.baseUrl);
const DEFAULT_SETTINGS = {
    horseApi: { host: envConnection.host, port: envConnection.port, protocol: envConnection.protocol },
    display: { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] }, number: { decimalPlaces: 4 } },
};
function ensureFile() {
    if (!fs_1.default.existsSync(SETTINGS_PATH)) {
        fs_1.default.mkdirSync(path_1.default.dirname(SETTINGS_PATH), { recursive: true });
        fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    }
}
function getSettings() {
    ensureFile();
    try {
        const raw = fs_1.default.readFileSync(SETTINGS_PATH, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
function saveSettings(data) {
    ensureFile();
    const current = getSettings();
    const merged = {
        horseApi: { ...current.horseApi, ...data.horseApi },
        display: { ...current.display, ...data.display, grid: { ...current.display.grid, ...data.display?.grid }, number: { ...(current.display.number ?? { decimalPlaces: 4 }), ...data.display?.number } },
        logoBase64: data.logoBase64 ?? current.logoBase64,
        logoPdfBase64: data.logoPdfBase64 ?? current.logoPdfBase64,
    };
    fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
}
//# sourceMappingURL=settings.js.map