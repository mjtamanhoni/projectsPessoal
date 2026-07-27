import type { AppSettings, SettingsFile, EmpresaSettings, FinanceiroSettings } from '../types';
export declare const DEFAULT_EMPRESA: EmpresaSettings;
export declare function getSettings(): SettingsFile;
export declare function saveSettings(data: Partial<AppSettings>): SettingsFile;
export declare function getEmpresaSettings(empresaId: number): EmpresaSettings;
export declare function saveEmpresaSettings(empresaId: number, data: Partial<EmpresaSettings>): EmpresaSettings;
export declare function getFinanceiroEmpresa(empresaId: number): FinanceiroSettings | undefined;
//# sourceMappingURL=settings.d.ts.map