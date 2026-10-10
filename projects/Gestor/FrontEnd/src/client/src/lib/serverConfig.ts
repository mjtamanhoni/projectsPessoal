const STORAGE_KEY = 'server_config';

const DEV_PROXY = import.meta.env.DEV;

export interface ServerConfig {
  host: string;
  port: number;
}

export function getServerConfig(): ServerConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ServerConfig;
  } catch {
    return null;
  }
}

export function saveServerConfig(config: ServerConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getBaseURL(): string {
  if (DEV_PROXY) return '/api';
  const cfg = getServerConfig();
  if (!cfg) return '/api';
  const protocol = cfg.port === 443 ? 'https' : 'http';
  return `${protocol}://${cfg.host}:${cfg.port}/api`;
}

export function hasServerConfig(): boolean {
  if (DEV_PROXY) return true;
  return getServerConfig() !== null;
}