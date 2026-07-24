import fs from 'fs';
import path from 'path';
import { config } from '../config';
import type { AppSettings, SettingsFile, EmpresaSettings, FinanceiroSettings } from '../types';

const SETTINGS_PATH = path.resolve(__dirname, '../../data/settings.json');

function parseBaseUrl(url: string): { protocol: string; host: string; port: number } {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80),
    };
  } catch {
    return { protocol: 'http', host: 'localhost', port: 9000 };
  }
}

const envConnection = parseBaseUrl(config.horseApi.baseUrl);

export const DEFAULT_EMPRESA: EmpresaSettings = {
  display: { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] }, number: { decimalPlaces: 4 } },
  sessionTimeout: 30,
};

const DEFAULT_FILE: SettingsFile = {
  horseApi: { host: envConnection.host, port: envConnection.port, protocol: envConnection.protocol },
  empresa: {},
};

function ensureFile(): void {
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_FILE, null, 2), 'utf-8');
  }
}

function readFile(): SettingsFile {
  ensureFile();
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      horseApi: { ...DEFAULT_FILE.horseApi, ...parsed.horseApi },
      empresa: { ...parsed.empresa },
    };
  } catch {
    return DEFAULT_FILE;
  }
}

function writeFile(data: SettingsFile): void {
  ensureFile();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getSettings(): SettingsFile {
  return readFile();
}

export function saveSettings(data: Partial<AppSettings>): SettingsFile {
  const file = readFile();
  if (data.horseApi) {
    file.horseApi = { ...file.horseApi, ...data.horseApi };
  }
  writeFile(file);
  return file;
}

export function getEmpresaSettings(empresaId: number): EmpresaSettings {
  const file = readFile();
  const empresaKey = String(empresaId);
  return { ...DEFAULT_EMPRESA, ...file.empresa[empresaKey] };
}

export function saveEmpresaSettings(empresaId: number, data: Partial<EmpresaSettings>): EmpresaSettings {
  const file = readFile();
  const empresaKey = String(empresaId);
  file.empresa[empresaKey] = { ...file.empresa[empresaKey], ...data };
  writeFile(file);
  return { ...DEFAULT_EMPRESA, ...file.empresa[empresaKey] };
}

export function getFinanceiroEmpresa(empresaId: number): FinanceiroSettings | undefined {
  return getEmpresaSettings(empresaId).financeiro;
}
