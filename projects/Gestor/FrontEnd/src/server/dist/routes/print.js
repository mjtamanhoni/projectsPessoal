"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const router = (0, express_1.Router)();
const TEMP_DIR = path.resolve(__dirname, '../../data/temp');
function ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}
// Tabela Unicode -> CP850 (usada por Epson e maioria das impressoras termicas)
// Cada char Unicode mapeia para o byte correto na codepage da impressora
const UNICODE_TO_CP850 = {
    0x00C0: 0xB7, 0x00C1: 0xB5, 0x00C2: 0xB6, 0x00C3: 0xC7, 0x00C4: 0x8E,
    0x00C5: 0x8F, 0x00C6: 0x92, 0x00C7: 0x80, 0x00C8: 0x8A, 0x00C9: 0x90,
    0x00CA: 0xD2, 0x00CB: 0xD3, 0x00CC: 0xA8, 0x00CD: 0xD5, 0x00CE: 0xD4,
    0x00CF: 0xD8, 0x00D0: 0xD1, 0x00D1: 0xA5, 0x00D2: 0x91, 0x00D3: 0xA4,
    0x00D4: 0xE2, 0x00D5: 0xE4, 0x00D6: 0x99, 0x00D8: 0x9D, 0x00D9: 0xEB,
    0x00DA: 0xE9, 0x00DB: 0xEA, 0x00DC: 0x9A, 0x00DD: 0xED, 0x00DE: 0xE1,
    0x00DF: 0xE0, 0x00E0: 0x85, 0x00E1: 0xA0, 0x00E2: 0x83, 0x00E3: 0xA6,
    0x00E4: 0x84, 0x00E5: 0x86, 0x00E6: 0x9B, 0x00E7: 0x87, 0x00E8: 0x8A,
    0x00E9: 0x82, 0x00EA: 0x88, 0x00EB: 0x89, 0x00EC: 0x8D, 0x00ED: 0xA1,
    0x00EE: 0x8C, 0x00EF: 0x8B, 0x00F0: 0x8E, 0x00F1: 0xA5, 0x00F2: 0x95,
    0x00F3: 0xA2, 0x00F4: 0x94, 0x00F5: 0xA7, 0x00F6: 0x94, 0x00F8: 0x9B,
    0x00F9: 0x97, 0x00FA: 0xA3, 0x00FB: 0x96, 0x00FC: 0x81, 0x00FD: 0xEC,
    0x00FE: 0x9F, 0x00FF: 0x98, 0x0192: 0x9F,
    0x2013: 0x1D, 0x2014: 0x1D, 0x2018: 0x60, 0x2019: 0x27, 0x201C: 0x22,
    0x201D: 0x22, 0x2026: 0x2E, 0x20AC: 0xEE,
    0x0152: 0x8C, 0x0153: 0x9C, 0x0160: 0x86, 0x0161: 0xA6,
    0x201A: 0x82, 0x201E: 0x84, 0x2020: 0x21, 0x2021: 0xF7,
    0x2022: 0xFA, 0x2030: 0x25, 0x2039: 0x8B, 0x203A: 0x9B,
    0x2122: 0x54, 0x2190: 0xAC, 0x2191: 0x5E, 0x2192: 0xAF, 0x2193: 0x5F,
};
function cp850Buffer(texto) {
    const bytes = [];
    for (const char of texto) {
        const code = char.charCodeAt(0);
        if (code < 0x80) {
            bytes.push(code);
        }
        else {
            const mapped = UNICODE_TO_CP850[code];
            bytes.push(mapped !== undefined ? mapped : code & 0xFF);
        }
    }
    return Buffer.from(bytes);
}
function buildEscPosBuffer(texto, opts) {
    const parts = [];
    parts.push(Buffer.from([0x1b, 0x40]));
    if (opts.paginaCodigo >= 0) {
        const cp = [0x1b, 0x74, opts.paginaCodigo];
        parts.push(Buffer.from(cp));
    }
    if (opts.espacoEntreLinhas > 0) {
        parts.push(Buffer.from([0x1b, 0x32, opts.espacoEntreLinhas]));
    }
    const linhas = texto.split('\n');
    const colunas = opts.colunas || 48;
    for (const linha of linhas) {
        if (linha.startsWith('</linha_dupla>')) {
            parts.push(cp850Buffer('='.repeat(colunas) + '\n'));
        }
        else if (linha.startsWith('</linha_simples>')) {
            parts.push(cp850Buffer('-'.repeat(colunas) + '\n'));
        }
        else if (linha.includes('</corte_parcial>') || linha.includes('</corte_total>')) {
            parts.push(Buffer.from('\n'));
        }
        else {
            let processada = linha;
            while (processada.includes('<negrito>') || processada.includes('</negrito>')) {
                if (processada.includes('<negrito>')) {
                    const idx = processada.indexOf('<negrito>');
                    processada = processada.slice(0, idx) + processada.slice(idx + 9);
                    parts.push(cp850Buffer(processada.slice(0, idx)));
                    parts.push(Buffer.from([0x1b, 0x45, 0x01]));
                    processada = processada.slice(idx);
                }
                if (processada.includes('</negrito>')) {
                    const idx = processada.indexOf('</negrito>');
                    parts.push(cp850Buffer(processada.slice(0, idx)));
                    parts.push(Buffer.from([0x1b, 0x45, 0x00]));
                    processada = processada.slice(idx + 10);
                }
            }
            parts.push(cp850Buffer(processada + '\n'));
        }
    }
    if (opts.espacoEntreLinhas > 0) {
        parts.push(Buffer.from([0x1b, 0x32, 0x00]));
    }
    for (let i = 0; i < opts.linhasPular; i++) {
        parts.push(Buffer.from('\n'));
    }
    if (opts.cortarPapel) {
        parts.push(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    }
    return Buffer.concat(parts);
}
function runPS(cmd, timeoutMs = 15000) {
    try {
        const raw = (0, child_process_1.execSync)(`powershell -NoProfile -NonInteractive -Command "${cmd}"`, { encoding: 'utf-8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] });
        return (raw || '').trim();
    }
    catch {
        return '';
    }
}
function parseJsonSafe(raw) {
    if (!raw || raw.length < 2)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function toArray(val) {
    if (Array.isArray(val))
        return val;
    if (val && typeof val === 'object')
        return [val];
    return [];
}
function findPrinterNameByPort(portName) {
    const raw = runPS('Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress');
    const printers = parseJsonSafe(raw);
    if (!printers)
        return null;
    const list = toArray(printers);
    for (const p of list) {
        if ((p.PortName || '').trim().toUpperCase() === portName.toUpperCase()) {
            return (p.Name || '').trim();
        }
    }
    for (const p of list) {
        const pn = (p.PortName || '').trim().toUpperCase();
        const nu = portName.toUpperCase();
        if (pn.includes(nu) || nu.includes(pn)) {
            return (p.Name || '').trim();
        }
    }
    return null;
}
function listAllPrinters() {
    const raw = runPS('Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress');
    const printers = parseJsonSafe(raw);
    if (!printers)
        return [];
    return toArray(printers).map((p) => `${(p.Name || '').trim()} [${(p.PortName || '').trim()}]`);
}
function sendToPrinter(data, porta) {
    return new Promise((resolve, reject) => {
        const upper = porta.toUpperCase().trim();
        if (upper.startsWith('TCP:')) {
            const parts = porta.replace(/^(tcp:)/i, '').split(':');
            const host = parts[0];
            const port = parseInt(parts[1] || '9100', 10);
            const client = new net.Socket();
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Timeout ao conectar na impressora TCP'));
            }, 10000);
            client.connect(port, host, () => {
                clearTimeout(timeout);
                const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
                client.write(buf, () => {
                    client.destroy();
                    resolve();
                });
            });
            client.on('error', (err) => {
                clearTimeout(timeout);
                client.destroy();
                reject(new Error(`Erro TCP: ${err.message}`));
            });
            return;
        }
        ensureTempDir();
        const arquivo = path.join(TEMP_DIR, `print_${Date.now()}.bin`);
        const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
        fs.writeFileSync(arquivo, buf);
        const printerName = findPrinterNameByPort(porta);
        console.log('[Print] Porta:', porta, '| Impressora:', printerName || '(nenhuma)');
        // --- Metodo 1: winspool.drv via .ps1 em disco (sem escaping) ---
        if (printerName) {
            const ps1File = path.join(TEMP_DIR, `print_raw_${Date.now()}.ps1`);
            const ps1Content = [
                'Add-Type -TypeDefinition @"',
                'using System;',
                'using System.Runtime.InteropServices;',
                'public class RawPrinter {',
                '  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]',
                '  public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool ClosePrinter(IntPtr hPrinter);',
                '  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]',
                '  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, IntPtr di);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool EndDocPrinter(IntPtr hPrinter);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool StartPagePrinter(IntPtr hPrinter);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool EndPagePrinter(IntPtr hPrinter);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBuf, int cbBuf, out int pcWritten);',
                '  public static void Send(string printer, string file) {',
                '    IntPtr h;',
                '    if (!OpenPrinter(printer, out h, IntPtr.Zero)) {',
                '      throw new Exception("OpenPrinter failed: " + Marshal.GetLastWin32Error());',
                '    }',
                '    try {',
                '      byte[] bytes = System.IO.File.ReadAllBytes(file);',
                '      StartDocPrinter(h, 1, IntPtr.Zero);',
                '      StartPagePrinter(h);',
                '      IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);',
                '      try {',
                '        Marshal.Copy(bytes, 0, p, bytes.Length);',
                '        int written;',
                '        if (!WritePrinter(h, p, bytes.Length, out written)) {',
                '          throw new Exception("WritePrinter failed: " + Marshal.GetLastWin32Error());',
                '        }',
                '        Console.WriteLine("OK:" + written + " bytes");',
                '      } finally {',
                '        Marshal.FreeCoTaskMem(p);',
                '      }',
                '      EndPagePrinter(h);',
                '      EndDocPrinter(h);',
                '    } finally {',
                '      ClosePrinter(h);',
                '    }',
                '  }',
                '}',
                '"@',
                '[RawPrinter]::Send($args[0], $args[1])',
            ].join('\r\n');
            fs.writeFileSync(ps1File, ps1Content, 'utf-8');
            try {
                const result = (0, child_process_1.execSync)('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ps1File + '" "' + printerName.replace(/"/g, '""') + '" "' + arquivo.replace(/\\/g, '\\\\') + '"', { timeout: 15000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
                console.log('[Print] RawPrinter resultado:', result.trim());
                try {
                    fs.unlinkSync(ps1File);
                }
                catch { }
                cleanup(arquivo);
                resolve();
                return;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.log('[Print] RawPrinter falhou:', msg);
                try {
                    fs.unlinkSync(ps1File);
                }
                catch { }
                // continuamos para o proximo metodo
            }
        }
        // --- Metodo 2: print /D (pode funcionar em algumas impressoras) ---
        if (printerName) {
            try {
                (0, child_process_1.execSync)('print /D:"' + printerName + '" "' + arquivo + '"', { timeout: 10000, stdio: 'pipe' });
                console.log('[Print] print /D executou (verificar se imprimiu)');
                cleanup(arquivo);
                resolve();
                return;
            }
            catch (err) {
                console.log('[Print] print /D falhou:', err instanceof Error ? err.message : String(err));
            }
        }
        // --- Metodo 3: PowerShell Out-Printer (envia como texto) ---
        if (printerName) {
            try {
                const textContent = buf.toString('utf-8');
                const escaped = textContent.replace(/"/g, '""');
                (0, child_process_1.execSync)('powershell -NoProfile -NonInteractive -Command "' + escaped + ' | Out-Printer -Name \\"' + printerName.replace(/"/g, '""') + '\\""', { timeout: 15000, stdio: 'pipe' });
                console.log('[Print] Out-Printer executou');
                cleanup(arquivo);
                resolve();
                return;
            }
            catch (err) {
                console.log('[Print] Out-Printer falhou:', err instanceof Error ? err.message : String(err));
            }
        }
        try {
            fs.unlinkSync(arquivo);
        }
        catch { }
        const allP = listAllPrinters();
        const printerList = allP.length > 0
            ? '\n\nImpressoras no Windows:\n  ' + allP.join('\n  ')
            : '\n\nNenhuma impressora encontrada no Get-Printer.';
        const finalMsg = printerName
            ? 'Impressora "' + printerName + '" na porta "' + porta + '". Nenhum metodo funcionou.'
            : 'Nenhuma impressora encontrada para a porta "' + porta + '".';
        reject(new Error(finalMsg + printerList));
    });
}
function cleanup(arquivo) {
    try {
        fs.unlinkSync(arquivo);
    }
    catch { }
}
router.get('/ports', async (_req, res) => {
    const ports = [];
    if (process.platform !== 'win32') {
        try {
            const result = (0, child_process_1.execSync)('ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true', { encoding: 'utf-8', timeout: 5000 });
            for (const line of result.split('\n')) {
                if (line.trim())
                    ports.push({ nome: line.trim(), porta: line.trim(), tipo: 'USB' });
            }
        }
        catch { }
        res.json(ports);
        return;
    }
    const seen = new Set();
    const add = (nome, porta, tipo) => {
        const k = porta.toUpperCase();
        if (!seen.has(k) && porta) {
            seen.add(k);
            ports.push({ nome: nome || porta, porta, tipo });
        }
    };
    const tipo = (p) => {
        const u = p.toUpperCase();
        if (u.startsWith('COM'))
            return 'Serial';
        if (u.startsWith('USB'))
            return 'USB';
        if (u.startsWith('LPT'))
            return 'Paralela';
        if (u.startsWith('TCP'))
            return 'Rede';
        return 'Outra';
    };
    const raw = runPS('Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress');
    const list = parseJsonSafe(raw);
    if (list) {
        for (const p of toArray(list)) {
            const pn = (p.PortName || '').trim();
            const nm = (p.Name || '').trim();
            if (pn)
                add(nm, pn, tipo(pn));
        }
    }
    const raw2 = runPS('Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Caption | ConvertTo-Json -Compress');
    const serials = parseJsonSafe(raw2);
    if (serials) {
        for (const s of toArray(serials)) {
            const id = (s.DeviceID || '').trim();
            const cap = (s.Caption || '').trim();
            if (id)
                add(cap || id, id, 'Serial');
        }
    }
    const raw3 = runPS('Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match "COM" } | Select-Object Name, DeviceID | ConvertTo-Json -Compress');
    const devs = parseJsonSafe(raw3);
    if (devs) {
        for (const d of toArray(devs)) {
            const m = (d.DeviceID || '').match(/(COM\d+)/i);
            if (m)
                add((d.Name || '').trim() || m[1], m[1], 'Serial');
        }
    }
    try {
        const reg = (0, child_process_1.execSync)('reg query "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM" 2>nul', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
        for (const line of (reg || '').split('\n')) {
            const m = line.match(/COM(\d+)/);
            if (m)
                add(`COM${m[1]}`, `COM${m[1]}`, 'Serial');
        }
    }
    catch { }
    try {
        const mode = (0, child_process_1.execSync)('mode', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
        for (const m of (mode || '').matchAll(/COM\d+/g))
            add(m[0], m[0], 'Serial');
    }
    catch { }
    res.json(ports);
});
router.get('/ports/debug', async (_req, res) => {
    const debug = { plataforma: process.platform };
    if (process.platform !== 'win32') {
        res.json(debug);
        return;
    }
    debug.getPrinter = runPS('Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress');
    debug.serialPort = runPS('Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Caption | ConvertTo-Json -Compress');
    debug.pnpCom = runPS('Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match "COM" } | Select-Object Name, DeviceID | ConvertTo-Json -Compress');
    try {
        debug.registry = (0, child_process_1.execSync)('reg query "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM" 2>nul', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    }
    catch {
        debug.registry = '(vazio)';
    }
    res.json(debug);
});
router.get('/diag/:porta', async (req, res) => {
    const porta = req.params.porta;
    const printerName = findPrinterNameByPort(porta);
    const resultado = { porta, printerName };
    if (!printerName) {
        resultado.erro = 'Nenhuma impressora encontrada para a porta ' + porta;
        res.json(resultado);
        return;
    }
    ensureTempDir();
    const arquivo = path.join(TEMP_DIR, 'diag_test.bin');
    fs.writeFileSync(arquivo, Buffer.from('TESTE DE IMPRESSAO\n'));
    const ps1File = path.join(TEMP_DIR, 'diag_raw.ps1');
    const ps1Content = [
        'Add-Type -TypeDefinition @"',
        'using System;',
        'using System.Runtime.InteropServices;',
        'public class RawDiag {',
        '  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]',
        '  public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool ClosePrinter(IntPtr hPrinter);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, IntPtr di);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool EndDocPrinter(IntPtr hPrinter);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool StartPagePrinter(IntPtr hPrinter);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool EndPagePrinter(IntPtr hPrinter);',
        '  [DllImport("winspool.drv", SetLastError=true)]',
        '  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBuf, int cbBuf, out int pcWritten);',
        '  public static string Send(string printer, string file) {',
        '    try {',
        '      IntPtr h;',
        '      if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "OpenPrinter FALHOU: " + Marshal.GetLastWin32Error();',
        '      try {',
        '        byte[] bytes = System.IO.File.ReadAllBytes(file);',
        '        StartDocPrinter(h, 1, IntPtr.Zero);',
        '        StartPagePrinter(h);',
        '        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);',
        '        try {',
        '          Marshal.Copy(bytes, 0, p, bytes.Length);',
        '          int written;',
        '          bool ok = WritePrinter(h, p, bytes.Length, out written);',
        '          if (!ok) return "WritePrinter FALHOU: " + Marshal.GetLastWin32Error();',
        '          return "OK:" + written + " bytes escritos";',
        '        } finally { Marshal.FreeCoTaskMem(p); }',
        '      } finally { ClosePrinter(h); }',
        '    } catch (Exception ex) { return "ERRO: " + ex.Message; }',
        '  }',
        '}',
        '"@',
        '$resultado = [RawDiag]::Send($args[0], $args[1])',
        'Write-Output $resultado',
    ].join('\r\n');
    fs.writeFileSync(ps1File, ps1Content, 'utf-8');
    try {
        const result = (0, child_process_1.execSync)('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ps1File + '" "' + printerName.replace(/"/g, '""') + '" "' + arquivo.replace(/\\/g, '\\\\') + '"', { timeout: 15000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        resultado.rawPrinter = result.trim();
    }
    catch (err) {
        resultado.rawPrinterErro = err instanceof Error ? err.message : String(err);
    }
    try {
        fs.unlinkSync(ps1File);
    }
    catch { }
    try {
        fs.unlinkSync(arquivo);
    }
    catch { }
    res.json(resultado);
});
router.post('/test', auth_1.authMiddleware, async (req, res) => {
    const { porta, modelo, deviceParams, colunas } = req.body;
    const textoTeste = [
        '*** TESTE DE IMPRESSAO TERMICA ***',
        '',
        'Impressora configurada com sucesso!',
        '',
        `Porta: ${porta || 'auto'}`,
        `Colunas: ${colunas || 48}`,
        '',
        `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
        '',
        'Sistema Gestor',
        '',
        '-----------------------------------',
        '(c) 2026 - 56.134.688 MARCOS JOSE TAMANHONI',
        'CNPJ: 56.134.688/0001-57 | ME',
        'Data de abertura: 29/07/2024',
        'Celular/WhatsApp: (27) 9 8833-7323',
        'E-mail: mjtamanhoni@gmail.com',
        '', '',
    ].join('\n');
    const buffer = buildEscPosBuffer(textoTeste, {
        colunas: colunas || 48,
        cortarPapel: true,
        espacoEntreLinhas: 0,
        linhasPular: 0,
        paginaCodigo: 10,
    });
    const now = Date.now();
    const activeAgents = Array.from(agents.values()).filter(a => now - a.lastSeen < 15000);
    if (activeAgents.length > 0) {
        const id = 'job-' + (++jobCounter);
        const agent = activeAgents[0];
        const job = { id, data: buffer.toString('base64'), printer: agent.selectedPrinter, status: 'pending', createdAt: now };
        jobQueue.push(job);
        console.log('[Print] Teste enviado ao agent:', agent.agentId, '| Job:', id);
        res.json({ success: true, message: 'Teste enviado ao Print Agent (' + (agent.selectedPrinter || 'auto') + ')', jobId: id, via: 'agent' });
        return;
    }
    if (!porta) {
        res.status(400).json({ error: 'Nenhum Print Agent conectado e porta nao configurada. Rode "node agent.js" no PC local.' });
        return;
    }
    try {
        await sendToPrinter(buffer, porta);
        const printerName = findPrinterNameByPort(porta);
        res.json({ success: true, message: 'Teste enviado com sucesso (local)', porta, impressora: printerName || 'nao encontrada', via: 'local' });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao testar impressora';
        console.error('[Print] Teste erro:', msg);
        res.status(500).json({
            error: msg + '\n\nDica: Rode "node agent.js" no PC local para imprimir via USB.',
            porta,
        });
    }
});
router.post('/cupom', auth_1.authMiddleware, async (req, res) => {
    const { texto, porta, colunas, cortarPapel, espacoEntreLinhas, linhasBuffer, linhasPular, paginaCodigo, pixPayload, } = req.body;
    if (!texto) {
        res.status(400).json({ error: 'Texto do cupom nao informado' });
        return;
    }
    try {
        let textoFinal = texto;
        // Se tem PIX, adicionar o codigo "copia e cola" no texto do cupom
        if (pixPayload) {
            const pixLinhas = [
                '================================',
                '        PAGUE COM PIX',
                '================================',
                'Copie o codigo abaixo e cole',
                'no seu aplicativo bancario:',
                '',
                pixPayload,
                '',
                '================================',
            ];
            textoFinal = texto + '\n' + pixLinhas.join('\n');
        }
        const textBuffer = buildEscPosBuffer(textoFinal, {
            colunas: colunas || 48,
            cortarPapel: false,
            espacoEntreLinhas: espacoEntreLinhas || 0,
            linhasPular: linhasPular || 0,
            paginaCodigo: paginaCodigo ?? 10,
        });
        const now = Date.now();
        const activeAgents = Array.from(agents.values()).filter(a => now - a.lastSeen < 15000);
        if (activeAgents.length > 0) {
            const cutBuffer = Buffer.from([0x1d, 0x56, 0x42, 0x00]);
            const buffer = Buffer.concat([textBuffer, cutBuffer]);
            const id = 'job-' + (++jobCounter);
            const agent = activeAgents[0];
            const job = {
                id,
                data: buffer.toString('base64'),
                printer: agent.selectedPrinter,
                pixPayload: pixPayload || undefined,
                status: 'pending',
                createdAt: now,
            };
            jobQueue.push(job);
            console.log('[Print] Cupom enviado ao agent:', agent.agentId, '| Job:', id);
            res.json({ success: true, message: 'Cupom enviado ao Print Agent', jobId: id, via: 'agent' });
            return;
        }
        if (!porta) {
            res.status(400).json({ error: 'Nenhum Print Agent conectado e porta nao configurada.' });
            return;
        }
        const cutBuffer = Buffer.from([0x1d, 0x56, 0x42, 0x00]);
        const localBuffer = Buffer.concat([textBuffer, cutBuffer]);
        await sendToPrinter(localBuffer, porta);
        res.json({ success: true, message: 'Cupom enviado para impressao (local)', via: 'local' });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao imprimir';
        console.error('[Print] Cupom erro:', msg);
        res.status(500).json({ error: msg });
    }
});
const agents = new Map();
const jobQueue = [];
let jobCounter = 0;
router.post('/agent/register', (req, res) => {
    const { agentId, printers, selectedPrinter } = req.body;
    if (!agentId) {
        res.status(400).json({ error: 'agentId obrigatorio' });
        return;
    }
    agents.set(agentId, { agentId, printers: printers || [], selectedPrinter: selectedPrinter || null, lastSeen: Date.now() });
    console.log('[Print] Agent registrado:', agentId, '| Impressoras:', (printers || []).map((p) => p.name).join(', '));
    res.json({ ok: true, agentCount: agents.size });
});
router.get('/agent/poll', (req, res) => {
    const { agentId } = req.query;
    if (!agentId) {
        res.status(400).json({ error: 'agentId obrigatorio' });
        return;
    }
    const agent = agents.get(agentId);
    if (agent)
        agent.lastSeen = Date.now();
    // Enviar mudanca de impressora se pendente
    if (agent && agent.pendingPrinterChange) {
        const printerChange = agent.pendingPrinterChange;
        agent.pendingPrinterChange = null;
        agent.selectedPrinter = printerChange;
        const pending = jobQueue.find(j => j.status === 'pending');
        if (pending) {
            pending.status = 'sent';
            res.json({ setPrinter: printerChange, job: { id: pending.id, data: pending.data, printer: printerChange, pixPayload: pending.pixPayload || null } });
        }
        else {
            res.json({ setPrinter: printerChange, job: null });
        }
        return;
    }
    const pending = jobQueue.find(j => j.status === 'pending');
    if (pending) {
        pending.status = 'sent';
        console.log('[Print] Enviando job #' + pending.id, '(', pending.data.length, 'bytes base64)');
        res.json({ job: { id: pending.id, data: pending.data, printer: pending.printer || agent?.selectedPrinter, pixPayload: pending.pixPayload || null } });
    }
    else {
        res.json({ job: null });
    }
});
router.post('/agent/result', (req, res) => {
    const { jobId, ok, error, result } = req.body;
    const job = jobQueue.find(j => j.id === jobId);
    if (job) {
        job.status = ok ? 'done' : 'error';
        job.result = result;
        job.error = error;
        console.log('[Print] Job #' + jobId, ok ? 'CONCLUIDO' : 'FALHOU', error || result || '');
    }
    res.json({ ok: true });
});
router.get('/agent/download', (_req, res) => {
    const candidatePaths = [
        path.resolve(__dirname, '../../../../print-agent/agent.js'),
        path.resolve(__dirname, '../../../print-agent/agent.js'),
        path.resolve(__dirname, '../../print-agent/agent.js'),
        path.resolve(process.cwd(), 'print-agent/agent.js'),
        path.resolve(process.cwd(), 'FrontEnd/print-agent/agent.js'),
    ];
    const agentPath = candidatePaths.find(p => { try {
        return fs.existsSync(p);
    }
    catch {
        return false;
    } });
    if (!agentPath) {
        res.status(404).json({ error: 'agent.js nao encontrado', tentativas: candidatePaths });
        return;
    }
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', 'attachment; filename="agent.js"');
    fs.createReadStream(agentPath).pipe(res);
});
router.get('/agent/download/package', (_req, res) => {
    const candidatePaths = [
        path.resolve(__dirname, '../../../../print-agent/package.json'),
        path.resolve(__dirname, '../../../print-agent/package.json'),
        path.resolve(__dirname, '../../print-agent/package.json'),
        path.resolve(process.cwd(), 'print-agent/package.json'),
        path.resolve(process.cwd(), 'FrontEnd/print-agent/package.json'),
    ];
    const pkgPath = candidatePaths.find(p => { try {
        return fs.existsSync(p);
    }
    catch {
        return false;
    } });
    if (!pkgPath) {
        res.status(404).json({ error: 'package.json nao encontrado' });
        return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="package.json"');
    fs.createReadStream(pkgPath).pipe(res);
});
router.get('/agent/install', (_req, res) => {
    const bffUrl = _req.query.url || `${_req.protocol}://${_req.get('host')}`;
    const bat = [
        '@echo off',
        'title Gestor Print Agent',
        'echo.',
        'echo ========================================',
        'echo  Gestor - Instalando Print Agent',
        'echo ========================================',
        'echo.',
        'echo  Suporta QUALQUER impressora termica USB:',
        'echo  Epson, Star, Bixolon, Citizen, Xprinter, Elgin, etc.',
        'echo.',
        'echo Criando pasta C:\\print-agent...',
        'mkdir "C:\\print-agent" 2>nul',
        'echo.',
        'echo Baixando agent.js do servidor...',
        'powershell -NoProfile -Command "Invoke-WebRequest -Uri \'' + bffUrl + '/api/print/agent/download\' -OutFile \'C:\\print-agent\\agent.js\'"',
        'if %errorlevel% neq 0 (',
        '    echo [ERRO] Falha ao baixar agent.js',
        '    echo Verifique se o servidor esta acessivel: ' + bffUrl,
        '    pause',
        '    exit /b 1',
        ')',
        'echo Baixando package.json...',
        'powershell -NoProfile -Command "Invoke-WebRequest -Uri \'' + bffUrl + '/api/print/agent/download/package\' -OutFile \'C:\\print-agent\\package.json\'"',
        'echo.',
        'echo Instalando dependencias npm...',
        'cd /d "C:\\print-agent"',
        'call npm install --production',
        'if %errorlevel% neq 0 (',
        '    echo [AVISO] Falha ao instalar dependencias npm.',
        '    echo O agent funcionara apenas com spooler.',
        '    echo Para impressao USB direta, instale as dependencias manualmente:',
        '    echo   cd C:\\print-agent',
        '    echo   npm install --production',
        ')',
        'echo.',
        'echo Verificando drivers USB...',
        'powershell -NoProfile -Command "$d = Get-PnpDevice -Class USB -Status OK 2>$null; if ($d) { Write-Output ($d.Count.ToString() + \' device(s) USB detectado(s)\') } else { Write-Output \'Nenhum device USB detectado - execute setup-winusb.bat\' }"',
        'echo.',
        'echo agent.js baixado com sucesso!',
        'echo.',
        'echo ========================================',
        'echo  Iniciando Print Agent...',
        'echo  Nao feche esta janela!',
        'echo  Para parar, pressione Ctrl+C',
        'echo ========================================',
        'echo.',
        'node "C:\\print-agent\\agent.js" ' + bffUrl,
        'pause',
    ].join('\r\n');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="instalar-agent.bat"');
    res.send(bat);
});
router.get('/agent/install/powershell', (_req, res) => {
    const bffUrl = _req.query.url || `${_req.protocol}://${_req.get('host')}`;
    const ps = [
        '# Gestor Print Agent - Instalacao automatica',
        '# Copie e cole este comando no PowerShell (como Administrador)',
        '',
        '$ErrorActionPreference = "Stop"',
        '$agentDir = "C:\\print-agent"',
        '$bffUrl = "' + bffUrl + '"',
        '',
        'Write-Host "========================================" -ForegroundColor Cyan',
        'Write-Host " Gestor - Instalando Print Agent" -ForegroundColor Cyan',
        'Write-Host "========================================" -ForegroundColor Cyan',
        'Write-Host ""',
        '',
        '# Criar diretorio',
        'if (!(Test-Path $agentDir)) {',
        '    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null',
        '    Write-Host "[OK] Diretorio criado: $agentDir" -ForegroundColor Green',
        '} else {',
        '    Write-Host "[OK] Diretorio ja existe: $agentDir" -ForegroundColor Green',
        '}',
        '',
        '# Baixar agent.js',
        'Write-Host "Baixando agent.js..." -ForegroundColor Yellow',
        'try {',
        '    Invoke-WebRequest -Uri "$bffUrl/api/print/agent/download" -OutFile "$agentDir\\agent.js" -UseBasicParsing',
        '    Write-Host "[OK] agent.js baixado" -ForegroundColor Green',
        '} catch {',
        '    Write-Host "[ERRO] Falha ao baixar agent.js: $_" -ForegroundColor Red',
        '    Write-Host "Verifique se o servidor esta acessivel: $bffUrl" -ForegroundColor Yellow',
        '    exit 1',
        '}',
        '',
        '# Baixar package.json',
        'Write-Host "Baixando package.json..." -ForegroundColor Yellow',
        'try {',
        '    Invoke-WebRequest -Uri "$bffUrl/api/print/agent/download/package" -OutFile "$agentDir\\package.json" -UseBasicParsing',
        '    Write-Host "[OK] package.json baixado" -ForegroundColor Green',
        '} catch {',
        '    Write-Host "[AVISO] Falha ao baixar package.json" -ForegroundColor Yellow',
        '}',
        '',
        '# Instalar dependencias npm',
        'Write-Host "Instalando dependencias npm..." -ForegroundColor Yellow',
        'Push-Location $agentDir',
        'try {',
        '    npm install --production 2>&1 | Out-Null',
        '    Write-Host "[OK] Dependencias npm instaladas" -ForegroundColor Green',
        '} catch {',
        '    Write-Host "[AVISO] Falha ao instalar dependencias npm" -ForegroundColor Yellow',
        '    Write-Host "O agent funcionara apenas com spooler" -ForegroundColor Yellow',
        '}',
        'Pop-Location',
        '',
        '# Verificar drivers USB',
        'Write-Host ""',
        'Write-Host "Verificando drivers USB..." -ForegroundColor Yellow',
        '$usbDevices = Get-PnpDevice -Class USB -Status OK -ErrorAction SilentlyContinue',
        'if ($usbDevices) {',
        '    Write-Host ("[OK] " + $usbDevices.Count + " device(s) USB detectado(s)") -ForegroundColor Green',
        '} else {',
        '    Write-Host "[AVISO] Nenhum device USB detectado" -ForegroundColor Yellow',
        '    Write-Host "Para USB direto, execute setup-winusb.bat como Administrador" -ForegroundColor Yellow',
        '}',
        '',
        '# Iniciar agent',
        'Write-Host ""',
        'Write-Host "========================================" -ForegroundColor Cyan',
        'Write-Host " Iniciando Print Agent..." -ForegroundColor Cyan',
        'Write-Host " Nao feche esta janela!" -ForegroundColor Red',
        'Write-Host " Para parar, pressione Ctrl+C" -ForegroundColor Yellow',
        'Write-Host "========================================" -ForegroundColor Cyan',
        'Write-Host ""',
        '',
        'Set-Location $agentDir',
        'node "agent.js" $bffUrl',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="instalar-agent.ps1"');
    res.send(ps);
});
router.get('/agent/status', (_req, res) => {
    const now = Date.now();
    const active = Array.from(agents.values()).filter(a => now - a.lastSeen < 15000);
    res.json({
        agents: active.map(a => ({ id: a.agentId, printers: a.printers, selectedPrinter: a.selectedPrinter, lastSeen: a.lastSeen })),
        pendingJobs: jobQueue.filter(j => j.status === 'pending').length,
        recentJobs: jobQueue.slice(-10).map(j => ({ id: j.id, status: j.status, error: j.error, createdAt: j.createdAt })),
    });
});
router.post('/agent/set-printer', auth_1.authMiddleware, (req, res) => {
    const { agentId, printerName } = req.body;
    if (!agentId || !printerName) {
        res.status(400).json({ error: 'agentId e printerName obrigatorios' });
        return;
    }
    const agent = agents.get(agentId);
    if (!agent) {
        res.status(404).json({ error: 'Agent nao encontrado' });
        return;
    }
    agent.pendingPrinterChange = printerName;
    console.log('[Print] Impressora do agent', agentId, 'sera alterada para:', printerName);
    res.json({ ok: true, selectedPrinter: printerName });
});
router.post('/queue', auth_1.authMiddleware, async (req, res) => {
    const { data, printer } = req.body;
    if (!data) {
        res.status(400).json({ error: 'data obrigatorio (base64 ESC/POS)' });
        return;
    }
    const active = Array.from(agents.values()).filter(a => Date.now() - a.lastSeen < 15000);
    if (active.length === 0) {
        res.status(503).json({ error: 'Nenhum Print Agent conectado. Rode "node agent.js" no PC local.' });
        return;
    }
    const id = 'job-' + (++jobCounter);
    const job = { id, data, printer: printer || null, status: 'pending', createdAt: Date.now() };
    jobQueue.push(job);
    if (jobQueue.length > 100)
        jobQueue.splice(0, jobQueue.length - 100);
    console.log('[Print] Job enfileirado:', id);
    res.json({ ok: true, jobId: id });
});
exports.default = router;
//# sourceMappingURL=print.js.map