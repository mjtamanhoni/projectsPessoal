"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EMPRESA = void 0;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.getEmpresaSettings = getEmpresaSettings;
exports.saveEmpresaSettings = saveEmpresaSettings;
exports.getFinanceiroEmpresa = getFinanceiroEmpresa;
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
exports.DEFAULT_EMPRESA = {
    display: { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] }, number: { decimalPlaces: 4 } },
    sessionTimeout: 30,
    printer: {
        modelo: 0,
        porta: '',
        deviceParams: '',
        colunas: 48,
        espacoEntreLinhas: 0,
        linhasBuffer: 0,
        linhasPular: 0,
        cortarPapel: true,
        controlePorta: false,
        paginaCodigo: 0,
        barrasLargura: 2,
        barrasAltura: 100,
        barrasHRI: true,
        qrcodeTipo: 2,
        qrcodeLarguraModulo: 6,
        qrcodeErrorLevel: 2,
        logoKC1: 0,
        logoKC2: 0,
        logoFatorX: 0,
        logoFatorY: 0,
    },
};
const DEFAULT_FILE = {
    horseApi: { host: envConnection.host, port: envConnection.port, protocol: envConnection.protocol },
    rateLimit: { max: 1000 },
    empresa: {},
};
function ensureFile() {
    if (!fs_1.default.existsSync(SETTINGS_PATH)) {
        fs_1.default.mkdirSync(path_1.default.dirname(SETTINGS_PATH), { recursive: true });
        fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_FILE, null, 2), 'utf-8');
    }
}
function readFile() {
    ensureFile();
    try {
        const raw = fs_1.default.readFileSync(SETTINGS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
            horseApi: { ...DEFAULT_FILE.horseApi, ...parsed.horseApi },
            rateLimit: { ...DEFAULT_FILE.rateLimit, ...parsed.rateLimit },
            empresa: { ...parsed.empresa },
        };
    }
    catch {
        return DEFAULT_FILE;
    }
}
function writeFile(data) {
    ensureFile();
    fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
function getSettings() {
    return readFile();
}
function saveSettings(data) {
    const file = readFile();
    if (data.horseApi) {
        file.horseApi = { ...file.horseApi, ...data.horseApi };
    }
    if (data.rateLimit) {
        file.rateLimit = { ...file.rateLimit, ...data.rateLimit };
    }
    writeFile(file);
    return file;
}
function getEmpresaSettings(empresaId) {
    const file = readFile();
    const empresaKey = String(empresaId);
    return { ...exports.DEFAULT_EMPRESA, ...file.empresa[empresaKey] };
}
function saveEmpresaSettings(empresaId, data) {
    const file = readFile();
    const empresaKey = String(empresaId);
    file.empresa[empresaKey] = { ...file.empresa[empresaKey], ...data };
    writeFile(file);
    return { ...exports.DEFAULT_EMPRESA, ...file.empresa[empresaKey] };
}
function getFinanceiroEmpresa(empresaId) {
    return getEmpresaSettings(empresaId).financeiro;
}
//# sourceMappingURL=settings.js.map